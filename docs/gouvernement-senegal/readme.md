# Feature « Historique des gouvernements »

Pages de référence sur l'ensemble des gouvernements du Sénégal depuis l'indépendance en 1960.
Chaque gouvernement dispose de sa propre fiche détaillée (composition complète, décrets, stats)
et la page historique regroupe tous les gouvernements avec un filtre par présidence et une
recherche textuelle.

- **Historique** : `/gouvernement-senegal/historique`
- **Détail** : `/gouvernement-senegal/<slug>` (ex. `/gouvernement-senegal/sonko-i`)
- **Gouvernement actuel** : `/gouvernement-senegal` _(page existante, non modifiée)_

Objectif : devenir **la page de référence** (n°1 Google) sur chaque gouvernement sénégalais et
sur la liste historique.

---

## Documentation

- [`directus-schema.md`](./directus-schema.md) — modèle de données Directus (collections,
  champs, relations). À lire en premier.
- [`seo.md`](./seo.md) — checklist SEO (canonical, OG, JSON-LD, sitemap, indexation).

---

## Architecture (frontend Nuxt)

Le code suit les patterns existants du projet (cf. `dossiers` / `actualites`).

| Couche | Fichier | Rôle |
| --- | --- | --- |
| Types | `types/government.ts` | `Government`, `GovernmentWithStats`, `GovernmentMemberFull`, `GovernmentRoleGroup`, `GovernmentDetailResponse`, `GovernmentHistoryResponse`, etc. |
| API historique | `server/api/government/history.get.ts` | Historique complet, stats par gouvernement, présidences dérivées dynamiquement, cache 1 h |
| API détail | `server/api/government/[slug].get.ts` | Détail par slug, membres groupés par rôle (ordre CMS), stats, 404 si non publié, cache 30 min |
| API catégories | `server/api/government/categories.get.ts` | Liste dynamique des rôles (`position_category_slug`) depuis Directus, cache 24 h |
| API actuel | `server/api/government/current.get.ts` | _(existant, non modifié)_ Gouvernement actuel pour `/gouvernement-senegal` |
| Composable historique | `app/composables/useGovernmentHistory.ts` | Fetch SSR + filtrage client (`q`, `president`), regroupement par présidence, URL sync |
| Composable détail | `app/composables/useGovernmentDetail.ts` | Fetch SSR par slug + filtrage client (`q`, `role`), URL sync |
| Composable actuel | `app/composables/useGovernment.ts` | _(existant, non modifié)_ |
| Page historique | `app/pages/gouvernement-senegal/historique.vue` | Frise chronologique, filtres président + recherche, SEO `ItemList` |
| Page détail | `app/pages/gouvernement-senegal/[slug].vue` | Composition du gouvernement, stats, filtres rôle + recherche, navigation précédent/suivant, SEO `Organization` |
| Page actuel | `app/pages/gouvernement-senegal/index.vue` | _(existante, non modifiée)_ |

> **Note** : aucun composant `Government/*` dédié n'a été créé — toute la logique de rendu
> est inline dans les deux pages vue. Les données étant elles-mêmes des personnalités, les liens
> pointent vers `app/pages/personnalites/[id]/[slug].vue`.

---

## Collections Directus utilisées

| Collection | Rôle |
| --- | --- |
| `governments` | Un gouvernement = une période entre deux remaniements majeurs |
| `public_person_appointments` | Une nomination = une personne / un poste / une période. C'est **cette** collection qui liste les membres d'un gouvernement (champ `government`) |
| `public_persons` | Annuaire des personnalités (président, PM, ministres, etc.) |
| `documents` | Décrets, journaux officiels → sources des nominations (`pm_appointment_decree`, `formation_decree`) |

---

## Pages en détail

### Page historique — `/gouvernement-senegal/historique`

**Sections :**

1. **En-tête** — titre, résumé, lien vers la page gouvernement actuel
2. **Filtres** — champ de recherche (debounce 200 ms, URL sync `?q=`) + chips de présidence (`?president=<slug>`)
3. **Compteur** — nombre de gouvernements filtrés
4. **Frise** — groupes par présidence, chaque groupe affiche :
   - Photo + nom du président (lien vers sa fiche personnalité)
   - Dates de la présidence (dynamiques, calculées depuis les gouvernements)
   - Cartes gouvernement : nom, période, durée, PM, nombre de membres, % femmes, liens décrets

**Comportement des filtres :**

- Tout le filtrage est **100 % client** (instantané) — un seul fetch `/api/government/history` au montage.
- `?q=` : recherche sans accent, insensible à la casse, sur nom gouvernement + PM.
- `?president=` : slug de président (dérivé dynamiquement des données, jamais codé en dur).
- Navigation par lien = `router.replace` (filtre simple) ou `router.push` (filtre volontaire cliqué).

**États gérés :**

- Skeleton loader pendant le chargement initial
- Message d'erreur si l'API échoue
- Message « Aucun gouvernement trouvé » + bouton « Effacer les filtres » si résultats vides

---

### Page détail — `/gouvernement-senegal/[slug]`

**Sections :**

