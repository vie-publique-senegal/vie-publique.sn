# Prompt — Intégration frontend : Historique des présidents et Premiers ministres du Sénégal

## Contexte

Le projet **Vie Publique Sénégal** (`vpsn/`) est une application Nuxt 4 (Vue 3, SSR, Nuxt UI, Tailwind CSS, TypeScript).

La collection `governments` (Directus) contient les champs `president` et `prime_minister` (FK → `public_persons`) pour les ~46 gouvernements depuis 1960. La collection `public_person_appointments` contient les nominations individuelles de chaque personnalité (y compris les nominations à la présidence ou au poste de PM, identifiées par `position_category_slug`).

L'objectif est de créer :
1. Une **page liste des présidents** (`/senegal/presidents`) — indexable, SEO-riche
2. Une **page de détail par présidence** (`/senegal/presidents/[slug]`) — entité Google-referenceable
3. Une **page liste des Premiers ministres** (`/senegal/premiers-ministres`)
4. Une **page de détail par PM** (`/senegal/premiers-ministres/[slug]`)

Ces pages doivent **ne pas casser** les pages existantes (`/gouvernement-senegal`, `/gouvernement-senegal/historique`, `/personnalites/...`).

---

## Collections Directus

### `governments`

```
id              integer (PK)
status          enum  published | draft | archived
name            string   ex: "Gouvernement Sonko I"
slug            string   ex: "sonko-i"
start_date      date     (requis)
end_date        date     (nullable — null = en cours)
president       M2O → public_persons (requis)
prime_minister  M2O → public_persons (nullable — absent sur certaines périodes)
pm_appointment_decree  M2O → documents (nullable)
formation_decree       M2O → documents (nullable)
notes           text (nullable)
```

### `public_persons`

```
id              integer (PK)
status          enum  published | draft | archived
full_name       string  (requis)
slug            string  (unique, requis)
sexe            enum    male | female (nullable)
birthdate       date    (nullable)
birthplace      string  (nullable)
short_bio       text    (nullable)   résumé biographique (texte brut, ~2-3 phrases)
long_bio        text    (nullable)   biographie longue (HTML riche — interface input-rich-text-html)
photo           uuid    → directus_files (nullable)
education       text    (nullable)
website         text    (nullable)
facebook        text    (nullable)
twitter         text    (nullable)
instagram       text    (nullable)
tiktok          text    (nullable)
linkedin        text    (nullable)
current_appointment  M2O → public_person_appointments (nullable)
```

### `public_person_appointments`

```
id                   integer (PK)
status               enum  published | draft | archived
position_title       text   intitulé exact du poste
position_category    string libellé lisible du rôle
position_category_slug string slug machine (ex: "presidence", "premier_ministre")
person               M2O → public_persons
government           M2O → governments (nullable)
appointment_date     datetime (requis)
end_date             datetime (nullable)
end_reason           enum (nullable) — liste dynamique côté CMS
is_current           boolean
notes                text (nullable)
source_label         string (nullable)
source_document      M2O → documents (nullable)
source_excerpt       text (nullable)
```

> ⚠️ `position_category_slug` est une liste de choix gérée dans Directus. Ne jamais coder en dur `'presidence'` ou `'premier_ministre'` comme des constantes magiques dans la logique de groupement — les utiliser uniquement comme **filtres d'exclusion** (pour éviter les doublons avec le champ `president`/`prime_minister` de `governments`), jamais comme whitelist.

---

## Logique de dérivation des mandats

### Présidents

Un **mandat présidentiel** se dérive des gouvernements : tous les gouvernements où `president.id` est le même forment un mandat. Le `start_date` du mandat = `start_date` du premier gouvernement ; le `end_date` du mandat = `end_date` du dernier gouvernement (null si en cours).

