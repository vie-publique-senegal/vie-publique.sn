# Layer VPSN Elections

Layer Nuxt réutilisable pour les systèmes d'information électoraux en Afrique de l'Ouest.

---

## 📋 Description

Ce layer contient toute la logique, les composants et les APIs nécessaires pour afficher les informations électorales (résultats, candidats, coalitions, carte électorale, etc.) pour différents pays.

**Pays supportés** :
- 🇸🇳 Sénégal (par défaut)
- 🇨🇮 Côte d'Ivoire (avec configuration personnalisée)
- Extensible à d'autres pays d'Afrique de l'Ouest

---

## 📦 Contenu du Layer

### Composants (42)
- Dashboard électoral
- Cartes électorales
- Statistiques et graphiques
- Listes de candidats et coalitions
- Guide électoral

### Composables (17)
- Gestion des données électorales
- Formatage et calculs
- Utilitaires dashboard

### Routes API (18)
- Configuration dashboard
- Données coalitions
- Statistiques par département
- Données diaspora
- Résultats nationaux

### Pages (5)
- Page principale élections
- Carte électorale
- Guide électoral
- Vue résultats

---

## 🚀 Installation

### 1. Ajouter le Layer

Dans votre `nuxt.config.ts` :

```typescript
export default defineNuxtConfig({
  extends: [
    './layers/vpsn-elections',
  ],
});
```

### 2. Configurer pour votre Pays

Créer ou modifier `app/app.config.ts` :

```typescript
export default defineAppConfig({
  vpsnElections: {
    country: {
      name: 'Votre Pays',
      code: 'XX',
    },
    labels: {
      // Types d'élections
      presidential: 'Présidentielle',
      legislative: 'Législatives',

      // Entités géographiques
      departments: 'Départements', // ou 'Districts', 'Régions', etc.
      regions: 'Régions',
      constituencies: 'Circonscriptions',

      // Autres labels
      coalitions: 'Coalitions',
      candidates: 'Candidats',
      discover: 'Découvrez les',
    },
    features: {
      showDiaspora: true,
      showMaps: true,
      showVideos: true,
      showGuide: true,
    },
  },
});
```

### 3. Démarrer

```bash
npm run dev
```

Toutes les pages et APIs sont automatiquement disponibles !

---

## 🌍 Routes Dynamiques par Pays

Le layer génère automatiquement les routes en fonction du pays configuré dans votre `app.config.ts`.

### Configuration du Pays

La configuration du pays dans `app/app.config.ts` détermine les URLs des routes :

```typescript
export default defineAppConfig({
  vpsnElections: {
    country: {
      name: 'Sénégal',  // Détermine l'URL : /elections-senegal
      code: 'SN',
    },
  },
});
```

### Routes Générées Automatiquement

Selon le nom du pays configuré :

| Pays | Route de base | Exemple complet |
|------|--------------|-----------------|
| Sénégal | `/elections-senegal` | `/elections-senegal/carte-electorale` |
| Bénin | `/elections-benin` | `/elections-benin/guide-electoral` |
| Mali | `/elections-mali` | `/elections-mali/legislation` |
| Côte d'Ivoire | `/elections-cote-d-ivoire` | `/elections-cote-d-ivoire/dashboard/presidential/2024` |

**Note** : Les accents, espaces et apostrophes sont automatiquement supprimés et convertis en format URL-friendly.

### Utilisation du Composable `useElectionRoutes()`

Pour garantir des liens corrects, utilisez toujours le composable `useElectionRoutes()` dans vos composants :

```vue
<script setup lang="ts">
const electionRoutes = useElectionRoutes();
</script>

<template>
  <div>
    <!-- Lien vers la page d'accueil -->
    <NuxtLink :to="electionRoutes.home">
      Accueil Élections
    </NuxtLink>

    <!-- Lien vers le guide électoral -->
    <NuxtLink :to="electionRoutes.guideElectoral">
      Guide Électoral
    </NuxtLink>

    <!-- Lien vers la législation -->
    <NuxtLink :to="electionRoutes.legislation">
      Législation
    </NuxtLink>

    <!-- Lien vers la carte électorale -->
    <NuxtLink :to="electionRoutes.carteElectorale">
      Carte Électorale
    </NuxtLink>

    <!-- Lien vers un dashboard spécifique -->
    <NuxtLink :to="electionRoutes.dashboard('presidential', 2024)">
      Présidentielle 2024
    </NuxtLink>

    <!-- Construction d'une route personnalisée -->
    <NuxtLink :to="electionRoutes.buildRoute('ma-page')">
      Ma Page Personnalisée
    </NuxtLink>
  </div>
</template>
```

