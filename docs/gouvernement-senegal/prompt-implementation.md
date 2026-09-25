# Prompt — Intégration frontend : Historique des gouvernements sénégalais

## Contexte

Le projet **Vie Publique Sénégal** (`vpsn/`) est une application Nuxt 4 (Vue 3, SSR, Nuxt UI, Tailwind CSS).

Le CMS Directus structure désormais l'historique complet des gouvernements depuis 1960 autour des collections suivantes :

| Collection | Rôle |
|---|---|
| `governments` | Un gouvernement = une période entre deux remaniements majeurs (ex : "Gouvernement Sonko I") |
| `public_person_appointments` | Une nomination = une personne occupant un poste, avec ses dates précises. C'est **cette** collection qui sert désormais à lister les membres d'un gouvernement (champ `government`). |
| `public_persons` | Annuaire des personnalités (président, PM, ministres, etc.) |
| `documents` | Décrets, journaux officiels, lois… servant de sources (`pm_appointment_decree`, `formation_decree`, `source_document`) |

> Les membres d'un gouvernement sont des `public_person_appointments` filtrés par `government`. Le rôle n'est plus un champ `role` mais `position_category_slug` (+ libellé `position_category`). La date de prise de fonction est `appointment_date` (et non `start_date`).

La page existante `/gouvernement-senegal` affiche déjà le **gouvernement actuel** via `public_persons.current_appointment`. Cette intégration ne doit **pas casser** cette page.

---

## Collections Directus

### `governments`

Champs réels de la collection :

```
id              integer (PK)
status          enum  published | draft | archived
sort            integer
name            string (requis)        ex: "Gouvernement Sonko I"
slug            string (unique, requis) ex: "sonko-i"
start_date      date   (requis)        date de nomination officielle
end_date        date   (nullable)      null = gouvernement en cours
president              M2O → public_persons (requis)
prime_minister        M2O → public_persons (nullable)
pm_appointment_decree M2O → documents (nullable)        décret nommant le PM
formation_decree      M2O → documents (nullable)        décret de composition du gouvernement
notes           text   (nullable)      contexte historique
```

Exemple de requête Directus SDK :
```ts
readItems('governments', {
  fields: ['id', 'name', 'slug', 'start_date', 'end_date', 'notes',
           'president.id', 'president.full_name', 'president.slug', 'president.photo',
           'prime_minister.id', 'prime_minister.full_name', 'prime_minister.slug', 'prime_minister.photo',
           'pm_appointment_decree.id', 'pm_appointment_decree.title', 'pm_appointment_decree.slug',
           'formation_decree.id', 'formation_decree.title', 'formation_decree.slug'],
  filter: { status: { _eq: 'published' } },
  sort: ['-start_date'],
  limit: -1,
})
```

### `public_person_appointments` (= les membres d'un gouvernement)

Une ligne = une personne occupant un poste sur une période. Pour obtenir les membres d'un gouvernement, on filtre sur `government`.

```
id                   integer (PK)
status               enum  published | draft | archived
position_title       text   (requis)   intitulé exact du portefeuille (ex: "Ministre des Finances et du Budget")
organization_label   text   (requis)   libellé de l'organisation / ministère
position_category      enum (requis)   libellé lisible du rôle (valeurs gérées dans Directus)
position_category_slug enum (requis)   slug du rôle → sert au regroupement et au filtrage
person               M2O → public_persons (requis)
government           M2O → governments (nullable)   null = poste de carrière hors gouvernement
appointment_date     datetime (requis)
end_date             datetime (nullable)
end_reason           enum (nullable) valeurs gérées dans Directus (retirement, dismissed, …)
is_current           boolean (requis)
predecessor_label    string (nullable)
successor_label      string (nullable)
source_label         string (nullable)
source_document      M2O → documents (nullable)
source_excerpt       text   (nullable)
end_source_label     string (nullable)
end_source_document  M2O → documents (nullable)
end_source_excerpt   text   (nullable)
notes                text   (nullable)
```

> ⚠️ **Catégories dynamiques — ne jamais coder en dur.** Les valeurs de `position_category` / `position_category_slug` (et `end_reason`) sont des listes de choix gérées dans Directus et peuvent évoluer (ajout/suppression de catégories). Le frontend ne doit **pas** figer ces listes : il les récupère soit depuis la métadonnée du champ Directus (`readFieldsByCollection`), soit en les dérivant des données elles-mêmes. Si une nouvelle catégorie est ajoutée côté CMS, l'UI doit l'afficher **sans modification de code**.