```ts
// Regroupement chronologique par president.id
// Garder l'ordre start_date ASC pour construire les périodes correctement
const byPresident = new Map<number, PresidentialTerm>()
for (const govt of governments /* triés ASC */) {
  const pid = govt.president.id
  if (!byPresident.has(pid)) {
    byPresident.set(pid, {
      president: govt.president,
      start_date: govt.start_date,
      end_date: govt.end_date,
      governments: [],
      prime_ministers: [],
    })
  }
  const term = byPresident.get(pid)!
  term.governments.push(govt)
  term.end_date = govt.end_date   // toujours la fin du dernier gouvernement
  if (govt.prime_minister && !term.prime_ministers.some(p => p.id === govt.prime_minister!.id)) {
    term.prime_ministers.push(govt.prime_minister)
  }
}
```

> Abdou Diouf : PM de 1970 à 1980, puis Président de 1981 à 2000. Son entrée dans `byPresident` correspond uniquement à ses gouvernements comme Président ; sa période comme PM se retrouve via `governments` filtrés sur `prime_minister.slug`.

### Premiers ministres

Un **mandat de PM** se dérive des gouvernements où `prime_minister.id` est le même. Un PM peut avoir servi sous plusieurs présidents.

---

## Types TypeScript — `types/leader-history.ts`

```ts
export type LeaderBrief = {
  id: number
  full_name: string
  slug: string
  photo: string | null
}

export type GovernmentBrief = {
  id: number
  name: string
  slug: string
  start_date: string
  end_date: string | null
  notes: string | null
  prime_minister: LeaderBrief | null
  president: LeaderBrief
}

export type PresidentialTerm = {
  president: LeaderBrief
  start_date: string          // date du premier gouvernement sous ce président
  end_date: string | null     // null = mandat en cours
  governments: GovernmentBrief[]
  prime_ministers: LeaderBrief[]   // liste dédupliquée des PMs nommés
  stats: {
    governments_count: number
    duration_days: number
    pm_count: number            // nombre de PMs distincts
    periods_without_pm: number  // nombre de gouvernements sans PM
  }
}

export type PrimeMinistrialTerm = {
  prime_minister: LeaderBrief
  president: LeaderBrief      // premier président sous qui il a servi
  start_date: string
  end_date: string | null
  governments: GovernmentBrief[]
  presidents: LeaderBrief[]   // liste dédupliquée (si a servi sous plusieurs présidents)
  stats: {
    governments_count: number
    duration_days: number
  }
}

// Données biographiques complètes d'une personnalité
export type LeaderProfile = {
  id: number
  full_name: string
  slug: string
  sexe: 'male' | 'female' | null
  photo: string | null
  birthdate: string | null
  birthplace: string | null
  short_bio: string | null   // résumé biographique texte brut (~2-3 phrases)
  long_bio: string | null    // biographie complète HTML riche (à rendre avec v-html sécurisé)
  education: string | null
  website: string | null
  facebook: string | null
  twitter: string | null
  instagram: string | null
  tiktok: string | null
  linkedin: string | null
}
```

---

## Endpoints API — `server/api/leader/`

### `presidents.get.ts` — Liste de tous les mandats présidentiels

```
GET /api/leader/presidents
```

1. Récupère tous les gouvernements (`status: published`, triés `start_date ASC`)
2. Regroupe par `president.id` → `PresidentialTerm[]`
3. Calcule les stats pour chaque mandat

Cache : `defineCachedEventHandler`, TTL = 0 en dev, **2h** en production (données stables).  
La clé de cache ne dépend d'aucun param — réponse identique pour tous.

Réponse :
```ts
{
  terms: PresidentialTerm[]   // du plus ancien (Senghor) au plus récent
  total: number               // nombre de présidences distinctes
}
```

### `presidents/[slug].get.ts` — Détail d'une présidence

```
GET /api/leader/presidents/:slug
```

Paramètre `:slug` = slug de la `public_persons` du président.

**Validation de sécurité** : vérifier que `slug` correspond au pattern `^[a-z0-9-]+$` ; sinon `createError({ statusCode: 400 })`.

1. Récupère les gouvernements filtrés : `president.slug = slug`
2. Récupère le profil complet de la personne (`public_persons` par slug) en incluant explicitement `short_bio` et `long_bio` dans `fields`
3. Récupère les `public_person_appointments` de la personne (`position_category_slug = 'presidence'`) pour les décrets et dates précises de nomination
4. Calcule le mandat complet

