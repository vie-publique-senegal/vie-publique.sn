# 🗳️ VPSN Elections Layer

Nuxt layer réutilisable pour créer des dashboards électoraux interactifs et transparents.

## 📦 Fonctionnalités

- ✅ Dashboard électoral complet (présidentielles, législatives, locales)
- ✅ Cartes interactives (nationale, diaspora)
- ✅ Statistiques avancées (professions, genre, âge)
- ✅ Guide de l'électeur multilingue
- ✅ Gestion de documents officiels (législation)
- ✅ Résultats en temps réel
- ✅ Architecture SSR/SSG compatible
- ✅ Configuration paramétrable par pays
- ✅ Backend Directus CMS

## 🚀 Installation

### 1. Installer le layer dans votre projet Nuxt

```bash
cd your-nuxt-project
npm install @directus/sdk
```

### 2. Activer le layer

Ajoutez le layer dans votre `nuxt.config.ts` :

```typescript
export default defineNuxtConfig({
  extends: ['./layers/vpsn-elections'],

  // Optionnel: Override de la configuration
  appConfig: {
    vpsnElections: {
      country: {
        name: 'Sénégal', // Votre pays
      },
      labels: {
        departments: 'Départements', // Vos traductions
      },
    },
  },
})
```

### 3. Configuration requise

Le layer nécessite un backend Directus CMS avec les collections suivantes :

#### Collections Directus requises

| Collection | Description |
|-----------|-------------|
| `elections` | Élections (année, type, statut, dates) |
| `election_coalition` | Coalitions/partis politiques |
| `election_electoral_lists` | Listes électorales |
| `election_constituencies` | Circonscriptions (départements, communes) |
| `election_candidates` | Candidats |
| `guide_electorale` | Vidéos guide électoral |
| `documents` | Documents officiels |

Voir le fichier `LAYER_ELECTIONS_ANALYSE.md` pour la structure complète.

### 4. Configuration du client Directus

Créez ou vérifiez votre fichier `server/utils/directus.ts` :

```typescript
import { createDirectus, rest } from '@directus/sdk';

export const getLocalCmsClient = () => {
  const config = useRuntimeConfig();

  return createDirectus(config.public.cmsApiUrl)
    .with(rest());
};
```

## 🎨 Pages disponibles

Le layer fournit automatiquement les pages suivantes :

| Route | Description |
|-------|-------------|
| `/elections-senegal` | Hub principal élections |
| `/elections-senegal/carte-electorale` | Carte électorale interactive |
| `/elections-senegal/guide-electoral` | Guide de l'électeur |
| `/elections-senegal/legislation` | Documents officiels |
| `/elections-senegal/dashboard/[type]/[year]` | Dashboard détaillé |

## ⚙️ Configuration

### Configuration par défaut

Le layer utilise la configuration par défaut pour le Sénégal. Voir `app.config.ts`.

### Personnalisation

Vous pouvez override toutes les configurations dans votre projet parent :

```typescript
// nuxt.config.ts du projet parent
export default defineNuxtConfig({
  extends: ['./layers/vpsn-elections'],

  appConfig: {
    vpsnElections: {
      // Votre pays
      country: {
        name: 'Mali',
        code: 'ML',
      },

      // Vos labels/traductions
      labels: {
        departments: 'Cercles',
        regions: 'Régions',
        legislative: 'Législatives',
      },

      // Features toggles
      features: {
        showDiaspora: false, // Désactiver la diaspora
        showLocalElections: true,
      },

      // Configuration UI
      ui: {
        itemsPerPage: {
          coalitions: 20,
        },
      },
    },
  },
})
```

## 🧩 Composables disponibles

Le layer expose automatiquement ces composables :

### Dashboard

```typescript
// État global du dashboard
const {
  selectedYear,
  selectedType,
  activeTab,
  config,
  currentElection,
} = useElectoralDashboard();

// Coalitions
const { coalitions, loading } = useElectoralCoalitions({
  year: ref(2024),
  type: ref('legislative'),
});

// Circonscriptions
const { constituencies, loading } = useElectoralConstituencies({
  year: ref(2024),
  type: ref('locale'),
});

// Stats professions
const { data: professions } = useElectoralProfessions({
  year: ref(2024),
  type: ref('legislative'),
});
```

## 🎨 Composants disponibles

Tous les composants sont auto-importés :

```vue
<template>
  <!-- Dashboard -->
  <ElectoralDashboardHeader />
  <ElectoralDashboardTabs />
  <ElectoralDetailsCard :election="election" />

  <!-- Coalitions -->
  <PresidentialCoalitionCard :coalition="coalition" />
  <LegislativeCoalitionListCard :coalition="coalition" />

  <!-- Maps -->
  <ElectionMapComponent4 />
  <ElectionMapDiasporaCountries />

  <!-- Stats -->
  <ElectionCandidatProfessionChart :professions="professions" />
</template>
```

## 🔧 Dépendances externes

Le layer utilise ces composables/composants du projet parent (doivent exister) :

- `useCmsCollection` - Composable CMS générique
- `useNews` - Composable actualités
- `CmsImage` - Composant affichage images CMS
- `NewsGrid` - Composant grille actualités

Assurez-vous que ces éléments existent dans votre projet parent.

## 🗂️ Structure du layer

```
layers/vpsn-elections/
├── composables/elections/    # Composables élections
├── components/elections/      # Composants Vue
├── pages/elections-senegal/   # Pages (routes automatiques)
├── server/api/elections/      # Routes API serveur
├── types/                     # Types TypeScript
├── nuxt.config.ts             # Config Nuxt du layer
└── app.config.ts              # Config paramétrable
```

## 📚 Documentation complète

Voir le fichier `LAYER_ELECTIONS_ANALYSE.md` à la racine du projet pour :

- Architecture complète
- Liste des composables (10)
- Liste des routes API (10)
- Liste des composants (31+)
- Collections Directus (9)
- Types TypeScript (14+)
- Plan de migration détaillé

## 🐛 Debug

### Vérifier que le layer est bien chargé

```bash
# Dans votre projet parent
npm run dev
```

Vérifiez la console : Nuxt affiche les layers chargés au démarrage.

### Vérifier les auto-imports

Les composables et composants du layer doivent être auto-importés. Si ce n'est pas le cas :

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['./layers/vpsn-elections'],

  // Force la regénération des types
  typescript: {
    typeCheck: true,
  },
})
```

## 📝 Contribution

Pour contribuer au layer :

1. Créer une branche depuis `develop`
2. Faire vos modifications dans `layers/vpsn-elections/`
3. Tester dans le projet parent
4. Créer une PR vers `develop`

## 📄 License

MIT © Vie Publique Sénégal

---

**Version:** 0.1.0
**Date:** 2026-01-11
**Auteur:** Vie Publique Sénégal
