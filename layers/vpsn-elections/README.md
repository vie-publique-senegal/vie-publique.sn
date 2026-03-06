# Layer VPSN Elections

Layer Nuxt réutilisable pour les systèmes d'information électoraux.

---

## Contenu

| Catégorie | Nb | Détail |
|---|---|---|
| Pages | 5 | Accueil, carte électorale, guide, législation, dashboard |
| Composants | 42+ | Dashboard, cartes, résultats, statistiques, guide |
| Composables | 17+ | Données électorales, formatage, carte, dashboard |
| Routes API | 18+ | Config, coalitions, carte nationale, diaspora, résultats |

---

## Installation

### 1. Déclarer le layer

```ts
// nuxt.config.ts (projet parent)
export default defineNuxtConfig({
  extends: ['./layers/vpsn-elections'],
});
```

### 2. Configurer via `app.config.ts`

Créer ou compléter `app/app.config.ts` dans le projet parent. Toutes les clés sont optionnelles — elles surchargent les valeurs par défaut du layer.

```ts
// app/app.config.ts (projet parent)
export default defineAppConfig({
  vpsnElections: {
    country: { name: 'Sénégal', code: 'SN' },
    features: {
      enabledTypes: ['presidential', 'legislative', 'locale'],
    },
  },
});
```

### 3. Variables d'environnement

Le layer utilise le client CMS du projet principal.

```env
CMS_API_URL=https://votre-cms.com          # sans trailing slash
CMS_API_URL_ASSETS=https://votre-cms.com   # sans trailing slash
```

---

## Configuration — `app.config.ts`

### Structure complète

```ts
export default defineAppConfig({
  vpsnElections: {

    // 1. Pays
    country: {
      name: 'Sénégal',   // Détermine l'URL : /elections-senegal
      code: 'SN',        // Code ISO (affiché dans certains composants)
    },

    // 2. Types d'élections actifs
    features: {
      enabledTypes: ['presidential', 'legislative', 'locale'],
      // Retirer un type pour le masquer dans toute l'interface :
      //   sélecteur de type, sélecteur d'année, élection affichée par défaut
    },

    // 3. Labels (tous surchargeable)
    labels: {
      // Géographie
      departments:    'Départements',
      regions:        'Régions',
      constituencies: 'Circonscriptions',
      communes:       'Communes',
      diaspora:       'Diaspora',

      // Types d'élections (affichés dans les sélecteurs)
      presidential: 'Présidentielle',
      legislative:  'Législatives',
      locale:       'Locales',

      // Entités politiques
      coalitions: 'Coalitions',
      candidates: 'Candidats',
      lists:      'Listes électorales',

      // Statuts d'élection
      ongoing:   'En Cours',
      scheduled: 'Programmée',
      completed: 'Terminée',

      // Navigation
      results:     'Résultats',
      statistics:  'Statistiques',
      map:         'Carte Électorale',
      guide:       "Guide de l'Électeur",
      legislation: 'Législation',
      documents:   'Documents Officiels',
    },

    // 4. Textes UI
    ui: {
      // Libellés des onglets du dashboard
      mapTab:       'Carte',
      resultsTab:   'Résultats',
      documentsTab: 'Documents',
      statsTab:     'Stats',
      guideTab:     'Guide',

      // Placeholders de recherche
      searchPlaceholder:             'Rechercher...',
      searchDepartmentPlaceholder:   'Rechercher un département...',
      searchConstituencyPlaceholder: 'Rechercher une circonscription...',

      // Textes divers
      engaged:    'engagées',
      home:       'Accueil Élections',
      backToHome: 'Accueil Élections',

      // Guide électoral
      guideTitle:        'Guide Électoral - Comment Voter',
      guideDescription:  'Découvrez comment voter aux élections...',
      allElections:      'Toutes les élections',
      allLanguages:      'Toutes les langues',
      noVideosAvailable: 'Aucune vidéo disponible pour cette sélection.',

      // Pagination
      itemsPerPage: {
        coalitions: 12,
        documents:  12,
        news:       3,
      },

      // Cache en secondes (serveur)
      cache: {
        config:         3600,  // 1h
        coalitions:     1800,  // 30min
        constituencies: 1800,  // 30min
        professions:    3600,
        documents:      3600,
        guide:          3600,
      },
    },

    // 5. SEO
    seo: {
      title:       "Élections | Plateforme d'Information Électorale",
      description: 'Accédez à toutes les informations sur les élections...',
      ogImage:     '/images/elections-share.png',
    },

  },
});
```

---

### `enabledTypes` — filtrer les types d'élections

La seule option `features` actuellement câblée dans l'interface.

```ts
// Afficher uniquement la présidentielle
features: { enabledTypes: ['presidential'] }

// Afficher présidentielle + législatives
features: { enabledTypes: ['presidential', 'legislative'] }

// Tout afficher (défaut)
features: { enabledTypes: ['presidential', 'legislative', 'locale'] }
```

**Ce que ça contrôle automatiquement :**

| Élément | Comportement |
|---|---|
| Sélecteur de type | Seuls les types listés apparaissent |
| Sélecteur d'année | Seules les années ayant un type actif apparaissent |
| Élection par défaut | Choisie parmi les types actifs uniquement |
| Page d'accueil élections | N'affiche que des élections des types actifs |
| Carte électorale | Filtrée |
| Page législation | Filtrée |

---

### Routes dynamiques par pays

Le nom du pays dans `country.name` détermine l'URL de base.

| `country.name` | URL de base générée |
|---|---|
| `'Sénégal'` | `/elections-senegal` |
| `'Côte d\'Ivoire'` | `/elections-cote-d-ivoire` |
| `'Bénin'` | `/elections-benin` |