> `long_bio` est un champ HTML riche. L'API le retourne tel quel (chaîne HTML). Le frontend le rend via `v-html` directement (HTML de confiance produit par l'éditeur Directus, comme les pages `personnalites`, `documents`, `actualites` du projet — pas de DOMPurify). Pas de sanitisation côté client : le projet n'utilise pas DOMPurify.

Cache : TTL = 0 en dev, **1h** en production. Clé = `president-${slug}`.

Si aucun gouvernement ne correspond au slug → `createError({ statusCode: 404, message: 'Président introuvable' })`.

Réponse :
```ts
{
  term: PresidentialTerm
  profile: LeaderProfile
  // Nomination officielle à la présidence (source primaire si disponible)
  appointment: {
    appointment_date: string | null
    end_date: string | null
    end_reason: string | null
    source_label: string | null
    source_document: { id: number; title: string; slug: string | null } | null
    source_excerpt: string | null
    notes: string | null
  } | null
  // Navigation prev/next (ordre chronologique des présidences)
  prev: { slug: string; full_name: string } | null
  next: { slug: string; full_name: string } | null
}
```

### `prime-ministers.get.ts` — Liste de tous les mandats de PM

```
GET /api/leader/prime-ministers
```

1. Récupère tous les gouvernements avec `prime_minister` populated
2. Regroupe par `prime_minister.id` → `PrimeMinistrialTerm[]`
3. Gère les PMs ayant servi sous plusieurs présidents (ex. Habib Thiam)
4. Inclut une entrée synthétique pour les périodes sans PM (`prime_minister = null`)

Cache : TTL = 0 en dev, **2h** en production.

Réponse :
```ts
{
  terms: PrimeMinistrialTerm[]   // ordre chronologique
  total: number                  // nombre de PMs distincts
  // Périodes sans PM (pour affichage dans la timeline)
  gaps: Array<{
    start_date: string
    end_date: string | null
    president: LeaderBrief
    governments: GovernmentBrief[]
    label: string   // ex: "Fonction abolie (1962–1970)"
  }>
}
```

### `prime-ministers/[slug].get.ts` — Détail d'un mandat de PM

```
GET /api/leader/prime-ministers/:slug
```

**Validation** : `slug` doit correspondre à `^[a-z0-9-]+$` ; sinon `createError({ statusCode: 400 })`.

1. Récupère les gouvernements filtrés : `prime_minister.slug = slug`
2. Récupère le profil complet de la personne en incluant explicitement `short_bio` et `long_bio` dans `fields`
3. Récupère les `public_person_appointments` avec `position_category_slug = 'premier_ministre'`

Cache : TTL = 0 en dev, **1h** en production. Clé = `pm-${slug}`.

Si aucun gouvernement → `createError({ statusCode: 404 })`.

Réponse :
```ts
{
  term: PrimeMinistrialTerm
  profile: LeaderProfile
  appointment: { /* idem structure appointment présidentiel */ } | null
  prev: { slug: string; full_name: string } | null
  next: { slug: string; full_name: string } | null
}
```

---

## Composables — `app/composables/`

### `usePresidents.ts`

```ts
export const usePresidents = () => {
  const { data, pending, error } = useFetch('/api/leader/presidents', {
    key: 'presidents-list',
  })

  const terms = computed(() => data.value?.terms ?? [])
  const total = computed(() => data.value?.total ?? 0)
  // Le président en cours (end_date null)
  const current = computed(() => terms.value.find(t => t.end_date === null) ?? null)

  return { terms, total, current, loading: pending, error }
}
```

### `usePresidentDetail.ts`

```ts
export const usePresidentDetail = (slug: string | Ref<string>) => {
  const { data, pending, error } = useFetch(
    () => `/api/leader/presidents/${toValue(slug)}`,
    { key: () => `president-${toValue(slug)}` }
  )

  return {
    term: computed(() => data.value?.term ?? null),
    profile: computed(() => data.value?.profile ?? null),
    appointment: computed(() => data.value?.appointment ?? null),
    prev: computed(() => data.value?.prev ?? null),
    next: computed(() => data.value?.next ?? null),
    loading: pending,
    error,
  }
}
```

