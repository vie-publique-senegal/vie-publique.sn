/**
 * E-mails transactionnels via l'API Resend.
 *
 * Remplace l'ancien envoi SMTP (nodemailer) : Resend est le fournisseur
 * transactionnel du projet (domaine vérifié → SPF/DKIM corrects, meilleure
 * délivrabilité + observabilité). La newsletter marketing reste sur Brevo,
 * c'est un canal distinct.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Charte e-mail Vie-Publique (alignée sur le template newsletter).
const BRAND = {
  logo: 'https://www.vie-publique.sn/logos/logo-transparent-carre.png',
  site: 'https://www.vie-publique.sn',
  navy: '#0C2146',
  navySoft: '#24344d',
  gold: '#F4D160',
  cream: '#F7F5EF',
  creamBorder: '#EFE8D6',
  gray: '#576174',
  grayLight: '#6b7280',
  white: '#ffffff',
} as const;

/**
 * Envoyer un e-mail via l'API Resend. Renvoie true si l'envoi a réussi,
 * false sinon (l'appelant décide de la dégradation ; jamais de throw ici).
 */
async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  const config = useRuntimeConfig();

  if (!config.resendApiKey || !config.resendFromEmail) {
    reportServerError(
      new Error('RESEND_API_KEY / RESEND_FROM_EMAIL manquant : e-mail non envoyé'),
      'utils/email',
    );
    return false;
  }

  try {
    await $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        from: `Vie Publique Sénégal <${config.resendFromEmail}>`,
        to,
        subject,
        html,
        text,
      },
    });
    return true;
  } catch (error) {
    // Détails en logs + Sentry, message générique (SEC-9). L'appelant gère la suite.
    reportServerError(error, 'utils/email/resend', { to });
    return false;
  }
}

/**
 * Données d'un don pour l'e-mail de confirmation.
 */
interface DonationEmailData {
  gateway: 'bictorys';
  transaction_id: string;
  amount: number;
  donor_name: string;
  donor_email: string;
  donor_phone?: string;
  invoice_ref?: string;
  created_at: string;
}

/**
 * Formater un montant en FCFA.
 */
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Une ligne « libellé / valeur » du récapitulatif (layout table, e-mail-safe).
 * `last` retire le séparateur du bas.
 */
function detailRow(label: string, value: string, last = false): string {
  const border = last ? '' : `border-bottom:1px solid ${BRAND.creamBorder};`;
  return `
              <tr>
                <td style="padding:12px 0;${border}font-size:14px;color:${BRAND.grayLight};">${label}</td>
                <td style="padding:12px 0;${border}font-size:14px;color:${BRAND.navy};font-weight:600;text-align:right;">${value}</td>
              </tr>`;
}

/**
 * Envoyer l'e-mail de confirmation de don.
 *
 * Design sobre aligné sur la charte Vie-Publique (logo, navy/or, fond blanc),
 * layout en tables pour un rendu fiable dans tous les clients e-mail (Outlook
 * inclus). Les champs issus du webhook sont échappés (`sanitizeString`) avant
 * interpolation (défense contre l'injection HTML/phishing) et l'adresse
 * destinataire est validée : on n'envoie qu'à une adresse bien formée.
 */
