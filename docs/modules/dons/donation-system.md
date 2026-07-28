# Système de Donation - Vie-Publique.sn

Documentation du système de donation via **Bictorys**.

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Flux de paiement](#flux-de-paiement)
5. [Pages et composants](#pages-et-composants)
6. [API Endpoints](#api-endpoints)
7. [Emails de confirmation](#emails-de-confirmation)

---

## Vue d'ensemble

Le système de donation permet aux utilisateurs de soutenir Vie-Publique.sn via **Bictorys** (carte bancaire et Mobile Money).

### Caractéristiques principales

✅ Page dédiée `/don/bictorys`
✅ Formulaire avec montants prédéfinis et montant personnalisé
✅ Checkbox obligatoire d'acceptation de la charte des dons
✅ Envoi automatique d'email de confirmation via Nodemailer
✅ Pages de callback communes (succès/annulation)
✅ Webhook pour traiter les notifications de paiement

---

## Architecture

### Structure des fichiers

```
app/
├── pages/
│   └── don/
│       ├── bictorys.vue          # Page de don via Bictorys
│       ├── success.vue           # Page de confirmation (succès)
│       └── cancel.vue            # Page d'annulation
├── composables/
│   └── useBictorysDonation.ts   # Logique Bictorys
└── components/
    └── DonateButton.vue          # Bouton flottant

server/
├── api/
│   └── donate/
│       ├── init-payment.post.ts  # Init Bictorys
│       └── webhook.post.ts       # Webhook Bictorys
└── utils/
    └── email.ts                  # Envoi d'e-mails transactionnels via Resend
```

### Diagramme de flux

```
┌─────────────────────────────────┐
│         Menu de Navigation      │
│       [Don avec Bictorys]       │
└─────────────────┬───────────────┘
                  │
         ┌────────▼────────┐
         │ /don/bictorys   │
         │ Formulaire      │
         │ + Checkbox      │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │ API Init        │
         │ Bictorys        │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │ Passerelle      │
         │ Bictorys        │
         └────────┬────────┘
                  │
       ┌──────────▼──────────┐
       │ Success ou Cancel   │
       └──────────┬──────────┘
                  │
       ┌──────────▼──────────┐
       │ Webhook Handler     │
       │ + Email Nodemailer  │
       └─────────────────────┘
```

---

## Configuration

### Variables d'environnement

Copiez `.env.example` vers `.env` et configurez :

```env
BICTORYS_API_KEY=test_public-VOTRE_CLE_ICI
BICTORYS_SECRET_KEY=test_secret-VOTRE_CLE_ICI
BICTORYS_API_URL=https://api.test.bictorys.com/pay/v1/charges
BICTORYS_WEBHOOK_SECRET=your_webhook_secret_here
```

```env
# E-mails transactionnels via Resend. Expéditeur sur le SOUS-domaine send.vie-publique.sn.
RESEND_API_KEY=re_votre_cle_api
RESEND_FROM_EMAIL=dons@send.vie-publique.sn
```

**Note délivrabilité & DNS** : l'expéditeur est sur le **sous-domaine `send.vie-publique.sn`**
(vérifié dans Resend) et **non** sur le domaine racine — ainsi les enregistrements Resend
(SPF/DKIM du sous-domaine) n'interfèrent pas avec **Google Workspace** qui gère le mail humain
`@vie-publique.sn` (MX `smtp.google.com` sur la racine). Les enregistrements DNS Resend s'ajoutent
dans **Cloudflare** (DNS autoritaire du domaine), en **DNS only** (nuage gris, pas de proxy). La
newsletter marketing reste sur **Brevo**, canal distinct.

### Configuration du webhook Bictorys

URL : `https://vie-publique.sn/api/donate/webhook`
Événements : `charge.success`, `charge.failed`, `charge.pending`

---

## Flux de paiement

1. **Utilisateur** : Accède à `/don/bictorys`
2. **Utilisateur** : Remplit le formulaire et accepte la charte
3. **Frontend** : Appelle `POST /api/donate/init-payment`
4. **Backend** : Crée une transaction Bictorys et retourne l'URL de paiement
5. **Frontend** : Redirige vers Bictorys
6. **Utilisateur** : Effectue le paiement sur Bictorys
7. **Bictorys** : Redirige vers `/don/success?gateway=bictorys` ou `/don/cancel?gateway=bictorys`
8. **Bictorys** : Envoie un webhook à `/api/donate/webhook`
9. **Backend** : Traite le webhook et envoie l'email de confirmation

---

## Pages et composants

### `/don/bictorys.vue`

- Formulaire de don avec Bictorys
- Montants prédéfinis : 1 000, 2 500, 5 000, 10 000, 25 000, 50 000 FCFA
- Champs : Nom, Email, Téléphone (optionnel), Montant
- Checkbox obligatoire pour accepter la charte
- Composable : `useBictorysDonation()`

### `/don/success.vue`

- Page de confirmation après paiement réussi
- Détecte la gateway via `?gateway=bictorys`

### `/don/cancel.vue`

- Page affichée si l'utilisateur annule
- Propose de réessayer via Bictorys

### Composable `useBictorysDonation()`

```typescript
const {
  isProcessing,      // État du traitement
  error,             // Message d'erreur
  initiateDonation,  // Fonction d'initialisation
  suggestedAmounts,  // Montants prédéfinis
  formatAmount,      // Formater en FCFA
} = useBictorysDonation()
```

---

## API Endpoints

### `POST /api/donate/init-payment`

Initialise un paiement Bictorys.

**Request Body :**
```json
{
  "amount": 5000,
  "name": "Prénom Nom",
  "email": "email@example.com",
  "phone": "+221XXXXXXXXX"
}
```

**Response :**
```json
{
  "success": true,
  "data": {
    "payment_url": "https://...",
    "transaction_id": "xxx",
    "amount": 5000,
    "currency": "XOF"
  }
}
```

### `POST /api/donate/webhook`

Webhook Bictorys pour les notifications de paiement.

---

## Emails de confirmation

Les e-mails sont envoyés automatiquement via l'**API Resend** (`server/utils/email.ts`) après un
paiement réussi. Les champs issus du webhook sont échappés (`sanitizeString`) avant interpolation
dans le HTML, et l'adresse destinataire est validée (`isValidEmail`) avant l'envoi.

```typescript
await sendDonationConfirmationEmail({
  gateway: 'bictorys',
  transaction_id: 'TXN123456',
  amount: 5000,
  donor_name: 'CISSE410',
  donor_email: 'cisse410@vpsn.sn',
  donor_phone: '+221771234567',
  invoice_ref: 'VPSN-DON-123',
  created_at: new Date().toISOString(),
})
```

### Sécurité du webhook (fait 2026-07-26)

Le webhook est authentifié par le **secret partagé** Bictorys : l'en-tête `X-Secret-Key` est
comparé en temps constant à `BICTORYS_WEBHOOK_SECRET` (Bictorys **n'utilise pas de HMAC** — cf.
[doc officielle](https://docs.bictorys.com/docs/how-to-validate-webhooks)). Rejet **401** si absent
ou incorrect, avant tout traitement. Le contenu du payload (montant, devise, statut) est validé
avant l'envoi de l'e-mail. Détail dans [`../../audits/audit-claude-security-2026-07.md`](../../audits/audit-claude-security-2026-07.md).

### TODO restants

- **Persistance des dons** : enregistrer chaque don confirmé (collection Directus) pour la
  traçabilité comptable, les statistiques et les reçus fiscaux. Aujourd'hui le webhook n'envoie
  qu'un e-mail, sans conserver de trace.
- **Anti-bot** : ajouter Turnstile sur `/api/donate/init-payment` (chantier SEC-4 global).

---

## Support

- **Documentation Bictorys** : [https://docs.bictorys.com](https://docs.bictorys.com)
- **Documentation Resend** : [https://resend.com/docs](https://resend.com/docs)