**Ne jamais hardcoder les URLs.** Utiliser le composable `useElectionRoutes()` :

```ts
const routes = useElectionRoutes();

// Propriétés disponibles
routes.baseRoute        // "/elections-senegal"
routes.home             // "/elections-senegal"
routes.carteElectorale  // "/elections-senegal/carte-electorale"
routes.guideElectoral   // "/elections-senegal/guide-electoral"
routes.legislation      // "/elections-senegal/legislation"

// Fonctions
routes.dashboard('presidential', 2024)  // "/elections-senegal/dashboard/presidential/2024"
routes.buildRoute('ma-page')            // "/elections-senegal/ma-page"
```

---

## Pages disponibles

Après installation, accessibles automatiquement (URL adaptée au pays) :

| Page | URL |
|---|---|
| Accueil élections | `/elections-{pays}` |
| Carte électorale | `/elections-{pays}/carte-electorale` |
| Guide électoral | `/elections-{pays}/guide-electoral` |
| Législation | `/elections-{pays}/legislation` |
| Dashboard | `/elections-{pays}/dashboard/{type}/{année}` |

---

## APIs disponibles

| Endpoint | Description |
|---|---|
| `GET /api/elections/dashboard/config` | Années, types, liste des élections |
| `GET /api/elections/dashboard/coalitions` | Coalitions/candidats |
| `GET /api/elections/dashboard/stats/lists` | Statistiques par liste |
| `GET /api/elections/dashboard/guide/videos` | Vidéos du guide électoral |
| `GET /api/elections/dashboard/guide/languages` | Langues disponibles |
| `GET /api/elections/map/national` | Résultats nationaux par dépt |
| `GET /api/elections/map/summary` | Résumé carte nationale |
| `GET /api/elections/map/department-details/[dept]` | Détails d'un département |
| `GET /api/elections/diaspora/countries` | Pays de la diaspora |
| `GET /api/elections/diaspora/country-details/[country]` | Détails d'un pays diaspora |
| `GET /api/elections/diaspora/country-stats/[country]` | Stats d'un pays diaspora |

---

## Composables principaux

### `useElectoralDashboard()`

État central du dashboard. À utiliser dans les pages/composants du dashboard.

```ts
const {
  selectedYear,      // Année actuellement sélectionnée
  selectedType,      // Type d'élection sélectionné ('presidential', etc.)
  activeTab,         // Onglet actif du dashboard
  config,            // Données brutes de l'API config
  filteredConfig,    // config filtrée par enabledTypes (à préférer)
  filteredTypes,     // Types filtrés
  filteredElections, // Élections filtrées
  currentElection,   // Élection actuellement affichée
  loadingConfig,     // Boolean chargement
} = useElectoralDashboard();
```

**Utiliser `filteredConfig` plutôt que `config`** pour respecter `enabledTypes`.

### `useElectionsConfig()`

Accès à la configuration `app.config.ts` avec helpers.

```ts
const {
  getElectionTypeLabel,  // ('presidential') => 'Présidentielle'
  isElectionTypeEnabled, // ('locale') => boolean
  config,                // Objet complet vpsnElections
} = useElectionsConfig();
```

### `useElectionRoutes()`

Génération des URLs adaptées au pays configuré.

### `useElectoralCoalitions()`

Chargement paginé des coalitions/candidats avec filtres.

### `useElectionMapJson()`

Données géographiques (polygones GeoJSON) pour la carte.

### `useElectionMapNational()`

Résultats nationaux par département pour la carte.

---

## Ajouter un composant

```ts
// layers/vpsn-elections/app/components/elections/MonComposant.vue
const appConfig = useAppConfig();
const config = appConfig.vpsnElections;

const label = config.labels.departments;  // 'Départements'
const country = config.country.name;      // 'Sénégal'
```

Le composant est auto-importé par Nuxt sous le nom `ElectionsMonComposant`.

---

## Ajouter une route API

```ts
// layers/vpsn-elections/server/api/elections/mon-endpoint.get.ts
export default defineCachedEventHandler(async (event) => {
  const directus = getCmsClient();   // client CMS du projet principal

  const data = await directus.request(
    readItems('ma_collection', {
      fields: ['id', 'name'],
      filter: { status: { _eq: 'published' } },
    })
  );

  return data;
}, { maxAge: 60 * 60, name: 'mon-endpoint' });
```

---

## Structure du layer

```
layers/vpsn-elections/
├── app/
│   ├── app.config.ts              Configuration par défaut (surcharger dans le projet parent)
│   ├── components/elections/      Composants auto-importés
│   ├── composables/elections/     Composables auto-importés
│   └── pages/elections-senegal/   Pages (routes dynamiques via nuxt.config.ts)
│
├── server/
│   └── api/elections/             Routes API serveur
│
├── nuxt.config.ts                 Config technique du layer
└── README.md                      Ce fichier
```

---

## Exemple : adapter pour un autre pays

```ts
// app/app.config.ts (projet parent, ex: Bénin)
export default defineAppConfig({
  vpsnElections: {
    country: { name: 'Bénin', code: 'BJ' },

    features: {
      enabledTypes: ['presidential', 'legislative'],
      // Pas d'élection locale pour l'instant
    },

    labels: {
      departments:    'Départements',
      constituencies: 'Circonscriptions',
      coalitions:     'Partis',           // Terminologie béninoise
      presidential:   'Élection Présidentielle',
      legislative:    'Élections Législatives',
    },

    seo: {
      title: "Élections Bénin | Information Électorale",
      description: 'Résultats et informations électorales du Bénin.',
      ogImage: '/images/benin-elections-share.png',
    },
  },
});
```

Les URLs seront automatiquement `/elections-benin/*`.

---

**Version** : 1.2 — Mars 2026
