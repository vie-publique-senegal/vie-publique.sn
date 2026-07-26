# Audit sécurité automatisé — Claude Security (2026-07)

> Rapport daté. Outil et méthode : [`../guidelines/claude-security-scan.md`](../guidelines/claude-security-scan.md).
> Complémentaire de l'audit manuel [`audit-complet-2026-07.md`](./audit-complet-2026-07.md) (SEC-1..10),
> ne le remplace pas. **Findings issus d'un pipeline automatisé à vérification adversariale : confirmer
> chacun contre le code courant avant d'agir.**

## Contexte du scan

| Champ | Valeur |
| --- | --- |
| Date | 2026-07-25 (session lancée 2026-07-24 23:41 UTC) |
| Révision | `562137fe01ec` (branche `develop`, arbre *dirty*) |
| Portée | `server/` (139 fichiers), focus `attack-surface` |
| Effort | `medium` · pipeline inventory → threat-model → research → sweep → panel 3-lentilles |
| Volume | 152 agents · 40 candidats bruts → 35 dédupliqués → **11 vérifiés** (quorum ≥ 2/3) |
| Statut | **`verified`** (le panel a atteint le quorum pour chaque finding rapporté) |

**Bilan : 1 HIGH, 8 MEDIUM, 2 LOW.** Le point de gravité unique est le **webhook de paiement
Bictorys non vérifié** (`server/api/donate/webhook.post.ts`) : sa vérification HMAC stubbée (TODO
commenté) est la cause racine de 5 findings (F1, F2, F3, F7, F10). **Un seul fix (vérifier la
signature HMAC) neutralise l'essentiel du risque.**

## Findings

### ✅ F1 — HIGH — Webhook paiement : événements forgés traités, signature jamais vérifiée — **CORRIGÉ 2026-07-26**
- **Fichier** : `server/api/donate/webhook.post.ts:41` · CWE-345 (auth-bypass) · panel 3/3
- Le header `x-bictorys-signature` est lu mais jamais vérifié (HMAC en TODO commenté l.15-23 ;
  `bictorysWebhookSecret` l.13 inutilisé). N'importe qui connaissant l'URL peut POSTer un
  `charge.success` forgé → aujourd'hui envoi d'e-mail de confirmation via le SMTP de l'asso vers
  un destinataire arbitraire ; demain (TODO du code : écriture des dons, stats, reçus fiscaux)
  des enregistrements de dons et **reçus fiscaux frauduleux**.
