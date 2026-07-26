/**
 * API endpoint pour initialiser un paiement de don via Bictorys
 */
// Plafond de don anti-abus (XOF). Un montant hors bornes est rejeté avant tout appel Bictorys.
const MIN_DONATION_XOF = 100;
const MAX_DONATION_XOF = 10_000_000;

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();

    // Anti-abus : limite le nombre de créations de charge par IP.
    checkRateLimit(event, { maxRequests: 10, windowMs: 60_000 });

    const body = await readBody(event);

    // Validation des données
    const { amount, email, name, phone } = body;

    if (!amount || amount <= 0) {
      throw createError({
        statusCode: 400,
        message: 'Le montant du don doit être supérieur à 0',
      });
    }

    if (amount < MIN_DONATION_XOF || amount > MAX_DONATION_XOF) {
      throw createError({
        statusCode: 400,
        message: `Le montant doit être compris entre ${MIN_DONATION_XOF} et ${MAX_DONATION_XOF} FCFA`,
      });
    }

    if (!email || !name) {
      throw createError({
        statusCode: 400,
        message: 'Email et nom sont requis',
      });
    }

    if (!isValidEmail(email)) {
      throw createError({
        statusCode: 400,
        message: 'Adresse email invalide',
      });
    }

    // Générer des références uniques pour ce paiement
    const paymentReference = `VPSN-DON-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const merchantReference = crypto.randomUUID();

    // URLs de retour vers nos propres pages de callback.
    const siteUrl = config.public.siteUrl || 'https://www.vie-publique.sn';
    const successRedirectUrl = `${siteUrl}/don/success?gateway=bictorys`;
    const errorRedirectUrl = `${siteUrl}/don/cancel?gateway=bictorys`;

    const bictorysPayload = {
      amount: Math.round(amount),
      currency: 'XOF',
      paymentReference,
      merchantReference,
      successRedirectUrl: successRedirectUrl,
      errorRedirectUrl: errorRedirectUrl,
      customerObject: {
        name,
        email,
        phone: phone || '',
        city: 'Dakar',
        country: 'SN',
        locale: 'fr-FR',
      },
    };

    // Appeler l'API Bictorys pour initialiser le paiement
    const response: any = await $fetch(`${config.bictorysApiUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': config.bictorysApiKey,
      },
      body: bictorysPayload,
    });

    // Retourner l'URL de paiement et les détails de la transaction
    // Bictorys retourne: { type, link, chargeId, opToken }
    return {
      success: true,
      data: {
        payment_url: response.link || response.paymentUrl || response.data?.paymentUrl,
        transaction_id: response.chargeId || response.transactionId || response.data?.transactionId,
        op_token: response.opToken,
        payment_reference: paymentReference,
        merchant_reference: merchantReference,
        amount,
        currency: 'XOF',
      },
    };
  } catch (error: any) {
    // Erreurs de validation ci-dessus (400) : messages destinés à l'utilisateur, on les relaie
    if (error.statusCode === 400) {
      throw error;
    }

    // Échec Bictorys ou autre : détails en logs + Sentry, message générique au client (SEC-9)
    reportServerError(error, 'api/donate/init-payment', {
      statusCode: error.statusCode || error.status,
      data: error.data,
    });
    throw createError({
      statusCode: 500,
      message: "Erreur lors de l'initialisation du paiement",
    });
  }
});
