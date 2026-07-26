/**
 * Webhook endpoint pour recevoir les notifications de paiement de Bictorys
 * Ce endpoint sera appelé par Bictorys lorsqu'un paiement est complété
 */

import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Bictorys authentifie ses webhooks par un secret partagé transmis dans l'en-tête
 * `X-Secret-Key` (PAS de HMAC : cf. docs Bictorys « Comment valider les webhooks »).
 * On compare la valeur reçue au secret configuré, en temps constant. Les deux valeurs
 * sont hachées d'abord pour obtenir des buffers de longueur fixe (timingSafeEqual exige
 * une longueur identique) sans fuiter la longueur du secret.
 */
function isValidWebhookSecret(provided: string, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Authentification du webhook — AVANT le try/catch qui neutralise les erreurs en 200 :
  // une requête forgée doit être rejetée en 401, pas avalée en réponse de succès.
  const providedSecret = getHeader(event, 'x-secret-key') || '';
  if (!isValidWebhookSecret(providedSecret, config.bictorysWebhookSecret)) {
    if (!config.bictorysWebhookSecret) {
      // Mauvaise config serveur : on ferme la porte ET on la rend visible en monitoring.
      reportServerError(
        new Error('BICTORYS_WEBHOOK_SECRET manquant : tous les webhooks Bictorys sont rejetés'),
        'api/donate/webhook',
      );
    }
    // SEC-9 : message générique, aucun détail interne dans la réponse HTTP.
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  try {
    const body = await readBody(event);

    // Logger l'événement pour debug. La requête est authentifiée (secret vérifié
    // ci-dessus), donc ces champs proviennent de Bictorys, pas d'un tiers arbitraire.
    console.log('Webhook Bictorys reçu:', {
      event_type: body.event || body.type,
      transaction_id: body.data?.reference || body.reference,
      status: body.data?.status || body.status,
      timestamp: new Date().toISOString(),
    });

    // Traiter différents types d'événements
    const eventType = body.event || body.type;
    const transactionData = body.data || body;

    switch (eventType) {
      case 'charge.success':
      case 'payment.success':
        // Paiement réussi
        await handleSuccessfulPayment(transactionData);
        break;

      case 'charge.failed':
      case 'payment.failed':
        // Paiement échoué
        await handleFailedPayment(transactionData);
        break;

      case 'charge.pending':
      case 'payment.pending':
        // Paiement en attente
        await handlePendingPayment(transactionData);
        break;

      default:
        console.warn(`Type d'événement non géré: ${eventType}`);
    }

    // Retourner une réponse 200 pour confirmer la réception du webhook
    return {
      success: true,
      message: 'Webhook traité avec succès',
    };
  } catch (error: any) {
    reportServerError(error, 'api/donate/webhook');

    // Même en cas d'erreur, retourner 200 pour éviter que Bictorys ne retente.
    // SEC-9 : message générique (les détails sont dans les logs + Sentry)
    return {
      success: false,
      message: 'Erreur lors du traitement du webhook',
    };
  }
});

/**
 * Gérer un paiement réussi
 */
async function handleSuccessfulPayment(data: any) {
  // Validation du contenu du payload (doc Bictorys : vérifier montant, devise,
  // statut, référence). Même authentifié, un événement incohérent ne doit pas
  // déclencher un e-mail « Don reçu » erroné.
  const amount = Number(data.amount);
  const currency = data.currency;
  const status = data.status;
  const reference = data.reference || data.transaction_id;

  if (!reference || !Number.isFinite(amount) || amount <= 0) {
    reportServerError(
      new Error('Webhook charge.success au payload incohérent (référence/montant invalide)'),
      'api/donate/webhook/validate',
      { reference, amount: data.amount },
    );
    return;
  }
  if (currency && currency !== 'XOF') {
    reportServerError(
      new Error(`Webhook charge.success avec devise inattendue: ${currency}`),
      'api/donate/webhook/validate',
      { reference },
    );
    return;
  }
  if (
    status &&
    !['success', 'succeeded', 'paid', 'completed'].includes(String(status).toLowerCase())
  ) {
    reportServerError(
      new Error(`Webhook charge.success avec statut incohérent: ${status}`),
      'api/donate/webhook/validate',
      { reference },
    );
    return;
  }

  console.log('💰 Paiement réussi:', {
    reference,
    amount,
    email: data.customer?.email,
  });

  // NOTE : la persistance du don (table Directus, stats, reçu fiscal) n'est pas
  // encore implémentée — voir docs/modules/dons/donation-system.md.

  // Envoyer un email de remerciement au donateur. sendDonationConfirmationEmail
  // renvoie false (sans throw) sur échec « attendu » (adresse invalide, erreur
  // Resend) et a déjà reporté la cause précise via reportServerError ; on ne
  // logge donc un succès QUE si l'envoi a réellement eu lieu.
  try {
    const sent = await sendDonationConfirmationEmail({
      gateway: 'bictorys',
      transaction_id: data.reference || data.transaction_id,
      amount: data.amount,
      donor_name: data.customer?.name || data.customerObject?.name || 'Donateur',
      donor_email: data.customer?.email || data.customerObject?.email,
      donor_phone: data.customer?.phone || data.customerObject?.phone,
      invoice_ref: data.merchantReference || data.reference,
      created_at: new Date().toISOString(),
    });
    if (sent) {
      console.log('✉️ Email de confirmation envoyé avec succès');
    } else {
      console.warn('Email de confirmation non envoyé (cause détaillée en monitoring)');
    }
  } catch (emailError) {
    // Erreur inattendue (le chemin normal renvoie false, pas un throw) :
    // ne pas faire échouer le webhook, mais le signaler en monitoring.
    reportServerError(emailError, 'api/donate/webhook/email', {
      reference: data.reference || data.transaction_id,
    });
  }
}

/**
 * Gérer un paiement échoué
 */
async function handleFailedPayment(data: any) {
  console.log('❌ Paiement échoué:', {
    reference: data.reference,
    reason: data.failure_reason || data.error_message,
  });

  // TODO: Logger l'échec pour analyse
}

/**
 * Gérer un paiement en attente
 */
async function handlePendingPayment(data: any) {
  console.log('⏳ Paiement en attente:', {
    reference: data.reference,
  });

  // TODO: Mettre à jour le statut si nécessaire
}
