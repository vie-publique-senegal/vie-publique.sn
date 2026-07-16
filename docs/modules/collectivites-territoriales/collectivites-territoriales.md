# Module Collectivités territoriales

> Annuaire des communes du Sénégal, porté du prototype **vpsn-collectivites**
> (workspace `senegal-local-guide`, app React/TanStack Start générée avec Lovable)
> vers vpsn en juillet 2026.

## ⚠️ Données de démonstration

Le module fonctionne sur des **données statiques synthétiques** :

- **Source unique** : [`shared/communes.ts`](../../../shared/communes.ts) — 18 communes réelles
  en « seeds » (nom, région, coordonnées, maire réel), tout le reste (budgets, conseillers,
  adjoints, projets, documents, actualités, téléphones, emails) est **généré procéduralement**
  et n'a aucune valeur officielle.
- Types : [`types/collectivite.ts`](../../../types/collectivite.ts) (champs en français —
  la convention snake_case anglais ne s'applique qu'aux collections Directus).
- L'avertissement « données de démonstration » est affiché sur `/collectivites-territoriales/a-propos`.
- **Avant toute communication publique** : remplacer par des données réelles (migration Directus,
  famille « module métier », ex. `local_commune`), et seulement alors envisager le retrait de
  l'avertissement.

## Plan d'URLs

| URL | Page | Contenu |
| --- | --- | --- |
| `/collectivites-territoriales` | `app/pages/collectivites-territoriales/index.vue` | Annuaire : recherche, 7 filtres, 3 vues (Cartes / Liste / Carte). État syncé dans l'URL (`?q`, `?region`, `?vue`…). |
| `/collectivites-territoriales/communes/[slug]` | `.../communes/[slug].vue` | Fiche commune : hero photo, KPI, 11 onglets (`?tab=`). 404 si slug inconnu. |
| `/collectivites-territoriales/carte` | `.../carte.vue` | Carte plein écran (layout `fullscreen` + gate dans `app.vue`), filtre région (`?region=`). |
| `/collectivites-territoriales/a-propos` | `.../a-propos.vue` | Page éditoriale (mission, méthodologie, avertissement démo). |

Onglets de la fiche (`?tab=`) : `apercu` (défaut, sans query), `maire`, `executif`, `conseil`,
`territoire`, `budget`, `projets`, `services`, `documents`, `actualites`, `contacts`.
Le `?tab=` est lu **de façon synchrone au setup** (règle SSR de CLAUDE.md) : le serveur rend
l'onglet demandé.

## Composants

`app/components/collectivites/` (préfixe auto-import `Collectivites…`) :

- `CommuneCard`, `CommunesTable`, `CommunesFilters` (v-model nommés par filtre), `PartiBadge`,
  `InfoRow`, `CommuneKpiStrip` ;
- `CommunesMap` — **unique composant carte** du module (Leaflet via `@nuxtjs/leaflet`,
  `<ClientOnly>`, CircleMarkers ∝ log10(population)) ;
- `tabs/` — un composant par onglet, prop unique `commune` (importés explicitement dans
  `[slug].vue`).

## SEO

- Annuaire : JSON-LD `CollectionPage` + `ItemList` (clé `ld-collectivites`).
- Fiche : JSON-LD `GovernmentOrganization` (« Mairie de X », clé `ld-mairie`),
  og:image = photo de couverture (Unsplash).
- BreadcrumbList émis uniquement par `<AppBreadcrumb>` (jamais dupliqué en page).
- Sitemap : les 18 fiches sont poussées par `server/api/__sitemap__/urls.ts`
  (import `#shared/communes`, hors du try Directus) ; les pages statiques sont auto-découvertes.
- `llms.txt` : rubrique volontairement **non ajoutée** tant que les données sont des démos.

## Migration carte prévue (Leaflet → MapLibre)

À terme (une fois les données réelles en place), remplacer l'intérieur de `CommunesMap.vue`
par le moteur existant `app/composables/useMapEngine.ts` (MapLibre + deck.gl) :

- affichage **par défaut des départements** (`public/geo/senegal-departements.geojson`) ;
- **drill-down** : clic sur un département → communes de ce département
  (`public/geo/senegal-communes.geojson`, à compléter — le fichier actuel est partiel) ;
- **ne pas changer les props** (`communes` / `height` / `focusSlug`) pour garder les
  call-sites intacts.

## Points d'intégration

- `app/app.vue` : `/collectivites-territoriales/carte` ajouté au gate `isFullscreenPage`
  (masque header/footer).
- `app/pages/menu.vue` : carte de section (sans `featureKey` tant que le flag
  `menu_collectivites_territoriales` n'existe pas dans `vp_feature_flags`).
