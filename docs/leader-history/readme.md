# Feature « Présidents & Premiers ministres »

Pages de référence sur tous les présidents et Premiers ministres du Sénégal depuis l'indépendance.
Les mandats sont **dérivés dynamiquement** de la collection `governments` — aucune liste codée
en dur.

- **Présidents — liste** : `/etat-senegal/presidents`
- **Présidents — détail** : `/etat-senegal/presidents/<slug>` (ex. `/etat-senegal/presidents/bassirou-diomaye-faye`)
- **Premiers ministres — liste** : `/etat-senegal/premiers-ministres`
- **Premiers ministres — détail** : `/etat-senegal/premiers-ministres/<slug>` (ex. `/etat-senegal/premiers-ministres/ousmane-sonko`)

---

## Architecture

| Couche | Fichier | Rôle |
| --- | --- | --- |
| Types | `types/leader-history.ts` | `LeaderBrief`, `LeaderProfile`, `LeaderAppointment`, `GovernmentBrief`, `PresidentialTerm`, `PrimeMinisterialTerm`, `PrimeMinisterGap`, réponses API |
| Utilitaire serveur | `server/utils/leader-history.ts` | `fetchGovernmentsAsc`, `buildPresidentialTerms`, `buildPrimeMinisterialTerms`, `fetchLeaderProfile`, `fetchLeaderAppointment`, `leaderNav` |
| API présidents liste | `server/api/leader/presidents.get.ts` | Liste des mandats présidentiels, cache 2 h |
| API présidents détail | `server/api/leader/presidents/[slug].get.ts` | Détail d'une présidence + profil + décret, cache 1 h |
| API PM liste | `server/api/leader/prime-ministers.get.ts` | Liste des mandats PM + périodes sans PM (`gaps`), cache 2 h |
| API PM détail | `server/api/leader/prime-ministers/[slug].get.ts` | Détail d'un mandat PM + profil + décret, cache 1 h |
| Composable présidents | `app/composables/usePresidents.ts` | `usePresidents()` + `usePresidentDetail(slug)` |
| Composable PMs | `app/composables/usePrimeMinisters.ts` | `usePrimeMinisters()` + `usePrimeMinisterDetail(slug)` |
| Composable format | `app/composables/useLeaderFormat.ts` | Helpers partagés : dates, durée, initiales, URL sécurisée |
| Page présidents liste | `app/pages/etat-senegal/presidents/index.vue` | Grille de cartes, triées récent → ancien, SEO `ItemList` |
| Page présidents détail | `app/pages/etat-senegal/presidents/[slug].vue` | Profil, stats, gouvernements, SEO `Person` |
| Page PMs liste | `app/pages/etat-senegal/premiers-ministres/index.vue` | Grille + filtre par président (`?president=`), périodes sans PM, SEO `ItemList` |
| Page PMs détail | `app/pages/etat-senegal/premiers-ministres/[slug].vue` | Profil, stats, gouvernements, SEO `Person` |
| Composant | `app/components/Leader/PersonCard.vue` | Carte personne (photo/initiales + nom, lien) |
| Composant | `app/components/Leader/BioFacts.vue` | Bloc biographique (naissance, formation, réseaux sociaux) |
| Composant | `app/components/Leader/Hero.vue` | En-tête de page détail |
| Composant | `app/components/Leader/Accordion.vue` | Accordéon gouvernements d'un mandat |
| Composant | `app/components/Leader/PrevNext.vue` | Navigation précédent / suivant entre leaders |

---

## Principe clé : dérivation depuis `governments`

**Aucune collection Directus dédiée** aux présidents ou aux PMs n'a été créée. Les mandats sont
entièrement **calculés côté serveur** à partir de `governments` :

```
fetchGovernmentsAsc()          → tous les gouvernements triés start_date ASC
  └─ buildPresidentialTerms()  → groupement par president.id → PresidentialTerm[]
  └─ buildPrimeMinisterialTerms() → groupement par prime_minister.id → PrimeMinisterialTerm[] + gaps[]
```

Conséquences :
- Ajouter ou corriger un gouvernement dans Directus met automatiquement à jour les mandats.
- Les périodes sans PM (présidence directe) sont calculées automatiquement (`prime_minister` null
  → `PrimeMinisterGap`).

---

## Types clés (`types/leader-history.ts`)

```typescript
type LeaderBrief = { id; full_name; slug; photo }        // référence légère
type GovernmentBrief = { id; name; slug; start_date; end_date; notes; president; prime_minister }

type PresidentialTerm = {
  president: LeaderBrief;
  start_date: string; end_date: string | null;
  governments: GovernmentBrief[];
  prime_ministers: LeaderBrief[];  // dédupliqués
  stats: { governments_count; duration_days; pm_count; periods_without_pm }
}

type PrimeMinisterialTerm = {
  prime_minister: LeaderBrief;
  president: LeaderBrief;           // premier président du mandat
  start_date: string; end_date: string | null;
  governments: GovernmentBrief[];
  presidents: LeaderBrief[];        // dédupliqués (si mandat sous plusieurs présidents)
  stats: { governments_count; duration_days }
}

type PrimeMinisterGap = {           // période sans PM
  start_date; end_date; president; governments; label;
}

type LeaderProfile  // données biographiques complètes (public_persons)
type LeaderAppointment  // nomination officielle (public_person_appointments)
type LeaderNav = { slug; full_name } | null  // navigation précédent/suivant
```

---

## Utilitaire serveur (`server/utils/leader-history.ts`)