export async function sendDonationConfirmationEmail(
  donationData: DonationEmailData,
): Promise<boolean> {
  if (!donationData.donor_email || !isValidEmail(donationData.donor_email)) {
    reportServerError(
      new Error('Adresse de don invalide ou absente : e-mail de confirmation non envoyé'),
      'utils/email/donation',
      { reference: donationData.transaction_id },
    );
    return false;
  }

  const gatewayName = 'Bictorys';
  const formattedAmount = formatAmount(donationData.amount);
  const formattedDate = new Date(donationData.created_at).toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  // Échappement HTML de toutes les valeurs d'origine externe.
  const donorName = sanitizeString(donationData.donor_name) || 'Donateur';
  const transactionId = sanitizeString(donationData.transaction_id);
  const invoiceRef = sanitizeString(donationData.invoice_ref);
  const donorEmail = sanitizeString(donationData.donor_email);
  const donorPhone = sanitizeString(donationData.donor_phone);

  const pairs: Array<[string, string]> = [
    ['Référence', transactionId],
    ...(invoiceRef ? [['Numéro de facture', invoiceRef] as [string, string]] : []),
    ['Méthode de paiement', gatewayName],
    ['Date', formattedDate],
    ['Email', donorEmail],
    ...(donorPhone ? [['Téléphone', donorPhone] as [string, string]] : []),
  ];
  const rowsClean = pairs
    .map(([label, value], i) => detailRow(label, value, i === pairs.length - 1))
    .join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <title>Confirmation de don pour Vie Publique Sénégal</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background-color:${BRAND.white};border:1px solid ${BRAND.creamBorder};border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

          <!-- En-tête : logo + marque -->
          <tr>
            <td align="center" style="padding:36px 42px 22px;border-bottom:1px solid ${BRAND.creamBorder};">
              <img src="${BRAND.logo}" alt="Vie-Publique Sénégal" width="56" style="display:block;width:56px;height:auto;margin:0 auto 12px;border:0;">
              <div style="font-size:16px;font-weight:700;color:${BRAND.navy};letter-spacing:0.2px;">Vie Publique Sénégal</div>
              <div style="font-size:12px;color:${BRAND.gray};margin-top:4px;">Plateforme d'information publique</div>
            </td>
          </tr>

          <!-- Filet doré -->
          <tr><td style="height:3px;background-color:${BRAND.gold};font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Corps -->
          <tr>
            <td style="padding:36px 42px 8px;">
              <h1 style="margin:0 0 18px;font-size:22px;font-weight:700;color:${BRAND.navy};">Merci pour votre don</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.navySoft};">
                Cher(e) <strong style="color:${BRAND.navy};">${donorName}</strong>,
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.65;color:${BRAND.navySoft};">
                Nous vous remercions chaleureusement pour votre contribution. Votre soutien nous
                permet de maintenir une plateforme d'information publique transparente et accessible
                à tous les Sénégalais.
              </p>
            </td>
          </tr>

          <!-- Montant mis en avant -->
          <tr>
            <td style="padding:16px 42px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cream};border:1px solid ${BRAND.creamBorder};border-radius:10px;">
                <tr>
                  <td align="center" style="padding:22px;">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${BRAND.gray};margin-bottom:6px;">Montant de votre don</div>
                    <div style="font-size:30px;font-weight:700;color:${BRAND.navy};">${formattedAmount}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Détails -->
          <tr>
            <td style="padding:24px 42px 8px;">
              <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:${BRAND.gray};margin-bottom:6px;">Détails de la transaction</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${rowsClean}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:28px 42px 8px;">
              <a href="${BRAND.site}" style="display:inline-block;background-color:${BRAND.navy};color:${BRAND.white};text-decoration:none;font-size:15px;font-weight:600;padding:13px 30px;border-radius:8px;">Visiter Vie-Publique Sénégal</a>
            </td>
          </tr>

          <!-- Note reçu -->
          <tr>
            <td style="padding:20px 42px 36px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.gray};border-top:1px solid ${BRAND.creamBorder};padding-top:20px;">
                Conservez cet e-mail comme preuve de votre transaction. Pour toute question,
                écrivez-nous à <a href="mailto:contact@vie-publique.sn" style="color:${BRAND.navy};font-weight:600;">contact@vie-publique.sn</a>.
              </p>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="background-color:${BRAND.navy};padding:28px 42px;text-align:center;">
              <div style="font-size:14px;font-weight:700;color:${BRAND.white};margin-bottom:4px;">Vie-Publique Sénégal</div>
              <div style="font-size:12px;color:#B8C0CF;margin-bottom:14px;">Plateforme citoyenne indépendante — Dakar, Sénégal</div>
              <div style="font-size:12px;color:#B8C0CF;">
                <a href="https://x.com/ViePubliqueSN" style="color:${BRAND.gold};text-decoration:none;">Twitter</a> &nbsp;·&nbsp;
                <a href="https://www.facebook.com/ViePubliqueSenegal" style="color:${BRAND.gold};text-decoration:none;">Facebook</a> &nbsp;·&nbsp;
                <a href="https://www.linkedin.com/company/vie-publique-sn" style="color:${BRAND.gold};text-decoration:none;">LinkedIn</a> &nbsp;·&nbsp;
                <a href="${BRAND.site}" style="color:${BRAND.gold};text-decoration:none;">Site web</a>
              </div>
              <div style="font-size:11px;color:#7E8AA0;margin-top:16px;">Cet e-mail a été envoyé automatiquement. Merci de ne pas y répondre.</div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  const textContent = `Vie-Publique Sénégal — Confirmation de don

Cher(e) ${donorName},

Merci pour votre contribution. Votre soutien nous permet de maintenir une plateforme d'information publique transparente et accessible à tous les Sénégalais.

DÉTAILS DE LA TRANSACTION
Montant : ${formattedAmount}
Référence : ${transactionId}
${invoiceRef ? `Numéro de facture : ${invoiceRef}\n` : ''}Méthode de paiement : ${gatewayName}
Date : ${formattedDate}
Email : ${donorEmail}
${donorPhone ? `Téléphone : ${donorPhone}\n` : ''}
Conservez cet e-mail comme preuve de votre transaction.
Question ? contact@vie-publique.sn — ${BRAND.site}

Vie-Publique Sénégal — Plateforme citoyenne indépendante, Dakar.`;

  return sendEmail({
    to: donationData.donor_email,
    subject: `Merci pour votre don de ${formattedAmount} à Vie Publique Sénégal`,
    html: htmlContent,
    text: textContent,
  });
}
