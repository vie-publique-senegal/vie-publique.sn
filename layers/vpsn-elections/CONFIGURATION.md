# 📘 CONFIGURATION DU LAYER VPSN-ELECTIONS

## 🎯 Rôle de `app.config.ts`

Le fichier `app.config.ts` est le **cœur de la configuration paramétrable** du layer. Il permet de rendre le layer réutilisable pour différents pays sans modifier le code.

### Différence entre `app.config.ts` et `nuxt.config.ts`

| Fichier | Rôle | Quand l'utiliser |
|---------|------|------------------|
| **`nuxt.config.ts`** | Configuration technique Nuxt (modules, routes, build) | Configuration du framework |
| **`app.config.ts`** | Configuration métier/domaine (labels, features, URLs API) | Configuration paramétrable par pays |

---

## 🔧 Structure de `app.config.ts`

Le `app.config.ts` du layer contient **5 sections principales** :

### 1️⃣ **Configuration Pays** (`country`)

```typescript
country: {
  name: 'Sénégal',  // Nom du pays
  code: 'SN',       // Code ISO du pays
}
```

**Utilisation dans le code :**
```vue
<script setup>
const appConfig = useAppConfig();
const countryName = appConfig.vpsnElections.country.name; // "Sénégal"
</script>

<template>
  <h1>Élections {{ countryName }}</h1>
</template>
```

---

### 2️⃣ **Configuration API** (`api`)

```typescript
api: {
  baseUrl: '/api/elections',  // Base URL pour toutes les routes API élections
}
```

**Utilisation dans les composables :**
```typescript
// Dans un composable
const appConfig = useAppConfig();
const apiUrl = appConfig.vpsnElections.api.baseUrl; // "/api/elections"

// Appel API
const data = await $fetch(`${apiUrl}/dashboard/config`);
```

---

### 3️⃣ **Labels Traduisibles** (`labels`)

```typescript
labels: {
  // Géographie
  departments: 'Départements',
  regions: 'Régions',
  constituencies: 'Circonscriptions',

  // Élections
  presidential: 'Présidentielle',
  legislative: 'Législatives',
  locale: 'Locales',

  // Statuts
  ongoing: 'En Cours',
  completed: 'Terminée',
}
```

**Utilisation dans les templates :**
```vue
<script setup>
const { labels } = useAppConfig().vpsnElections;
</script>

<template>
  <h2>{{ labels.departments }}</h2>
  <p>Type d'élection : {{ labels.presidential }}</p>
</template>
```

**💡 Avantage :** Changer de pays ou de langue en modifiant un seul fichier !

---

### 4️⃣ **Features Toggles** (`features`)

```typescript
features: {
  showDiaspora: true,          // Afficher section diaspora
  showLocalElections: true,    // Afficher élections locales
  showGuide: true,             // Afficher guide électeur
  showLegislation: true,       // Afficher législation
  showStatistics: true,        // Afficher statistiques
  showMaps: true,              // Afficher cartes
  showDocuments: true,         // Afficher documents
  showNews: true,              // Afficher actualités
}
```

**Utilisation conditionnelle :**
```vue
<script setup>
const { features } = useAppConfig().vpsnElections;
</script>

<template>
  <!-- Section diaspora uniquement si activée -->
  <section v-if="features.showDiaspora">
    <h3>Résultats Diaspora</h3>
    <ElectionMapDiasporaCountries />
  </section>

  <!-- Guide électoral uniquement si activé -->
  <div v-if="features.showGuide">
    <ElectionsDashboardGuideElectoralVideos />
  </div>
</template>
```

**💡 Avantage :** Activer/désactiver des fonctionnalités sans toucher au code !

---

### 5️⃣ **Configuration UI** (`ui`)

```typescript
ui: {
  // Nombre d'items par page
  itemsPerPage: {
    coalitions: 12,
    documents: 12,
    news: 3,
  },

  // Durées de cache (en secondes)
  cache: {
    config: 3600,          // 1h
    coalitions: 1800,      // 30min
    constituencies: 1800,   // 30min
    professions: 3600,     // 1h
  },
}
```