### `usePrimeMinisters.ts`

```ts
export const usePrimeMinisters = () => {
  const { data, pending, error } = useFetch('/api/leader/prime-ministers', {
    key: 'pm-list',
  })

  const terms = computed(() => data.value?.terms ?? [])
  const gaps = computed(() => data.value?.gaps ?? [])
  const total = computed(() => data.value?.total ?? 0)
  // PM en cours (end_date null dans son term)
  const current = computed(() => terms.value.find(t => t.end_date === null) ?? null)

  return { terms, gaps, total, current, loading: pending, error }
}
```

### `usePrimeMinisters.ts` — détail

```ts
export const usePrimeMinisterDetail = (slug: string | Ref<string>) => {
  const { data, pending, error } = useFetch(
    () => `/api/leader/prime-ministers/${toValue(slug)}`,
    { key: () => `pm-${toValue(slug)}` }
  )

  return {
    term: computed(() => data.value?.term ?? null),
    profile: computed(() => data.value?.profile ?? null),
    appointment: computed(() => data.value?.appointment ?? null),
    prev: computed(() => data.value?.prev ?? null),
    next: computed(() => data.value?.next ?? null),
    loading: pending,
    error,
  }
}
```

---

## Pages

### `app/pages/senegal/presidents.vue`

**URL** : `/senegal/presidents`