1. **En-tête** — nom du gouvernement, badge « En cours » / date de fin, lien Président + lien PM, durée, décrets liés
2. **Stats** — total membres, femmes, hommes (avec barre de progression visuelle)
3. **Filtres membres** — champ recherche (`?q=`) + chips de rôle (`?role=<slug>`)
4. **Compteur membres** — nombre de membres affichés / total
5. **Groupes par rôle** — liste des membres groupés par `position_category_slug`, ordre défini au CMS Directus. Chaque carte membre : photo CmsImage, nom (lien personnalité), poste, organisation, date de nomination
6. **Navigation** — lien « Gouvernement précédent / suivant » (ordre chronologique récent → ancien)
7. **Fil d'Ariane** — AppBreadcrumb

**Comportement des filtres :**

- Identique à la page historique : filtrage 100 % client, URL sync.
- `?q=` : recherche sur nom de la personne + intitulé du poste.
- `?role=` : slug de catégorie (dynamique, dérivé de `readField` Directus).

**Regroupement dynamique des rôles (IMPORTANT) :**

Les groupes ne sont **jamais codés en dur**. L'ordre et les libellés viennent des métadonnées
du champ `position_category_slug` dans Directus (`readField`). Toute nouvelle catégorie ajoutée
au CMS s'affiche automatiquement, sans modification de code.

**404 :**

`watchEffect` → si `error.value` après chargement → `createError({ statusCode: 404, fatal: true })` → page `error.vue`.

---

## Patterns de code clés

### Filtrage client-side instantané

```typescript
// useGovernmentHistory.ts — un seul fetch, filtrage en computed
const { data } = useFetch<GovernmentHistoryResponse>('/api/government/history', {
  key: 'government-history',
});

const governments = computed<GovernmentWithStats[]>(() => {
  let list = data.value?.governments ?? [];
  if (president.value) list = list.filter(...);
  if (q.value) list = list.filter(...normalize...);
  return list;
});
```

### Synchronisation URL ↔ filtres

```typescript
// Initialisation synchrone au setup (SSR-safe, jamais dans onMounted)
const q = computed(() => (route.query.q as string) ?? '');
const president = computed(() => (route.query.president as string) ?? '');

const updateFilters = (next, mode = 'replace') => {
  const query = { ...route.query };
  for (const [k, v] of Object.entries(next)) {
    if (v) query[k] = v; else delete query[k];
  }
  router[mode]({ query });
};
```

### Regroupement par présidence

```typescript
// useGovernmentHistory.ts — byPresidency : Map groupée par president.slug
const byPresidency = computed<PresidencyGroup[]>(() => {
  const groups: PresidencyGroup[] = [];
  const indexBySlug = new Map<string, number>();
  for (const gov of governments.value) {
    const key = gov.president?.slug || `president-${gov.president?.id}`;
    if (!indexBySlug.has(key)) {
      indexBySlug.set(key, groups.length);
      groups.push({ president: gov.president, presidentSlug: key, governments: [], ... });
    }
    groups[indexBySlug.get(key)!].governments.push(gov);
  }
  return groups;
});
```

### Ordre dynamique des rôles (CMS-driven)

```typescript
// server/api/government/[slug].get.ts
const field = await directus.request(
  readField('public_person_appointments', 'position_category_slug')
);
const choices = field?.meta?.options?.choices ?? []; // [{ text, value }, …]
// → orderIndex Map pour trier les groupes dans l'ordre défini au CMS
```

---

## Gestion des erreurs

| Situation | Comportement |
| --- | --- |
| Gouvernement introuvable (slug invalide) | `GET /api/government/<slug>` → 404 → `createError(404)` → `error.vue` |
| Gouvernement non publié (`status != published`) | Identique → 404 |
| Erreur Directus sur l'historique | Message d'erreur inline + `refresh()` proposé |
| Membres vides (gouvernement sans nominations) | Section « Aucun membre enregistré » (jamais d'erreur 500) |
| API catégories indisponible | Dégradation gracieuse : liste vide (les rôles sont alors dérivés des données membres) |

---

## Cache serveur (Nitro)

| Endpoint | TTL prod | TTL dev |
| --- | --- | --- |
| `/api/government/history` | 1 h | désactivé |
| `/api/government/[slug]` | 30 min | désactivé |
| `/api/government/categories` | 24 h | désactivé |

La clé de cache inclut les query params (`buildCacheKey`) pour éviter les collisions entre
requêtes filtrées différentes.

---

## Tester en local

```bash
npm run dev   # http://localhost:3000

# Historique
curl http://localhost:3000/api/government/history
curl "http://localhost:3000/api/government/history?president=bassirou-diomaye-faye"
curl "http://localhost:3000/api/government/history?q=sonko"

# Détail
curl http://localhost:3000/api/government/sonko-i
curl "http://localhost:3000/api/government/sonko-i?role=ministre"
curl "http://localhost:3000/api/government/sonko-i?q=diop"

# Catégories de rôles
curl http://localhost:3000/api/government/categories

# Pages SSR
curl -sL http://localhost:3000/gouvernement-senegal/historique | grep -oE '<title>[^<]+'
curl -sL http://localhost:3000/gouvernement-senegal/sonko-i | grep -oE '<title>[^<]+'

# Pagination SSR (vérifier que la page serveur change bien)
curl -sL "http://localhost:3000/gouvernement-senegal/historique?president=abdoulaye-wade" \
  | grep -oE 'gouvernement-senegal/[^"]+' | sort -u
```

---

## Ce qui n'a PAS été modifié

- `app/pages/gouvernement-senegal/index.vue` — gouvernement actuel
- `server/api/government/current.get.ts`
- `app/composables/useGovernment.ts`
- `types/government-member.ts`

Ces fichiers existaient avant la branche et restent inchangés.