**Utilisation dans les composables :**
```typescript
const { ui } = useAppConfig().vpsnElections;

// Pagination
const perPage = ui.itemsPerPage.coalitions; // 12

// Cache
const cacheMaxAge = ui.cache.coalitions; // 1800 secondes
```

---

## 🌍 Override de la Configuration (Multi-pays)

### Exemple 1 : Adapter pour le Mali

Dans le `nuxt.config.ts` du projet parent :

```typescript
export default defineNuxtConfig({
  extends: ['./layers/vpsn-elections'],

  appConfig: {
    vpsnElections: {
      // Override pays
      country: {
        name: 'Mali',
        code: 'ML',
      },

      // Override labels (traductions)
      labels: {
        departments: 'Cercles',        // Mali utilise "Cercles"
        regions: 'Régions',
        constituencies: 'Circonscriptions',
        presidential: 'Présidentielle',
        legislative: 'Législatives',
      },

      // Désactiver la diaspora pour le Mali
      features: {
        showDiaspora: false,
      },
    },
  },
})
```

### Exemple 2 : Adapter pour la Côte d'Ivoire

```typescript
export default defineNuxtConfig({
  extends: ['./layers/vpsn-elections'],

  appConfig: {
    vpsnElections: {
      country: {
        name: 'Côte d\'Ivoire',
        code: 'CI',
      },

      labels: {
        departments: 'Départements',
        regions: 'Régions',
        constituencies: 'Circonscriptions',
      },

      // URL API différente
      api: {
        baseUrl: '/api/elections-ci',  // API spécifique CI
      },
    },
  },
})
```

---

## 📊 Accès à la Configuration dans le Code

### Dans les Composables

```typescript
// composables/elections/dashboard/useElectoralDashboard.ts
export const useElectoralDashboard = () => {
  const appConfig = useAppConfig();
  const config = appConfig.vpsnElections;

  // Utiliser la config
  console.log(config.country.name);          // "Sénégal"
  console.log(config.labels.departments);     // "Départements"
  console.log(config.features.showDiaspora);  // true

  return { config };
};
```

### Dans les Composants

```vue
<script setup lang="ts">
const appConfig = useAppConfig();
const { country, labels, features } = appConfig.vpsnElections;
</script>

<template>
  <div>
    <h1>Élections {{ country.name }}</h1>

    <nav>
      <NuxtLink to="/elections-senegal/carte-electorale">
        {{ labels.map }}
      </NuxtLink>

      <NuxtLink v-if="features.showGuide" to="/elections-senegal/guide-electoral">
        {{ labels.guide }}
      </NuxtLink>

      <NuxtLink v-if="features.showLegislation" to="/elections-senegal/legislation">
        {{ labels.legislation }}
      </NuxtLink>
    </nav>
  </div>
</template>
```

### Dans les Routes API Serveur

```typescript
// server/api/elections/dashboard/config.get.ts
export default defineCachedEventHandler(async (event) => {
  const appConfig = useAppConfig();
  const cache = appConfig.vpsnElections.ui.cache.config;

  // Utiliser la durée de cache configurée
  return { /* data */ };
}, {
  maxAge: appConfig.vpsnElections.ui.cache.config, // 3600 (1h)
  name: 'elections-dashboard-config',
});
```

---

## 🔄 Merge de Configuration

Nuxt **merge automatiquement** les configurations du layer et du projet parent.

**Layer** (`layers/vpsn-elections/app.config.ts`) :
```typescript
{
  vpsnElections: {
    country: { name: 'Sénégal', code: 'SN' },
    labels: { departments: 'Départements' },
    features: { showDiaspora: true },
  }
}
```

**Projet Parent** (`nuxt.config.ts`) :
```typescript
{
  appConfig: {
    vpsnElections: {
      country: { name: 'Mali' },  // Override pays
      // labels et features héritées du layer
    }
  }
}
```

**Résultat Final** (merge automatique) :
```typescript
{
  vpsnElections: {
    country: { name: 'Mali', code: 'SN' },     // 'name' overridé, 'code' hérité
    labels: { departments: 'Départements' },   // Hérité
    features: { showDiaspora: true },          // Hérité
  }
}
```