**Design** :
- Header : titre H1 « Présidents de la République du Sénégal », sous-titre « depuis l'indépendance en 1960 », stat globale (nombre de présidents — **calculé dynamiquement depuis les données**, jamais en dur)
- **Timeline verticale** (mobile-first) : chaque président = un bloc distinct avec :
  - Photo (`useCmsImage(photo)`, fallback initiales avec couleur dérivée du nom)
  - Nom complet (lien → `/senegal/presidents/[slug]`)
  - Dates du mandat formatées (ex. « avr. 1960 — déc. 1980 ») ou badge « En cours » si `end_date = null`
  - Durée calculée
  - Nombre de gouvernements formés + nombre de PMs distincts (stats issues de l'API)
  - Liste condensée des gouvernements (accordéon ou collapsible sur mobile pour les présidences longues)
- Skeleton loaders pendant `pending`
- État vide si données indisponibles
- **SEO** :
  - `useSeoMeta` : title = "Présidents du Sénégal depuis 1960 | Vie Publique Sénégal", description riche avec les noms des présidents et les dates
  - `useHead` avec canonical → `/senegal/presidents` (URL stable sans query params)
  - JSON-LD `ItemList` contenant un `ListItem` par présidence (avec `Person` imbriqué : `name`, `url`, `image`, `birthDate`)
  - Open Graph : `og:title`, `og:description`, `og:image` (photo du président en cours ou premier de la liste)
- Breadcrumb visuel + `BreadcrumbList` JSON-LD : Accueil → Sénégal → Présidents

### `app/pages/senegal/presidents/[slug].vue`

**URL** : `/senegal/presidents/senghor`, `/senegal/presidents/diouf`, etc.

**Design** :
- **Hero** : grande photo du président (LCP prioritaire — `fetchpriority="high"`, `loading="eager"`, dimensions explicites), nom en H1, dates du mandat, badge « En cours » ou durée calculée
- **Bloc "Résumé"** : afficher `short_bio` comme chapeau introductif juste sous le hero (texte brut, paragraphe `<p>`). Omis si `short_bio` est null — ne pas afficher de bloc vide.
- **Bloc biographique** : date et lieu de naissance, formation (`education`), liens sociaux (`website`, `twitter`, `facebook`, etc. — afficher uniquement les non-null)
- **Bloc "Biographie"** : si `long_bio` est non-null, afficher le contenu HTML riche dans un conteneur `prose prose-sm dark:prose-invert max-w-none` (Tailwind Typography) via `v-html` directement (HTML de confiance produit par l'éditeur Directus — pas de DOMPurify, comme les pages `personnalites`/`documents`/`actualites`). Ne pas afficher le bloc si `long_bio` est null.
- **Sections en accordéons** : les blocs « Biographie », « Gouvernements formés » et « Premiers ministres nommés » sont des accordéons `<details open class="group">` natifs (SSR-friendly, sans JS) avec compteur dans le `<summary>` (ex. « Gouvernements formés (3) ») et chevron `group-open:rotate-180`. Ouverts par défaut : dès le chargement, on voit quelles infos sont disponibles. Le « Résumé » (`short_bio`), le bloc naissance/formation et le « Décret d'investiture » restent des blocs simples non repliables.
- **Bloc "Décret d'investiture"** : si l'`appointment` existe avec `source_document`, afficher le titre du décret et un lien
- **Bloc "Gouvernements formés"** : liste de tous les gouvernements du mandat
  - Chaque ligne : nom du gouvernement (lien → `/gouvernement-senegal/[slug]`), dates, Premier ministre (lien → `/senegal/premiers-ministres/[slug]`) ou badge « Fonction abolie » si null
  - Durée de chaque gouvernement calculée
- **Bloc "Premiers ministres nommés"** : grille de cartes (photo + nom + période) pour les PMs distincts nommés pendant le mandat. Liens vers `/senegal/premiers-ministres/[slug]`
- **Navigation précédent/suivant** entre présidences (ordre chronologique), via les champs `prev`/`next` de l'API
- Skeleton loaders sur chaque bloc
- **SEO** :
  - `useSeoMeta` : title = `${full_name} — Président du Sénégal (${start_year}–${end_year ?? 'présent'}) | Vie Publique Sénégal`, description mentionnant dates, nombre de gouvernements, PMs
  - `useHead` avec canonical → `/senegal/presidents/[slug]` (**sans** query params)
  - JSON-LD `Person` :
    ```json
    {
      "@type": "Person",
      "name": "Léopold Sédar Senghor",
      "url": "https://vie-publique.sn/senegal/presidents/senghor",
      "image": "https://...",
      "birthDate": "1906-10-09",
      "birthPlace": { "@type": "Place", "name": "Joal, Sénégal" },
      "jobTitle": "Président de la République du Sénégal",
      "worksFor": { "@type": "GovernmentOrganization", "name": "République du Sénégal" }
    }
    ```
  - JSON-LD `BreadcrumbList` : Accueil → Sénégal → Présidents → [Nom du président]
  - Open Graph avec photo haute résolution
- Breadcrumb visuel : Accueil → Sénégal → Présidents → [Nom]

### `app/pages/senegal/premiers-ministres.vue`

**URL** : `/senegal/premiers-ministres`

**Design** :
- Header : titre H1 « Premiers ministres du Sénégal », stat globale (nombre de PMs distincts)
- **Note contextuelle** : signaler les périodes sans PM (1962–1970, 1983–1991, 2019–2022) de manière neutre et informative, en les intégrant dans la timeline comme des jalons distincts (issus des `gaps` de l'API)
- Timeline chronologique mêlant PMs et périodes de "présidence directe" :
  - PM = carte avec photo, nom, dates, président(s) sous qui il a servi, durée
  - Période sans PM = jallon sobre "Fonction de Premier ministre abolie" avec dates et président concerné
- Filtre par président (select construit dynamiquement depuis les données)
- Liens vers `/senegal/premiers-ministres/[slug]` et `/senegal/presidents/[slug]`
- **SEO** :
  - `useSeoMeta` + canonical `/senegal/premiers-ministres`
  - JSON-LD `ItemList` de `Person`
  - `BreadcrumbList`
- Breadcrumb : Accueil → Sénégal → Premiers ministres

### `app/pages/senegal/premiers-ministres/[slug].vue`

**URL** : `/senegal/premiers-ministres/sonko`, `/senegal/premiers-ministres/diouf`, etc.

**Design** :
- Hero : photo, nom en H1, dates de la fonction, durée
- **Bloc "Résumé"** : `short_bio` en chapeau juste sous le hero (texte brut). Omis si null.
- **Bloc biographique** : date et lieu de naissance, `education`, liens sociaux (non-null uniquement)
- **Bloc "Biographie"** : si `long_bio` non-null, rendu HTML dans `prose prose-sm dark:prose-invert` via `v-html` direct (pas de DOMPurify).
- **Sections en accordéons** : « Biographie », « Gouvernements dirigés » et « Président(s) sous qui il a servi » en `<details open>` avec compteur dans le `<summary>` et ouverts par défaut.
- **Bloc "Gouvernements dirigés"** : liste des gouvernements avec dates, président + lien
- **Bloc "Président(s) sous qui il a servi"** : si PM sous plusieurs présidents (ex. Habib Thiam), afficher une carte par président avec la période concernée
- Navigation précédent/suivant entre PMs (ordre chronologique de prise de fonction)
- **SEO** :
  - `useSeoMeta` : title = `${full_name} — Premier ministre du Sénégal (${year_start}–${year_end}) | Vie Publique Sénégal`
  - canonical → `/senegal/premiers-ministres/[slug]`
  - JSON-LD `Person` avec `jobTitle: "Premier ministre du Sénégal"` + `BreadcrumbList`

---

## SEO — Règles détaillées

### Titles & descriptions

| Page | Title pattern | Description pattern |
|---|---|---|
| Liste présidents | `Présidents du Sénégal depuis 1960 \| Vie Publique Sénégal` | `Découvrez l'historique des ${n} présidents de la République du Sénégal depuis l'indépendance en 1960 : mandats, gouvernements et Premiers ministres.` |
| Détail président | `${full_name} — Président du Sénégal (${start}–${end}) \| Vie Publique Sénégal` | `short_bio` si non-null (tronqué à 160 car.) ; sinon fallback généré : `${full_name} a dirigé le Sénégal de ${start} à ${end}. Il a formé ${n} gouvernements avec ${pm_count} Premiers ministres.` |
| Liste PMs | `Premiers ministres du Sénégal depuis 1960 \| Vie Publique Sénégal` | `Liste complète des ${n} Premiers ministres du Sénégal depuis 1960 avec leurs mandats, périodes d'exercice et présidents tutélaires.` |
| Détail PM | `${full_name} — Premier ministre du Sénégal (${start}–${end}) \| Vie Publique Sénégal` | `short_bio` si non-null (tronqué à 160 car.) ; sinon fallback généré : dates + Président(s) + nombre de gouvernements |

> **Priorité description SEO** : `short_bio` (contenu éditeur) > description générée dynamiquement. Le fallback garantit qu'aucune page n'a de `<meta description>` vide.

> Titles et descriptions sont **générés dynamiquement** depuis les données de l'API — jamais écrits en dur.

### Canonical

- Listes : canonical = URL de base sans query params (le filtre `?president=` ne crée pas de duplicate)
- Détails : canonical = `/senegal/presidents/[slug]` ou `/senegal/premiers-ministres/[slug]`

### Schema.org

**Page liste présidents** :
```json
{
  "@type": "ItemList",
  "name": "Présidents du Sénégal",
  "numberOfItems": 5,
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "Person",
        "name": "Léopold Sédar Senghor",
        "url": "https://vie-publique.sn/senegal/presidents/senghor",
        "image": "https://...",
        "birthDate": "1906-10-09"
      }
    }
  ]
}
```

**Page détail président** :
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://vie-publique.sn/senegal/presidents/senghor#person",
      "name": "Léopold Sédar Senghor",
      "url": "https://vie-publique.sn/senegal/presidents/senghor",
      "image": "https://...",
      "birthDate": "1906-10-09",
      "birthPlace": { "@type": "Place", "name": "Joal, Sénégal" },
      "jobTitle": "Président de la République du Sénégal",
      "description": "<valeur de short_bio si non-null — omis sinon>",
      "worksFor": {
        "@type": "GovernmentOrganization",
        "@id": "https://vie-publique.sn#senegal",
        "name": "République du Sénégal"
      },
      "sameAs": ["https://fr.wikipedia.org/wiki/Léopold_Sédar_Senghor"]
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://vie-publique.sn" },
        { "@type": "ListItem", "position": 2, "name": "Sénégal", "item": "https://vie-publique.sn/senegal" },
        { "@type": "ListItem", "position": 3, "name": "Présidents", "item": "https://vie-publique.sn/senegal/presidents" },
        { "@type": "ListItem", "position": 4, "name": "Léopold Sédar Senghor" }
      ]
    }
  ]
}
```

> Le champ `sameAs` est inclus si un lien Wikipedia ou site officiel est disponible (depuis `public_persons.website`). Ne jamais générer une URL Wikipedia de toutes pièces : utiliser uniquement la valeur du champ CMS si elle existe.
> Le champ `description` du JSON-LD est alimenté par `short_bio` si non-null ; omis sinon (ne pas insérer une chaîne vide).

---

## Performance

### Images (LCP critique)
- Photo du président/PM en hero : attributs `fetchpriority="high"` + `loading="eager"` + dimensions explicites (`width`/`height`) pour éviter le CLS
- Photos dans les listes (thumbnails) : `loading="lazy"` + dimensions fixes
- Utiliser `useCmsImage(photo)` avec les transformations Directus (`?width=400&quality=80&format=webp`)
- Fallback : initiales générées en CSS (aucune requête réseau)

### Cache API
| Endpoint | TTL dev | TTL prod | Stratégie |
|---|---|---|---|
| `/api/leader/presidents` | 0 | 2h | Données très stables |
| `/api/leader/presidents/[slug]` | 0 | 1h | Peut changer si PM actuel évolue |
| `/api/leader/prime-ministers` | 0 | 2h | Stable |
| `/api/leader/prime-ministers/[slug]` | 0 | 1h | Stable |

```ts
// Exemple
export default defineCachedEventHandler(async (event) => {
  // ...
}, {
  maxAge: process.env.NODE_ENV === 'production' ? 60 * 60 * 2 : 0,
  name: 'leader-presidents',
})
```

### Préchargement
- Sur la page liste des présidents, utiliser `<NuxtLink prefetch>` pour précharger les pages détail au survol (desktop) ou à l'entrée dans le viewport (mobile)
- Navigation précédent/suivant : précharger les deux voisins avec `useLazyFetch` dès le montage

### Bundle
- Les pages de détail ne chargent les blocs (gouvernements, PMs nommés) que si les données sont disponibles — pas de composant inutile rendu à vide
- Pas de dépendance inutile : utiliser les helpers natifs (`Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`) plutôt que des librairies date tierces

---

## Sécurité

### Validation des paramètres de route
Toujours valider le slug **côté serveur** avant d'interroger Directus :
```ts
// Dans chaque handler [slug].get.ts
const slug = getRouterParam(event, 'slug')
if (!slug || !/^[a-z0-9-]{1,100}$/.test(slug)) {
  throw createError({ statusCode: 400, message: 'Slug invalide' })
}
```
Ceci prévient les tentatives d'injection ou de fuzzing de l'API Directus.

### Pas d'exposition de données sensibles
- Ne retourner que les champs explicitement listés dans `fields` (never `'*'`)
- Les champs internes Directus (`user_created`, `date_created`, etc.) ne doivent pas être inclus dans les réponses API

### Headers de sécurité
S'assurer que le module `nuxt-security` (ou la config Nitro) applique :
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Rendu du HTML riche (`long_bio`)
`long_bio` est édité via le WYSIWYG Directus. Il provient d'éditeurs internes de confiance et se rend directement via `v-html`, à l'identique des pages existantes (`personnalites`, `documents`, `actualites`, `etat-senegal`) — **le projet n'utilise pas DOMPurify**.
```vue
<!-- eslint-disable-next-line vue/no-v-html -->
<div v-if="profile.long_bio" class="prose prose-sm dark:prose-invert max-w-none" v-html="profile.long_bio" />
```
> Sécurité assurée en amont : seuls des éditeurs authentifiés alimentent le CMS. Si une sanitisation devient nécessaire, l'introduire d'abord de façon transverse au projet, pas seulement sur ces pages.

### Liens sortants (réseaux sociaux)
Les champs `website`, `twitter`, `facebook` etc. de `public_persons` sont rendus avec `rel="noopener noreferrer nofollow"` et le protocole vérifié (`https://`) avant affichage :
```ts
const isSafeUrl = (url: string | null): boolean =>
  !!url && /^https?:\/\//.test(url) && url.length < 2048
```

