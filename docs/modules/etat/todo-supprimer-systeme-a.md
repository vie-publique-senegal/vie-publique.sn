# TODO Refactoring — Supprimer l'ancien système « état » (Système A)

> **Statut** : Couche 1 (code) **terminée le 2026-07-23**. Reste la Couche 2 (Directus).
> Audit réalisé le 2026-06-25.
> **Résumé** : le projet contient deux systèmes « état » parallèles. Le **Système A**
> (collection Directus `state_entity`) est redondant avec le **Système B** actuel
> (`state_organization_entity`). Il faut supprimer le Système A.

## Contexte : deux systèmes parallèles

| | **ANCIEN — Système A** | **ACTUEL — Système B** |
| --- | --- | --- |
| Collection Directus | `state_entity` (+ `state_type`, `state_structure`) | `state_organization_entity` (+ snapshots, décrets, changes) |
| API serveur | `server/api/state/` (4 fichiers) | `server/api/etat-organisation/` (6 fichiers) |
| Pages | `/etat-senegal/annuaire` (2 pages) | `/etat-senegal/organisation`, `/institutions`, `/ministeres`, `/[slug]`… (8 pages) |
| Composables | `useStateEntities`, `useStateTree`, `useStateStats`, `useStateEntityDetail` | `useEtatOrganisation*` (4) |

**Constats de l'audit :**

- Les deux systèmes tournent (code vivant).
- Le Système A est accessible via la carte menu « Organigramme de l'etat »
  (`/etat-senegal/annuaire`, flag `menu_organigramme_etat` **enabled**) mais
  **n'est PAS dans le sitemap** (`server/api/__sitemap__/urls.ts`) → non indexé volontairement.
- Le **budget** et les **dossiers** utilisent le Système B :
  `budget_line.public_entity` → `state_organization_entity`
  (`server/api/budget/entity/[slug].get.ts`, `server/api/budget/ministries.get.ts`),
  `server/api/dossiers/[slug].get.ts` → `state_organization_entity_id`.
- **Seul lien restant vers l'ancien `state_entity`** : `public_project.ministry`
  (filtre ministères des projets) dans `server/api/public-projects/filters.get.ts` (L48-58).

## Couche 1 — CODE (✅ faite le 2026-07-23)

- [x] `server/api/state/` (4 fichiers : `entities/index.get.ts`, `entities/[slug].get.ts`, `tree.get.ts`, `stats.get.ts`)
- [x] `app/pages/etat-senegal/annuaire/` (2 fichiers : `index.vue`, `[slug].vue`)
- [x] `app/composables/useStateEntities.ts`
- [x] `app/composables/useStateTree.ts`
- [x] `app/composables/useStateStats.ts`
- [x] `app/composables/useStateEntityDetail.ts`
- [x] `types/state-entity.ts`
- [x] Composants orphelins découverts en plus : `StateTreeNode.vue`, `StateEntityCard.vue`,
      `StateEntityFilters.vue`, `State/EntityTypeBadge.vue`, `State/EntityStatusBadge.vue`
- [x] Redirections 301 ajoutées (`routeRules`) : `/etat-senegal/annuaire` →
      `/etat-senegal/organisation` et `/etat-senegal/annuaire/**` → `/etat-senegal/**` ;
      entrée `robots.disallow` retirée (le crawler doit voir la 301)
- [x] Réindexeur recherche corrigé (`scripts/search-reindex.mjs`) : URL `/etat-senegal/<slug>`
      + filtre `has_public_page` (avant : liens vers l'annuaire A mort, 2 394 entités indexées
      dont 2 055 sans page)
- [x] Vérifié : `npm run lint` (aucune référence résiduelle)

> ⚠️ **Gardés volontairement** (le TODO initial était périmé) : l'entrée menu
> « Organigramme de l'etat » et le flag `menu_organigramme_etat` pointent désormais vers le
> **Système B** (`/etat-senegal/organisation` + bloc `HomeEtatOrganisation` de la home).

## Couche 2 — COLLECTION Directus `state_entity` (PAS avant migration)

**Bloqueur** : `public_project.ministry` pointe encore vers `state_entity`
(`server/api/public-projects/filters.get.ts` L48-58).

- [ ] Re-pointer `public_project.ministry` vers `state_organization_entity` dans l'admin Directus.
- [ ] Adapter `server/api/public-projects/filters.get.ts` si la structure des champs change.
- [ ] Une fois la relation migrée : supprimer les collections `state_entity`,
      `state_type`, `state_structure` côté Directus.