Exemple pour les membres d'un gouvernement :
```ts
readItems('public_person_appointments', {
  fields: ['id', 'position_title', 'organization_label',
           'position_category', 'position_category_slug',
           'appointment_date', 'end_date', 'end_reason', 'is_current',
           'predecessor_label', 'successor_label', 'source_label',
           'person.id', 'person.full_name', 'person.slug', 'person.photo', 'person.sexe'],
  filter: {
    status: { _eq: 'published' },
    government: { slug: { _eq: slug } },
    // Exclure le président et le PM : ils sont déjà rendus depuis
    // government.president / government.prime_minister. Exclusion exprimée
    // par les slugs "déjà rendus ailleurs", PAS par une whitelist des rôles à garder.
    position_category_slug: { _nin: ['presidence', 'premier_ministre'] },
  },
  sort: ['position_category_slug', 'person.full_name'],
  limit: -1,
})
```

> ❓ **« Si je ne précise pas les catégories, est-ce que je récupère TOUTES les catégories de la base ? »**
> Non. Le périmètre des membres est défini par la relation **`government`**, pas par la catégorie. Le `filter.government` ne ramène **que** les nominations rattachées à ce gouvernement ; `position_category_slug` ne fait que **regrouper/ordonner** ces résultats déjà filtrés. Les nominations hors gouvernement ont `government = null` et ne remontent donc jamais.
> La seule exclusion utile est `presidence` / `premier_ministre` (pour éviter d'afficher deux fois le président et le PM). On l'exprime en **retirant les rôles déjà affichés ailleurs** (`_nin`), et non en listant les rôles à conserver — ainsi, toute **nouvelle catégorie** de membre (ex. un futur « haut-commissaire ») remonte automatiquement, sans modification de code.

**Récupérer dynamiquement l'ordre + les libellés des catégories** (pour ordonner les groupes et alimenter les filtres) via la métadonnée du champ Directus :
```ts
// renvoie les choix du dropdown `position_category_slug` dans l'ordre défini au CMS
const field = await client.request(readField('public_person_appointments', 'position_category_slug'))
const choices = field.meta?.options?.choices ?? [] // [{ text, value }, …]
// → sert à : ordonner les sections, construire le menu de filtre par rôle, mapper slug → libellé
```

### `public_persons` (extrait des champs utiles)

```
id, status, full_name (requis), slug (requis), sexe (enum: male | female),
photo (file, nullable), birthdate, birthplace,
current_appointment M2O → public_person_appointments
```

> ⚠️ `sexe` vaut `male` ou `female` (et non `M` / `F`). Pour compter les femmes : `sexe === 'female'`.
> `photo` est un identifiant de fichier Directus → utiliser `useCmsImage(photo)`.

### `documents` (extrait des champs utiles)

```
id, status, type (enum: decree | law | official_journal | …),
title, slug, publish_date, file
```

Sert de source aux nominations (`source_document`, `end_source_document`) et aux décrets du gouvernement (`pm_appointment_decree`, `formation_decree`).

---

## Ce qui existe déjà (NE PAS MODIFIER)

- `app/pages/gouvernement-senegal/index.vue` — page gouvernement actuel
- `server/api/government/current.get.ts` — API endpoint existant
- `app/composables/useGovernment.ts` — composable existant
- `types/government-member.ts` — type `GovernmentMember` existant

---

## Ce qu'il faut créer

### 1. Types TypeScript — `types/government.ts`

```ts
export type GovernmentDecree = {
  id: number
  title: string
  slug: string | null
} | null

export type Government = {
  id: number
  name: string
  slug: string
  start_date: string
  end_date: string | null
  president: { id: number; full_name: string; slug: string; photo: string | null } | null
  prime_minister: { id: number; full_name: string; slug: string; photo: string | null } | null
  pm_appointment_decree: GovernmentDecree
  formation_decree: GovernmentDecree
  notes: string | null
}

// Le rôle (position_category_slug) et end_reason sont des listes de choix
// gérées dans Directus : on les type en `string` pour ne PAS figer les valeurs.
// Toute nouvelle catégorie ajoutée au CMS doit fonctionner sans changement de code.
export type GovernmentMemberFull = {
  id: number
  position_title: string
  organization_label: string
  position_category: string        // libellé lisible (vient de la donnée)
  position_category_slug: string   // slug machine (liste dynamique côté CMS)
  appointment_date: string
  end_date: string | null
  end_reason: string | null        // liste dynamique côté CMS
  is_current: boolean
  person: {
    id: number
    full_name: string
    slug: string | null
    photo: string | null
    sexe: 'male' | 'female' | null
  }
}

// Catégorie de rôle telle que servie par l'API (dérivée dynamiquement)
export type GovernmentRoleGroup = {
  slug: string      // position_category_slug
  label: string     // position_category
  members: GovernmentMemberFull[]
}
```

---

### 2. Endpoints API — `server/api/government/`

#### `history.get.ts` — Liste de tous les gouvernements

```
GET /api/government/history?q=&president=
```

**Query params (optionnels, repris depuis l'URL) :**

| Param | Rôle |
|---|---|
| `q` | recherche sur le nom du gouvernement et/ou le nom du Premier Ministre |
| `president` | filtre par slug de président (dynamique — dérivé des données, pas une liste figée) |

Retourne la liste des gouvernements triés du plus récent au plus ancien avec stats de base (nb membres, nb femmes, calculés depuis `public_person_appointments`). Le volume étant limité (~46), **pas de pagination serveur** ici ; le filtrage/recherche se fait via `q`/`president`. Utiliser `defineCachedEventHandler` avec TTL pas de cache en dev 1h en production. La clé de cache **doit inclure** `q` et `president`.

Réponse :
```ts
{
  governments: Array<Government & { stats: { total: number; women: number } }>
  // Présidences présentes, dérivées dynamiquement (pour les onglets/filtre)
  presidents: Array<{ slug: string; full_name: string; count: number }>
}
```

> Le `total` et `women` se dérivent en comptant les `public_person_appointments` du gouvernement (`women` = membres dont `person.sexe === 'female'`). La liste des présidences (`presidents`) est **calculée à partir des données**, jamais codée en dur.

#### `[slug].get.ts` — Détail d'un gouvernement

```
GET /api/government/:slug?q=&role=&page=&pageSize=
```

**Query params (tous optionnels, repris depuis l'URL) :**

| Param | Rôle |
|---|---|
| `q` | recherche plein texte sur le **nom du membre** (`person.full_name`) **et/ou** l'**intitulé de la fonction** (`position_title`) — insensible à la casse/accents |
| `role` | filtre par `position_category_slug` (valeur **dynamique**, jamais codée en dur) |
| `page` / `pageSize` | pagination de la liste de membres (n'activer que si `total` dépasse un seuil, ex. 60) |

Retourne le gouvernement + ses membres (`public_person_appointments`) **groupés dynamiquement** par `position_category_slug`. L'ordre des groupes suit l'ordre des choix du champ Directus (récupéré via `readField`), **aucune catégorie n'est codée en dur**. Utiliser `defineCachedEventHandler` avec TTL pas de cache en dev 30min en production. La clé de cache **doit inclure** `q`, `role`, `page`, `pageSize`.

Réponse :
```ts
{
  government: Government
  // Groupes dérivés des données + ordonnés via la métadonnée Directus.
  // Si une nouvelle catégorie apparaît côté CMS, elle remonte ici sans changement de code.
  groups: GovernmentRoleGroup[]   // [{ slug, label, members }]
  // Liste des catégories présentes (pour construire le filtre `role` côté UI)
  roles: Array<{ slug: string; label: string; count: number }>
  pagination: { page: number; pageSize: number; total: number }
  stats: {
    total: number
    women: number   // person.sexe === 'female'
    men: number     // person.sexe === 'male'
    duration_days: number
  }
}
```

> Le président et le Premier Ministre proviennent du gouvernement lui-même (`government.president`, `government.prime_minister`), pas de la liste des membres.
> La recherche `q` et le filtre `role` s'appliquent côté serveur (via `filter` Directus) pour rester SSR-friendly et indexables ; en complément, l'UI peut affiner côté client sans nouvel appel.

#### `categories.get.ts` — Liste dynamique des rôles (optionnel mais recommandé)

```
GET /api/government/categories
```

Retourne les choix du champ `position_category_slug` dans l'ordre défini au CMS, pour alimenter les menus de filtre **sans liste codée en dur**. Cache long (24h) car la métadonnée change rarement.

```ts
{ categories: Array<{ slug: string; label: string }> }
```

---

### 3. Composables — `app/composables/`

#### `useGovernmentHistory.ts`

Lie les filtres aux **query params** (`useRoute`/`useRouter`) pour des URLs partageables et indexables.

```ts
export const useGovernmentHistory = () => {
  const route = useRoute()
  // état synchronisé avec l'URL : ?q=&president=
  const q = computed(() => (route.query.q as string) ?? '')
  const president = computed(() => (route.query.president as string) ?? '')

  const { data, pending, error } = useFetch('/api/government/history', {
    key: () => `government-history-${q.value}-${president.value}`,
    query: { q, president }, // réactif : refetch SSR-friendly au changement d'URL
  })
  // Regroupement par présidence dérivé dynamiquement de `data.presidents` (jamais codé en dur)
  const byPresidency = computed(() => { /* group data.governments par president.slug */ })
  return { governments, presidents, byPresidency, q, president, loading: pending, error }
}
```

#### `useGovernmentDetail.ts`

```ts
export const useGovernmentDetail = (slug: string | Ref<string>) => {
  const route = useRoute()
  // recherche membre (nom + intitulé de fonction) et filtre rôle, via query params
  const q = computed(() => (route.query.q as string) ?? '')
  const role = computed(() => (route.query.role as string) ?? '')
  const page = computed(() => Number(route.query.page ?? 1))

  const { data, pending, error } = useFetch(() => `/api/government/${toValue(slug)}`, {
    key: () => `government-${toValue(slug)}-${q.value}-${role.value}-${page.value}`,
    query: { q, role, page },
  })
  return { government, groups, roles, stats, pagination, q, role, page, loading: pending, error }
}
```

---

### 4. Pages

#### `app/pages/gouvernement-senegal/historique.vue`

Page liste de tous les gouvernements avec timeline visuelle.

**URL** : `/gouvernement-senegal/historique`

**Design** :
- Header sticky avec titre + stats globales (nombre de gouvernements et de présidences — **calculés dynamiquement**, jamais en dur)
- **Barre de recherche** (nom du gouvernement ou du PM) liée au query param `?q=` (debounce ~300ms, met à jour l'URL via `router.replace`)
- **Filtre par présidence** (onglets ou select) construit à partir de `presidents` renvoyé par l'API, lié au query param `?president=` — aucune liste de présidents codée en dur
- État “aucun résultat” clair quand la recherche ne renvoie rien
- Chaque gouvernement = une carte avec :
  - Nom du gouvernement
  - Dates (format "janv. 1963 — mars 1968" ou "depuis mars 2024" si en cours)
  - Durée calculée
  - Nom du Premier Ministre (ou "Présidence directe" si null)
  - Badge "En cours" si `end_date` null
- Lien cliquable vers la page détail `/gouvernement-senegal/[slug]`
- **Pagination** : non requise (~46 items) ; si la liste filtrée devient longue, prévoir un “voir plus” progressif plutôt qu'une pagination numérotée
- **SEO** :
  - `useSeoMeta` (title/description reflétant le filtre actif si pertinent) + `useHead` avec **canonical** pointant vers l'URL **sans** les query params de recherche (éviter le contenu dupliqué)
  - JSON-LD schema.org `ItemList` listant les gouvernements
  - Les query params `q`/`president` restent indexables côté SSR mais la canonical prévient la duplication
- Breadcrumb : Accueil → Annuaires → Gouvernement → Historique (+ `BreadcrumbList` JSON-LD)

#### `app/pages/gouvernement-senegal/[slug].vue`

Page détail d'un gouvernement.

**URL** : `/gouvernement-senegal/sonko-i`, `/gouvernement-senegal/senghor-iii`, etc.

**Design** :
- Header avec nom du gouvernement + badge "En cours" ou dates
- Bloc info : Président, Premier Ministre, durée, période, et liens vers les décrets (`pm_appointment_decree`, `formation_decree`) s'ils existent
- **Barre de recherche de membre** liée au query param `?q=` : filtre par **nom** (`person.full_name`) **et/ou intitulé de la fonction** (`position_title`), insensible casse/accents, avec debounce et mise à jour de l'URL (`router.replace`)
- **Filtre par rôle** lié au query param `?role=` : options construites depuis `roles` renvoyé par l'API (libellé + count) — **aucune catégorie codée en dur**, toute nouvelle catégorie CMS apparaît automatiquement
- **Sections par rôle rendues dynamiquement** en itérant sur `groups` (ordre fourni par l'API). Pour chaque groupe : titre = `group.label`, contenu = `group.members`. Ne pas écrire en dur “Ministres d'État / Ministres / …” : ce sont les groupes renvoyés qui décident
- Chaque membre = carte avec photo (`useCmsImage(person.photo)`, fallback initiales), `person.full_name`, `position_title`, lien `/personnalites/[id]/[slug]`
- **Pagination** : la liste d'un gouvernement est généralement courte → pas de pagination par défaut. Si `pagination.total` dépasse le seuil (ex. 60) ou si un rôle contient beaucoup de membres, activer la pagination via `?page=` (canonical sur page 1)
- État “aucun membre ne correspond” quand la recherche/filtre ne renvoie rien
- Si les données membres ne sont pas encore importées : afficher un placeholder "Données en cours d'intégration"
- Navigation précédent/suivant entre gouvernements (ordre chronologique)
- **SEO** :
  - `useSeoMeta` (title = nom du gouvernement, description = président/PM/période) + `useHead`
  - **Canonical** vers `/gouvernement-senegal/[slug]` **sans** les query params `q`/`role`/`page` (le contenu filtré ne doit pas créer d'URL dupliquées indexées)
  - JSON-LD schema.org `GovernmentOrganization` + `BreadcrumbList`
- Breadcrumb : Accueil → Annuaires → Gouvernement → [Nom du gouvernement]

---

### 5. Mise à jour de la page existante

Dans `app/pages/gouvernement-senegal/index.vue`, ajouter sous les membres actuels :

```vue
<!-- Lien vers l'historique -->
<NuxtLink to="/gouvernement-senegal/historique" class="...">
  Voir l'historique des gouvernements depuis 1960
</NuxtLink>
```

---

## Conventions du projet à respecter

- **Fetch** : toujours `useFetch` (SSR) dans les pages/composables, jamais `$fetch` direct
- **Cache** : `defineCachedEventHandler` dans les API routes avec `maxAge`
- **CMS Client** : utiliser `getCmsClient()` + `readItems` du SDK Directus (pas de fetch brut)
- **Images** : utiliser `useCmsImage(photo)` pour les URLs des photos
- **Types** : tout typer avec TypeScript, pas de `any`
- **Slug** : utiliser le helper `generateSlugFromName` si slug absent
- **Erreurs** : `createError({ statusCode, message })` dans les API routes
- **SEO** : `useSeoMeta()` + `useHead()` dans chaque page
- **Skeleton loaders** : afficher des squelettes pendant `pending === true`
- **Dark mode** : toutes les classes Tailwind doivent avoir leur variante `dark:`
- **Mobile-first** : breakpoints `sm:`, `md:`, `lg:` dans cet ordre

---

## Patterns de référence dans le codebase

| Besoin | Fichier de référence |
|---|---|
| Page liste avec tabs | `app/pages/assemblee-nationale/` |
| Page détail avec membres | `app/pages/gouvernement-senegal/index.vue` |
| API route avec cache | `server/api/government/current.get.ts` |
| Composable fetch | `app/composables/useGovernment.ts` |
| Affichage photo CMS | `app/components/Assembly/` |
| Skeleton loader | Voir `docs/SKELETON-LOADERS.md` |

---

## Ordre d'implémentation suggéré

1. `types/government.ts`
2. `server/api/government/history.get.ts`
3. `server/api/government/[slug].get.ts`
4. `server/api/government/categories.get.ts` (rôles dynamiques)
5. `app/composables/useGovernmentHistory.ts`
6. `app/composables/useGovernmentDetail.ts`
7. `app/pages/gouvernement-senegal/historique.vue`
8. `app/pages/gouvernement-senegal/[slug].vue`
9. Ajout du lien dans `index.vue`

---

## Notes importantes

- Les nominations (`public_person_appointments`) sont en cours d'import pour les gouvernements récents (post-2000). Pour les gouvernements plus anciens, les membres ne sont pas encore disponibles → gérer ce cas dans le frontend avec un message clair ("Données en cours d'intégration").
- Le champ `prime_minister` de `governments` peut être `null` pour les périodes sans PM (1962-1970, 1983-1991, 2019-2022 via présidence directe).
- Le slug de chaque gouvernement suit le pattern `[nom-pm]-[numéro-romain]` (ex: `sonko-i`, `senghor-iii`) ou `[nom-pm]` si unique (ex: `loum`, `boye`).
- Les gouvernements sont triés `start_date DESC` (plus récent en premier) dans l'API.
- Le rôle d'un membre est `position_category_slug` (slug machine) avec le libellé lisible `position_category`. **Ces valeurs sont gérées dans Directus et peuvent changer** : ne jamais coder en dur la liste des catégories ni l'ensemble à afficher. Le périmètre des membres est défini par la relation `government` (filtre `government.slug`), pas par la catégorie : on récupère donc exactement les nominations de ce gouvernement, sans risque de ramener « toutes les catégories » (les nominations hors gouvernement ont `government = null`). La seule exclusion à prévoir est `presidence` / `premier_ministre` via `_nin` (déjà affichés depuis `government.president` / `government.prime_minister`) — exprimée comme « rôles déjà rendus ailleurs », jamais comme une whitelist des rôles à garder.
- La date de prise de fonction d'un membre est `appointment_date` (et `end_date` pour la fin). `is_current = true` indique une nomination encore active.
- `person.sexe` vaut `male` / `female` — utiliser `female` pour le calcul de la parité.
- Les champs de traçabilité (`source_label`, `source_document`, `source_excerpt`, `end_source_*`) peuvent être affichés en pied de carte ou en infobulle pour sourcer la nomination.

---

## Recherche, filtres & URL (query params)

Toute recherche ou filtre **doit transiter par les query params** (pas d'état local uniquement), afin que les URLs soient partageables, navigables (back/forward) et rendues côté SSR.

| Page | Param | Effet |
|---|---|---|
| Historique | `?q=` | recherche nom du gouvernement / du PM |
| Historique | `?president=` | filtre par présidence (slug dynamique) |
| Détail | `?q=` | recherche membre par **nom** et/ou **intitulé de fonction** |
| Détail | `?role=` | filtre par catégorie de rôle (slug dynamique) |

Règles :
- Mettre à jour l'URL avec `router.replace` (pas `push`) pour la frappe au clavier → évite de polluer l'historique ; `push` pour un changement d'onglet/filtre volontaire.
- **Fetch unique + filtrage côté client** : chaque composable charge la liste complète une seule fois (clé de cache stable, sans `q`/`role`/`president`), puis filtre via des `computed`. → résultats instantanés au fur et à mesure de la frappe, **sans skeleton ni perte de focus** sur l'input. L'URL reste synchronisée pour des liens partageables, sans déclencher de nouvel appel.
- Les listes de filtres (présidents, rôles) sont **toujours dérivées des données/CMS**, jamais codées en dur.
- **Pas de pagination** sur le détail : tous les membres sont renvoyés, le filtre est client-side.

## SEO

- `useSeoMeta` + `useHead` sur chaque page (title, description, og:*).
- **Canonical** pointant vers l'URL **sans** les query params de recherche/filtre/pagination (ou vers `page=1`), pour éviter le contenu dupliqué.
- JSON-LD : `ItemList` (historique), `GovernmentOrganization` (détail), `BreadcrumbList` partout.
- Liens internes vers `/personnalites/[id]/[slug]` et entre gouvernements (précédent/suivant) pour le maillage.

## UI/UX & accessibilité

- Skeleton loaders pendant `pending` **uniquement au premier chargement** (jamais pendant la recherche), états vides explicites (“aucun résultat”), états d'erreur gérés.
- Champs de recherche avec `<label>` / `aria-label`, focus visible, support clavier.
- Mobile-first, dark mode sur toutes les classes, contrastes suffisants.
- Indiquer le nombre de résultats et le(s) filtre(s) actif(s) (chips effaçables).

## Mise à jour — Historique en accordéon, recherche instantanée, liens

Correctifs appliqués (3ᵉ itération) :

1. **Recherche instantanée, sans perte de focus** : les composables `useGovernmentHistory` et `useGovernmentDetail` font un **fetch unique** (clé stable) puis filtrent côté client via `computed`. Plus de skeleton ni de refetch pendant la frappe sur `historique.vue` et `[slug].vue`.
2. **Accordéon par présidence** (`historique.vue`) : les gouvernements sont regroupés par présidence ; au chargement seule la **présidence en cours** est dépliée ; **une seule** ouverte à la fois ; la **photo du président** est affichée dans l'en-tête.
3. **Erreur d'hydratation NuxtLink corrigée** : la carte gouvernement n'est plus un `NuxtLink` enveloppant d'autres `NuxtLink` (anchors imbriqués). Le titre et les décrets sont des liens distincts.
4. **Liens** : sur `[slug].vue`, président et PM sont cliquables → `/personnalites/[id]/[slug]` ; les décrets → `/documents/[id]/[slug]` (le `DecreeRef` inclut désormais `id`).
5. **Header** : sur `[slug].vue`, nom du gouvernement + période en en-tête sticky, même style que `historique.vue`.