### API du Composable

```typescript
const routes = useElectionRoutes();

// Propriétés disponibles :
routes.baseRoute           // "/elections-{pays}"
routes.home                // "/elections-{pays}"
routes.carteElectorale     // "/elections-{pays}/carte-electorale"
routes.guideElectoral      // "/elections-{pays}/guide-electoral"
routes.legislation         // "/elections-{pays}/legislation"

// Fonctions :
routes.dashboard(type, year)   // Retourne "/elections-{pays}/dashboard/{type}/{year}"
routes.buildRoute(subPath)     // Retourne "/elections-{pays}/{subPath}"
```

### ⚠️ Important : Ne jamais hardcoder les URLs

```vue
<!-- ❌ MAUVAIS : URL hardcodée -->
<NuxtLink to="/elections-senegal/guide">Guide</NuxtLink>

<!-- ✅ BON : Utiliser le composable -->
<NuxtLink :to="electionRoutes.guideElectoral">Guide</NuxtLink>
```

---

## 📊 Utilisation

### Pages Disponibles

Après installation, ces pages sont accessibles (les URLs s'adaptent automatiquement au pays configuré) :

- `/elections-{pays}` - Page principale
- `/elections-{pays}/carte-electorale` - Carte électorale interactive
- `/elections-{pays}/guide-electoral` - Guide électoral
- `/elections-{pays}/legislation` - Législation électorale
- `/elections-{pays}/dashboard/{type}/{année}` - Dashboard électoral détaillé

**Exemple pour le Sénégal** : `/elections-senegal/carte-electorale`
**Exemple pour le Bénin** : `/elections-benin/guide-electoral`

### APIs Disponibles

- `/api/elections/dashboard/config` - Configuration et métadonnées
- `/api/elections/dashboard/coalitions` - Liste des coalitions
- `/api/elections/dashboard/stats/lists` - Statistiques par liste
- `/api/elections/map/national` - Résultats nationaux
- `/api/elections/diaspora/countries` - Pays de diaspora
- ... et 13 autres routes

### Composants Disponibles

Tous les composants sont auto-importés grâce à Nuxt :

```vue
<template>
  <ElectionsDashboardHeader
    :election-type="'legislative'"
    :year="2024"
  />

  <ElectionsDashboardCoalitions
    :coalitions="coalitions"
  />
</template>
```

---

## ⚙️ Configuration

### Structure de app.config.ts

```typescript
{
  vpsnElections: {
    // Informations du pays
    country: {
      name: string,      // "Sénégal", "Côte d'Ivoire", etc.
      code: string,      // "SN", "CI", etc.
    },

    // Labels traduits/adaptés
    labels: {
      presidential: string,
      legislative: string,
      departments: string,
      regions: string,
      constituencies: string,
      coalitions: string,
      candidates: string,
      discover: string,
    },

    // Fonctionnalités activées
    features: {
      showDiaspora: boolean,
      showMaps: boolean,
      showVideos: boolean,
      showGuide: boolean,
    },

    // Textes UI
    ui: {
      selectYear: string,
      selectType: string,
      allDepartments: string,
      viewMap: string,
      viewTable: string,
    },
  }
}
```

### Exemple : Configuration Côte d'Ivoire

```typescript
export default defineAppConfig({
  vpsnElections: {
    country: {
      name: 'Côte d\'Ivoire',
      code: 'CI',
    },
    labels: {
      presidential: 'Présidentielle',
      legislative: 'Législatives',
      departments: 'Districts',        // Terminologie ivoirienne
      regions: 'Régions',
      constituencies: 'Circonscriptions',
      coalitions: 'Listes',            // Différent du Sénégal
      candidates: 'Candidats',
      discover: 'Consultez les',
    },
    features: {
      showDiaspora: false,             // Pas de vote diaspora
      showMaps: true,
      showVideos: false,
      showGuide: true,
    },
  },
});
```

---

## 🔧 Développement

### Prérequis

- Node.js 18+
- npm 9+
- Accès à un CMS Directus pour les données

### Variables d'Environnement

Le layer utilise le client CMS du projet principal. Configurez dans `.env` :

```env
CMS_API_URL=https://votre-cms.com
CMS_API_URL_ASSETS=https://votre-cms.com
```

### Structure du Layer

```
layers/vpsn-elections/
├── app/
│   ├── components/
│   │   └── elections/           # Composants Vue
│   ├── composables/
│   │   └── elections/           # Composables
│   ├── pages/
│   │   └── elections-senegal/   # Pages
│   ├── types/                   # Types TypeScript
│   └── app.config.ts            # Config par défaut
│
├── server/
│   ├── api/
│   │   └── elections/           # Routes API
│   └── utils/                   # VIDE (utilise utils du projet principal)
│
├── nuxt.config.ts               # Config du layer
└── README.md                    # Ce fichier
```

### Ajouter un Nouveau Composant

1. Créer le fichier dans `app/components/elections/`
2. Le composant est auto-importé
3. Utiliser `useAppConfig()` pour les données dynamiques :

```vue
<script setup lang="ts">
const appConfig = useAppConfig();
const config = appConfig.vpsnElections;

const countryName = config.country.name;
const departmentLabel = config.labels.departments;
</script>
```

### Ajouter une Nouvelle API

1. Créer le fichier dans `server/api/elections/`
2. Utiliser `getCmsClient()` pour accéder au CMS :

```typescript
export default defineEventHandler(async (event) => {
  const directus = getCmsClient();

  const data = await directus.request(
    readItems('collection_name', {
      fields: ['id', 'name'],
    })
  );

  return data;
});
```

---

## 🧪 Tests

### Script de Vérification

Un script PowerShell est disponible dans le projet principal :

```powershell
.\verify-layer.ps1
```

Ce script vérifie :
- Existence du layer
- Absence de duplications
- Configuration correcte
- État du serveur

### Tests Manuels

```bash
# Tester une API
curl http://localhost:3001/api/elections/dashboard/config

# Vérifier une page
curl -I http://localhost:3001/elections-senegal
```

---

## 📚 Documentation

Pour plus de détails, consultez la documentation dans le projet principal :

- **[DOCUMENTATION_LAYER_INDEX.md](../../DOCUMENTATION_LAYER_INDEX.md)** - Index de toute la documentation
- **[RÉSUMÉ_FINAL_LAYER.md](../../RÉSUMÉ_FINAL_LAYER.md)** - Vue d'ensemble
- **[ARCHITECTURE_LAYER.md](../../ARCHITECTURE_LAYER.md)** - Principes d'architecture
- **[EXEMPLE_CONFIG_DYNAMIQUE.md](../../EXEMPLE_CONFIG_DYNAMIQUE.md)** - Exemples de configuration
- **[EXEMPLE_MIGRATION_COMPOSANT_DYNAMIQUE.md](../../EXEMPLE_MIGRATION_COMPOSANT_DYNAMIQUE.md)** - Tutoriel migration

---

## 🤝 Contribution

### Bonnes Pratiques

1. **Toujours utiliser `useAppConfig()`** pour les données configurables
2. **Jamais de valeurs hard-codées** spécifiques à un pays
3. **Documenter les exports publics**
4. **Préfixer les fonctions** si risque de conflit

### Ne Pas Faire

❌ Hard-coder des valeurs spécifiques à un pays
❌ Dupliquer du code entre projet et layer
❌ Utiliser des noms de fonctions génériques qui peuvent entrer en conflit
❌ Oublier de mettre à jour `app.config.ts` avec les nouveaux labels

---

## 📝 Changelog

### Version 1.1 (2026-01-19)

- ✅ **Routes dynamiques par pays** : Les URLs s'adaptent automatiquement au pays configuré
- ✅ Nouveau composable `useElectionRoutes()` pour gérer les liens
- ✅ Hook `pages:extend` pour générer les routes à la volée
- ✅ Migration complète : aucun lien hardcodé restant
- ✅ Documentation enrichie avec exemples de routes dynamiques

### Version 1.0 (2026-01-15)

- ✅ Layer créé et testé
- ✅ 42 composants, 17 composables, 18 APIs, 5 pages
- ✅ Configuration dynamique via app.config.ts
- ✅ Suppression de toutes les duplications
- ✅ Résolution du conflit getCmsClient
- ✅ Documentation complète créée

---

## 📄 Licence

Propriétaire - Vie Publique Sénégal

---

## 👥 Support

Pour toute question ou problème :

1. Consulter la documentation dans le projet principal
2. Exécuter le script de vérification
3. Vérifier les logs du serveur Nuxt

---

**Créé par** : Vie Publique Sénégal
**Validé** : 2026-01-15
**Version** : 1.0