---

## 🎨 Type Safety (TypeScript)

Le `app.config.ts` inclut une **déclaration de types** pour l'autocomplétion :

```typescript
declare module '@nuxt/schema' {
  interface AppConfigInput {
    vpsnElections?: {
      country?: {
        name?: string
        code?: string
      }
      api?: {
        baseUrl?: string
      }
      labels?: Record<string, string>
      features?: {
        showDiaspora?: boolean
        showLocalElections?: boolean
        // ...
      }
      ui?: {
        itemsPerPage?: Record<string, number>
        cache?: Record<string, number>
      }
    }
  }
}
```

**💡 Avantage :** Autocomplétion dans VS Code pour `useAppConfig().vpsnElections.*`

---

## 📝 Bonnes Pratiques

### ✅ À FAIRE

1. **Utiliser `app.config.ts` pour** :
   - Labels/traductions
   - Features toggles
   - Configuration métier
   - URLs configurables

2. **Accéder via `useAppConfig()`** :
   ```typescript
   const { labels } = useAppConfig().vpsnElections;
   ```

3. **Override dans le projet parent** :
   ```typescript
   // nuxt.config.ts
   appConfig: {
     vpsnElections: {
       country: { name: 'Mali' }
     }
   }
   ```

### ❌ À ÉVITER

1. **Ne PAS utiliser pour** :
   - Secrets/clés API → Utiliser `runtimeConfig`
   - Configuration technique Nuxt → Utiliser `nuxt.config.ts`

2. **Ne PAS accéder directement** :
   ```typescript
   // ❌ INCORRECT
   import appConfig from './app.config';

   // ✅ CORRECT
   const appConfig = useAppConfig();
   ```

---

## 🚀 Exemples d'Utilisation Réels

### Exemple 1 : Menu Navigation Dynamique

```vue
<script setup>
const { labels, features } = useAppConfig().vpsnElections;

const navItems = computed(() => [
  { label: labels.map, to: '/elections-senegal/carte-electorale', show: features.showMaps },
  { label: labels.guide, to: '/elections-senegal/guide-electoral', show: features.showGuide },
  { label: labels.legislation, to: '/elections-senegal/legislation', show: features.showLegislation },
  { label: labels.statistics, to: '/elections-senegal/statistiques', show: features.showStatistics },
].filter(item => item.show));
</script>

<template>
  <nav>
    <NuxtLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
    >
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>
```

### Exemple 2 : Titre SEO Dynamique

```vue
<script setup>
const { country, seo } = useAppConfig().vpsnElections;

useHead({
  title: `${seo.title} - ${country.name}`,
  meta: [
    { name: 'description', content: seo.description },
    { property: 'og:image', content: seo.ogImage },
  ],
});
</script>
```

### Exemple 3 : Composable avec Configuration

```typescript
// composables/elections/dashboard/useElectoralCoalitions.ts
export const useElectoralCoalitions = (options) => {
  const appConfig = useAppConfig();
  const apiBaseUrl = appConfig.vpsnElections.api.baseUrl;
  const perPage = appConfig.vpsnElections.ui.itemsPerPage.coalitions;

  const { data } = await useFetch(`${apiBaseUrl}/dashboard/coalitions`, {
    query: {
      year: options.year,
      type: options.type,
      limit: perPage,
    },
  });

  return { data };
};
```

---

## 🎓 Résumé

| Aspect | Détails |
|--------|---------|
| **Fichier** | `layers/vpsn-elections/app.config.ts` |
| **Rôle** | Configuration paramétrable du layer |
| **Accès** | `useAppConfig().vpsnElections` |
| **Override** | Via `appConfig` dans `nuxt.config.ts` du projet parent |
| **Type Safety** | Oui (déclaration TypeScript incluse) |
| **Merge** | Automatique (layer + projet parent) |

---

**📚 Ressources** :
- [Nuxt App Config Documentation](https://nuxt.com/docs/guide/directory-structure/app-config)
- [Nuxt Layers Documentation](https://nuxt.com/docs/guide/going-further/layers)

---

**Date:** 2026-01-11
**Version Layer:** 0.1.0