- **⚠️ Correction de méthode vs reco du scanner** : Bictorys **n'utilise PAS de HMAC**. Le nom
  `x-bictorys-signature` du stub était trompeur. La vraie authentification (doc officielle
  [« Comment valider les webhooks »](https://docs.bictorys.com/docs/how-to-validate-webhooks)) est
  un **secret partagé** dans l'en-tête `X-Secret-Key`, à comparer par **égalité** au secret du
  dashboard.
- **Fix appliqué** : lecture de `X-Secret-Key`, comparaison **temps constant** (`timingSafeEqual`
  sur hachés SHA-256 → longueur fixe, sans fuiter la longueur du secret) contre
  `bictorysWebhookSecret`, **401** si absent/incorrect, **AVANT** le `try/catch` (sinon le 401
  serait avalé en 200). Secret non configuré → fail-closed + `reportServerError`.

### ✅ F2 — MEDIUM — E-mail de confirmation envoyé à un destinataire arbitraire (relais mail) — **CORRIGÉ 2026-07-26**
- `server/utils/nodemailer.ts:319` (→ désormais `server/utils/email.ts`) · CWE-862 · panel 3/3
- `donor_email` vient du corps webhook non vérifié → utilisé tel quel comme `to` SMTP : le mailer
  de l'asso peut être dirigé vers n'importe quelle cible avec un contenu contrôlé.
- **Fix appliqué** : exploitation externe bloquée par F1 (webhook authentifié) ; en défense en
  profondeur, l'adresse est validée (`isValidEmail`) avant l'envoi et le payload webhook est
  validé (montant/devise/statut). Migration Nodemailer → **API Resend** (`server/utils/email.ts`).

### ✅ F3 — MEDIUM — Secret webhook chargé mais jamais utilisé (vue crypto de F1) — **CORRIGÉ 2026-07-26**
- `server/api/donate/webhook.post.ts:13` · CWE-347 (weak-crypto) · panel 3/3
- Même cause racine que F1. Réglé par le même fix : `bictorysWebhookSecret` est désormais
  effectivement utilisé pour authentifier chaque requête.

### 🟠 F4 — MEDIUM — Relais anonyme du chatbot payant avec la clé serveur
- `server/api/chat.ts:6` · CWE-306 · panel 2/3
- `POST /api/chat` non authentifié relaie vers le backend chatbot avec `CHATBOT_API_KEY` ; pas
  d'auth, pas de Turnstile, le « check » CSRF repose sur un cookie posé par l'appelant → abus de
  coût/quota anonyme jusqu'à 60 req/min.
- **Fix** : exiger un token **Turnstile** (déjà utilisé ailleurs) ou une session avant de relayer ;
  valider forme/taille du body ; ne jamais traiter le cookie CSRF client comme signal d'autorisation.

### 🟠 F5 — MEDIUM — Proxy `docs` (route) : path catch-all sans normalisation `../` (échappe `/assets/`)
- `server/routes/docs/[...path].ts:61` · CWE-22 (path-traversal) · panel 2/3
- Le `path` non fiable est interpolé brut dans l'URL CMS et forwardé (`proxyRequest`) ; les `../`
  résolvent au parsing → accès à des endpoints Directus arbitraires (`/items/**`, `/server/info`).
  `FILE_ID_RE` ne garde que le lookup canonique, pas ce proxy.
- **Fix** : valider `path` contre la forme d'un ID d'asset, décoder une fois, rejeter tout segment
  `..` ou slash initial ; ne pas se reposer sur le préfixe `/assets/`.

### 🟠 F6 — MEDIUM — Proxy `api/docs` : même échappement `/assets/` (jumeau de F5)
- `server/api/docs/[...path].ts:19` · CWE-22 · panel 2/3
- `path` attaquant concaténé dans `targetUrl` passé à `$fetch.raw` sans contrôle `..`.
- **Fix** : identique à F5 (valider le motif d'asset, rejeter `..`/slash initial).

### ✅ F7 — MEDIUM — Champs webhook non échappés injectés dans l'e-mail HTML (phishing brandé) — **CORRIGÉ 2026-07-26**
- `server/utils/nodemailer.ts:202` (→ désormais `server/utils/email.ts`) · CWE-79 (xss/HTML injection) · panel 3/3
- `data.customer.name/phone/email`, `reference`, `merchantReference` interpolés bruts dans le
  corps HTML de l'e-mail, envoyé depuis le SMTP de l'asso → message de phishing crédible.
- **Fix appliqué** : chaque valeur d'origine externe est échappée via `sanitizeString`
  (strip balises + entités HTML + caractères de contrôle) avant interpolation dans le HTML et le
  texte de l'e-mail. Combiné à l'authentification du webhook (F1).

### 🟠 F8 — MEDIUM — Filtre `status` piloté par le client expose les questions parlementaires non publiées
- `server/api/assembly/questions/index.get.ts:29` · CWE-639 · panel 2/3
- Le paramètre `filterStatus` va direct dans le filtre Directus → `?filterStatus=draft` renvoie
  des questions en brouillon (subject, question_text) au public.
- **Fix** : **hardcoder `status: 'published'`** (comme `documents/index.get.ts` et
  `medias/index.get.ts`) ou allowlist stricte ; idéalement restreindre le rôle du token Directus.

### 🟠 F9 — MEDIUM — Construction de clé de cache ambiguë → aliasing / cache poisoning
- `server/utils/cache.ts:47` (`buildCacheKey`) · CWE-20 · panel 2/3
- La clé joint clés ET valeurs de query avec `'_'` comme **double** séparateur : deux query
  strings différentes s'effondrent sur une même clé Nitro. `?category=lois_type_decret` collisionne
  avec `?category=lois&type=decret` → un attaquant fait cacher une liste vide sous la clé légitime
  (fenêtre 5 min–24 h), et peut flooder le cache disque avec des params uniques.
- **Fix** : construire la clé depuis un **set de paramètres whitelisté** sérialisé sans collision
  (`JSON.stringify` d'un objet normalisé, ou encodage par paire) ; ignorer les clés inconnues.

### 🟡 F10 — LOW — Champs webhook non assainis écrits dans les logs (log injection) — **atténué 2026-07-26**
- `server/api/donate/webhook.post.ts:26` · CWE-117 · panel 2/3
- `event`/`type`, `reference`, `status` du corps non vérifié passés à `console.log` → injection de
  fausses lignes de log / caractères de contrôle. Impact borné (aucun code n'exécute le log).
- **Atténué par le fix F1** : le `console.log` n'est atteint qu'après authentification du secret,
  donc les champs proviennent désormais de Bictorys, plus d'un tiers arbitraire. Résiduel : un
  Bictorys compromis pourrait encore injecter — assainissement (`JSON.stringify` par valeur) reste
  souhaitable mais n'est plus prioritaire.

### 🟡 F11 — LOW — Rate limiter par endpoint keyé sur `X-Forwarded-For`/`X-Real-IP` spoofable
- `server/utils/rate-limit.ts:33` (`checkRateLimit`) · CWE-290 · panel 2/3
- La clé vient du `x-forwarded-for` (valeur la plus à gauche) contrôlé client → en tournant le
  header, bucket neuf par requête, cap 5/min contourné sur notifications subscribe/unsubscribe.
  Borné par le limiter global nuxt-security (60/min).
- **Fix** : dériver l'IP d'une source de confiance (`getRequestIP(event, { xForwardedFor: true })`
  avec nombre de hops proxy connu, ou hop XFF le plus à droite posé par notre proxy) ; plafonner
  le nombre de clés distinctes. Recoupe une remarque de l'audit manuel préliminaire.

## Couverture

- **11 composants revus** (tout le code serveur atteignable en scope) : cms-asset-proxy,
  payment-donate, chat-proxy, push-notifications, newsletter-subscription, whistleblowing,
  csrf-and-csp, search-api, cms-read-apis, server-infrastructure, static-data-apis.
- **Écarté volontairement** : `server/data/*.json` (fixtures statiques, pas de code exécutable ;
  le handler qui les sert est couvert sous `static-data-apis`).
- **Bucket élagué** : catégorie `memory-and-unsafe` (TypeScript, pas de gestion mémoire manuelle).
- **Rejetés par le panel adversarial** : 24 des 35 candidats n'ont pas atteint le quorum 2/3
  (dont plusieurs rejets unanimes 0/3). Aucun candidat abandonné par un cap, aucun non-revu.

## Checklist de remédiation

- [x] **F1/F3** (HIGH+MED) — ✅ 2026-07-26 : authentification du webhook par secret partagé
      `X-Secret-Key` (temps constant, 401 sinon, fail-closed). Atténue aussi F10. **F2/F7 restent
      à faire** (échappement + destinataire vérifié dans `nodemailer.ts`).
- [x] **F7** — ✅ 2026-07-26 : échappement HTML (`sanitizeString`) de tous les champs dans l'e-mail.
- [x] **F2** — ✅ 2026-07-26 : validation de l'adresse (`isValidEmail`) + validation du payload
      webhook (montant/devise/statut) ; migration Nodemailer → API Resend.
- [ ] **F8** — hardcoder `status: 'published'` dans `assembly/questions/index.get.ts`.
- [ ] **F5/F6** — rejeter `..`/slash initial et valider le motif d'asset dans les deux proxys `docs`.
- [ ] **F4** — gate Turnstile/session sur `/api/chat` + validation body.
- [ ] **F9** — reconstruire `buildCacheKey` sans collision (params whitelistés).
- [ ] **F10** — assainir les champs webhook avant `console.log`.
- [ ] **F11** — dériver l'IP du rate limiter d'un hop proxy de confiance.

> Rapport machine complet (par-finding, exploit steps) : `CLAUDE-SECURITY-20260724-234126/` à la
> racine du dépôt (git-ignoré, non commité — supprimable une fois cette synthèse relue).