---

## Cas particuliers

| Cas | Traitement |
|---|---|
| PM `null` dans un gouvernement | Afficher "Présidence directe" (gris/italique) dans la timeline |
| Abdou Diouf : PM puis Président | Deux entrées séparées dans `/api/leader/prime-ministers` (terme PM) et `/api/leader/presidents` (terme Présidentiel) — le slug est le même mais les pages sont distinctes |
| Président en cours (`end_date = null`) | Badge "En cours" vert, `end_date` omis des titles/descriptions (ne pas indiquer "(2024–null)") |
| Aucune photo disponible | Afficher un avatar avec les initiales générées en CSS (pas d'image 404) |
| Navigation prev/next au bord | `prev = null` pour le premier président (Senghor), `next = null` pour le président en cours |
| Page détail slug introuvable | `createError({ statusCode: 404 })` → Nuxt gère la page 404 |

---

## Conventions du projet

| Aspect | Convention |
|---|---|
| Fetch SSR | `useFetch` dans les composables/pages — jamais `$fetch` direct dans les pages |
| Cache API | `defineCachedEventHandler` avec `maxAge` conditionnel (dev=0 / prod=TTL) |
| Client CMS | `getCmsClient()` + `readItems` / `readItem` / `readField` du SDK Directus |
| Images | `useCmsImage(photo)` avec transformations ; `fetchpriority="high"` sur le LCP |
| Types | Tout typer en TypeScript, `string` pour les enums dynamiques CMS, `never any` |
| Dates | `new Intl.DateTimeFormat('fr-SN', { year: 'numeric', month: 'short' }).format(new Date(date))` |
| Durées | Calculer en jours : `Math.floor((Date.parse(end ?? new Date().toISOString()) - Date.parse(start)) / 86400000)` |
| Erreurs API | `createError({ statusCode, message })` dans les handlers |
| SEO | `useSeoMeta()` + `useHead()` dans chaque page |
| Skeleton | `USkeleton` (Nuxt UI) pendant `pending` sur chaque bloc indépendamment |
| Dark mode | Toutes les classes Tailwind avec variante `dark:` |
| Mobile-first | Breakpoints `sm:`, `md:`, `lg:` dans cet ordre |
| Liens sortants | `rel="noopener noreferrer nofollow"` + validation URL côté rendu |
| Slugs manquants | `generateSlugFromName(full_name)` comme fallback |

---

## Patterns de référence dans le codebase

| Besoin | Fichier de référence |
|---|---|
| Page liste avec timeline | `app/pages/gouvernement-senegal/historique.vue` |
| Page détail avec blocs | `app/pages/gouvernement-senegal/[slug].vue` |
| API route avec cache | `server/api/government/current.get.ts` |
| Composable useFetch | `app/composables/useGovernment.ts` |
| Photo avec fallback initiales | `app/components/Assembly/` |
| Skeleton loader | Voir `docs/SKELETON-LOADERS.md` |
| Validation slug | Voir les handlers existants sous `server/api/` |

---

## Ordre d'implémentation suggéré

1. `types/leader-history.ts`
2. `server/api/leader/presidents.get.ts`
3. `server/api/leader/presidents/[slug].get.ts`
4. `server/api/leader/prime-ministers.get.ts`
5. `server/api/leader/prime-ministers/[slug].get.ts`
6. `app/composables/usePresidents.ts` + `usePresidentDetail.ts`
7. `app/composables/usePrimeMinisters.ts` + `usePrimeMinisterDetail.ts`
8. `app/pages/senegal/presidents.vue` (liste)
9. `app/pages/senegal/presidents/[slug].vue` (détail)
10. `app/pages/senegal/premiers-ministres.vue` (liste)
11. `app/pages/senegal/premiers-ministres/[slug].vue` (détail)
12. Vérification SEO : `lighthouse --only-categories=seo` sur chaque page
13. Vérification `BreadcrumbList` + `Person` dans Google Rich Results Test