| Fonction | Rôle |
| --- | --- |
| `fetchGovernmentsAsc()` | Lecture Directus, tri `start_date` ASC, normalisation en `GovernmentBrief[]` |
| `buildPresidentialTerms(govs)` | Groupement par `president.id`, calcul des stats |
| `buildPrimeMinisterialTerms(govs)` | Groupement par `prime_minister.id` + extraction des gaps |
| `fetchLeaderProfile(slug)` | Profil biographique depuis `public_persons` |
| `fetchLeaderAppointment(personId, categorySlug)` | Décret de nomination depuis `public_person_appointments` |
| `leaderNav(order, slug)` | Calcule `prev` / `next` dans une liste ordonnée de leaders |
| `durationDays(start, end)` | Durée en jours (end null = aujourd'hui) |

---

## Composable `useLeaderFormat`

Helpers partagés par toutes les pages leaders (importés via `useLeaderFormat()`).

| Fonction | Rôle |
| --- | --- |
| `formatLongDate(str)` | `"5 mars 2024"` |
| `year(str)` | `"2024"` |
| `formatPeriod(start, end)` | `"depuis le 5 mars 2024"` / `"du 5 mars 2024 au 12 juin 2025"` |
| `formatDuration(days)` | `"2 ans et 3 mois"` |
| `initials(name)` | `"BD"` (fallback si pas de photo) |
| `isSafeUrl(url)` | Valide les URLs de réseaux sociaux (XSS-safe) |
| `documentUrl(decree)` | `/documents/<id>/<slug>` |

---

## Pages liste

### `/etat-senegal/presidents`
- Cartes triées récent → ancien (`[...terms].reverse()`)
- Chaque carte : photo/initiales, nom, période, durée, nb gouvernements, nb PMs
- Pas de filtre
- SEO : `useSeoMeta` + JSON-LD `ItemList` + `BreadcrumbList`

### `/etat-senegal/premiers-ministres`
- **Filtre par président** via `?president=<slug>` (URL sync, dérivé des données)
- Intégration des `gaps` (périodes sans PM) dans la frise chronologique
- SEO : `useSeoMeta` + JSON-LD `ItemList` + `BreadcrumbList`

---

## Pages détail

### `/etat-senegal/presidents/[slug]`
- Profil biographique (`LeaderProfile`) : photo, naissance, formation, réseaux sociaux
- Mandat : période, durée, stats
- Liste des gouvernements formés (liens vers `/gouvernement-senegal/<slug>`)
- Liste des PMs nommés (liens vers `/etat-senegal/premiers-ministres/<slug>`)
- Décret d'investiture si disponible
- Navigation précédent / suivant (`LeaderPrevNext`)
- 404 via `watchEffect` si `error.value` après chargement
- SEO : `Person` JSON-LD, `og:image` = photo CMS si dispo sinon `/nomination-3.png`

### `/etat-senegal/premiers-ministres/[slug]`
- Structure identique au détail président
- Lien(s) vers le(s) président(s) sous qui le PM a servi
- SEO : idem (`Person` JSON-LD)

---

## Gestion des cas limites

| Cas | Comportement |
| --- | --- |
| Gouvernement sans PM | `prime_minister` null → compté dans `periods_without_pm` ; exclu de la liste PMs |
| Périodes sans PM (1962–1970, 1983–1991, etc.) | `PrimeMinisterGap` affiché dans la liste PMs avec libellé contextuel |
| Profil biographique absent | `LeaderProfile` null → section bio masquée, photo remplacée par initiales |
| Décret introuvable | `appointment` null → section décret masquée |
| Slug invalide | Regex `/^[a-z0-9-]{1,100}$/` → 400 avant Directus |
| Leader introuvable | `buildPresidentialTerms().find()` → 404 |

---

## Cache serveur (Nitro)

| Endpoint | TTL prod | Clé |
| --- | --- | --- |
| `/api/leader/presidents` | 2 h | `leader-presidents` (stable, pas de params) |
| `/api/leader/presidents/[slug]` | 1 h | `president-<slug>` |
| `/api/leader/prime-ministers` | 2 h | `leader-prime-ministers` (stable) |
| `/api/leader/prime-ministers/[slug]` | 1 h | `pm-<slug>` |

---

## Maillage interne

- Page détail président → liens gouvernements (`/gouvernement-senegal/<slug>`)
- Page détail président → liens PMs nommés (`/etat-senegal/premiers-ministres/<slug>`)
- Page détail PM → liens gouvernements (`/gouvernement-senegal/<slug>`)
- Page détail PM → liens présidents (`/etat-senegal/presidents/<slug>`)
- Page historique gouvernements → déjà liée (les gouvernements contiennent les slugs)

---

## Tester en local

```bash
# API
curl http://localhost:3000/api/leader/presidents
curl http://localhost:3000/api/leader/presidents/bassirou-diomaye-faye
curl http://localhost:3000/api/leader/prime-ministers
curl http://localhost:3000/api/leader/prime-ministers/ousmane-sonko
curl "http://localhost:3000/api/leader/prime-ministers?president=bassirou-diomaye-faye"

# SSR
curl -sL http://localhost:3000/etat-senegal/presidents | grep -oE '<title>[^<]+'
curl -sL http://localhost:3000/etat-senegal/presidents/bassirou-diomaye-faye | grep -oE '<title>[^<]+'
curl -sL http://localhost:3000/etat-senegal/premiers-ministres | grep -oE '<title>[^<]+'
curl -sL http://localhost:3000/etat-senegal/premiers-ministres/ousmane-sonko | grep -oE '<title>[^<]+'

# 404
curl -sI http://localhost:3000/etat-senegal/presidents/inconnu  # → 404
```
