# 🔄 WORKFLOW DE DÉVELOPPEMENT - LAYER VPSN-ELECTIONS

Guide complet pour développer, tester et faire évoluer le layer.

---

## 🎯 DEUX MODES DE DÉVELOPPEMENT

### Mode 1️⃣ : Développement dans le Playground (Isolé)

**Quand l'utiliser :**
- Développer/tester des fonctionnalités du layer en isolation
- Tester l'`app.config.ts` et les composables
- Créer de nouveaux composants
- Débugger sans dépendances du projet parent

**Commandes :**
```bash
cd layers/vpsn-elections
npm run dev          # Lance le playground sur http://localhost:3001
npm run build        # Build le playground
```

**Structure playground :**
```
.playground/
├── nuxt.config.ts   # extends: ['..'] (hérite du layer)
├── app.vue          # Layout minimal
└── pages/
    └── index.vue    # Page de test
```

**Avantages :**
- ✅ Rapide (pas de dépendances du projet parent)
- ✅ Isolation complète
- ✅ Idéal pour tester l'`app.config.ts`

**Inconvénients :**
- ⚠️ Pas d'accès aux composables externes (`useCmsCollection`, `useNews`)
- ⚠️ Pas d'accès aux composants globaux (`CmsImage`, `NewsGrid`)

---

### Mode 2️⃣ : Développement dans le Projet Principal (Intégré)

**Quand l'utiliser :**
- Tester le layer avec les vraies données du CMS
- Vérifier l'intégration avec les composables/composants globaux
- Tester les pages finales avec leurs dépendances
- Débugger les problèmes d'intégration

**Commandes :**
```bash
cd /path/to/vpsn  # Racine du projet
npm run dev       # Lance le projet avec le layer activé
```

**Configuration requise :**
```typescript
// nuxt.config.ts du projet principal
export default defineNuxtConfig({
  extends: [
    './layers/vpsn-elections',  // ← ACTIVER LE LAYER
  ],
})
```

**Avantages :**
- ✅ Accès à toutes les dépendances externes
- ✅ Test en conditions réelles
- ✅ Données CMS réelles

**Inconvénients :**
- ⚠️ Plus lent (tout le projet se charge)
- ⚠️ Nécessite le CMS configuré

---

## 🔧 MODIFIER LE LAYER

### 1. Ajouter un Nouveau Composant

**Étape 1 : Créer le composant**
```bash
cd layers/vpsn-elections
# Créer un fichier dans components/elections/...
```

**Exemple :**
```vue
<!-- components/elections/dashboard/NewFeatureCard.vue -->
<script setup lang="ts">
defineProps<{
  title: string;
  data: any[];
}>();
</script>

<template>
  <UCard>
    <h3>{{ title }}</h3>
    <div v-for="item in data" :key="item.id">
      {{ item.name }}
    </div>
  </UCard>
</template>
```

**Étape 2 : Utiliser dans une page du layer**
```vue
<!-- pages/elections-senegal/index.vue -->
<template>
  <div>
    <ElectionsNewFeatureCard title="Test" :data="[]" />
  </div>
</template>
```

**✅ Auto-import :** Le composant est automatiquement disponible (pas besoin d'import)

---

### 2. Ajouter un Nouveau Composable

**Étape 1 : Créer le composable**
```bash
cd layers/vpsn-elections
# Créer un fichier dans composables/elections/...
```

**Exemple :**
```typescript
// composables/elections/dashboard/useElectoralResults.ts
export const useElectoralResults = (options: { year: number; type: string }) => {
  const appConfig = useAppConfig();
  const apiBaseUrl = appConfig.vpsnElections.api.baseUrl;

  const { data, pending, error } = useFetch(`${apiBaseUrl}/dashboard/results`, {
    query: {
      year: options.year,
      type: options.type,
    },
  });

  return {
    results: data,
    loading: pending,
    error,
  };
};
```

**Étape 2 : Utiliser dans un composant**
```vue
<script setup>
const { results, loading } = useElectoralResults({
  year: 2024,
  type: 'legislative',
});
</script>

<template>
  <div v-if="loading">Chargement...</div>
  <div v-else>{{ results }}</div>
</template>
```

**✅ Auto-import :** Le composable est automatiquement disponible

---

### 3. Ajouter une Nouvelle Route API

**Étape 1 : Créer la route API**
```typescript
// server/api/elections/dashboard/results.get.ts
import { readItems } from '@directus/sdk';

export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient() as any;
    const query = getQuery(event);
    const year = parseInt(query.year as string);
    const type = query.type as string;

    try {
      const results = await directus.request(
        readItems('election_results', {
          filter: {
            year: { _eq: year },
            type: { _eq: type },
          },
        })
      );

      return { data: results };
    } catch (error: any) {
      throw createError({
        statusCode: 500,
        message: error.message,
      });
    }
  },
  {
    maxAge: 60 * 30, // Cache 30min
    name: 'elections-dashboard-results',
  }
);
```

**✅ Auto-disponible :** `/api/elections/dashboard/results`

---

### 4. Ajouter une Nouvelle Page

**Étape 1 : Créer la page**
```vue
<!-- pages/elections-senegal/resultats.vue -->
<script setup lang="ts">
const { results, loading } = useElectoralResults({
  year: 2024,
  type: 'legislative',
});

useHead({
  title: 'Résultats Électoraux',
});
</script>

<template>
  <div>
    <h1>Résultats Électoraux</h1>
    <div v-if="loading">Chargement...</div>
    <div v-else>
      <!-- Afficher les résultats -->
    </div>
  </div>
</template>
```

**✅ Auto-disponible :** `/elections-senegal/resultats`

---

### 5. Modifier l'app.config.ts

**Ajouter une nouvelle configuration :**
```typescript
// app.config.ts
export default defineAppConfig({
  vpsnElections: {
    // ... config existante ...

    // ✨ NOUVELLE CONFIGURATION
    results: {
      showPercentage: true,
      showSeats: true,
      showVotes: false,
    },
  },
})

// Ajouter le type
declare module '@nuxt/schema' {
  interface AppConfigInput {
    vpsnElections?: {
      // ... types existants ...

      // ✨ NOUVEAU TYPE
      results?: {
        showPercentage?: boolean
        showSeats?: boolean
        showVotes?: boolean
      }
    }
  }
}
```

**Utiliser dans un composant :**
```vue
<script setup>
const { results } = useAppConfig().vpsnElections;
</script>

<template>
  <div>
    <p v-if="results.showPercentage">{{ percentage }}%</p>
    <p v-if="results.showSeats">{{ seats }} sièges</p>
  </div>
</template>
```

---

## 🧪 TESTER LES MODIFICATIONS

### Test dans le Playground

```bash
cd layers/vpsn-elections
npm run dev
# Ouvrir http://localhost:3001
```

**Créer une page de test :**
```vue
<!-- .playground/pages/test.vue -->
<script setup>
const { results } = useElectoralResults({ year: 2024, type: 'legislative' });
</script>

<template>
  <div>
    <h1>Test Nouvelle Fonctionnalité</h1>
    <pre>{{ results }}</pre>
  </div>
</template>
```

### Test dans le Projet Principal

```bash
cd ../../  # Retour à la racine
npm run dev
# Ouvrir http://localhost:3000/elections-senegal/resultats
```

---

## 📦 DÉPLOYER LES MODIFICATIONS

### Workflow Git Recommandé

```bash
# 1. Créer une branche pour la fonctionnalité
git checkout -b feat/electoral-results

# 2. Faire vos modifications dans layers/vpsn-elections/

# 3. Tester en playground
cd layers/vpsn-elections
npm run dev

# 4. Tester dans le projet principal
cd ../../
npm run dev

# 5. Commiter les modifications
git add layers/vpsn-elections/
git commit -m "feat(layer): ajouter résultats électoraux"

# 6. Push et créer une PR
git push origin feat/electoral-results
```

---

## 🔄 CYCLE DE VIE DU LAYER

```
┌─────────────────────────────────────────────────────────┐
│ 1. DÉVELOPPEMENT (Playground ou Projet Principal)      │
│    - Ajouter composants/composables/pages/API          │
│    - Modifier app.config.ts                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ 2. TESTS                                                │
│    - Playground : npm run dev (dans le layer)          │
│    - Projet : npm run dev (à la racine)                │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ 3. COMMIT & PUSH                                        │
│    - git add layers/vpsn-elections/                    │
│    - git commit -m "feat(layer): ..."                  │
│    - git push                                           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ 4. DÉPLOIEMENT                                          │
│    - Le layer est déployé avec le projet principal     │
│    - Les modifications sont automatiquement actives    │
└─────────────────────────────────────────────────────────┘
```

---

## 🚨 PROBLÈMES COURANTS

### ❌ "Composable outside of setup function"

**Cause :** Mauvaise structure de dossiers ou `app/` au mauvais endroit

**Solution :** Vérifier que la structure est plate :
```
layers/vpsn-elections/
├── components/      ✅ À la racine
├── composables/     ✅ À la racine
├── pages/           ✅ À la racine
└── server/          ✅ À la racine
```

### ❌ "Cannot find module '@/types/...'"

**Cause :** Import absolu non configuré

**Solution :** Utiliser des imports relatifs ou configurer `alias` dans `nuxt.config.ts` :
```typescript
export default defineNuxtConfig({
  alias: {
    '#elections': './composables/elections',
  },
})
```

### ❌ "useCmsCollection is not defined"

**Cause :** Composable externe du projet parent non accessible

**Solution :** Tester dans le projet principal (pas dans le playground)

### ❌ "Property 'vpsnElections' does not exist"

**Cause :** `app.config.ts` mal configuré ou TypeScript cache

**Solution :**
```bash
rm -rf .nuxt
npm run dev
```

---

## 📚 RESSOURCES

- [Nuxt Layers Documentation](https://nuxt.com/docs/guide/going-further/layers)
- [App Config Documentation](https://nuxt.com/docs/guide/directory-structure/app-config)
- [Auto-imports Documentation](https://nuxt.com/docs/guide/concepts/auto-imports)

---

## 💡 BONNES PRATIQUES

### ✅ À FAIRE

1. **Tester dans le playground d'abord** (rapide)
2. **Puis tester dans le projet principal** (conditions réelles)
3. **Utiliser `app.config.ts`** pour la configuration
4. **Documenter** les nouvelles fonctionnalités
5. **Commiter régulièrement**
6. **Nommer les commits** : `feat(layer):`, `fix(layer):`, `docs(layer):`

### ❌ À ÉVITER

1. **Ne PAS créer de dossier `app/`** au premier niveau
2. **Ne PAS importer `useAppConfig` depuis un fichier**
3. **Ne PAS hardcoder** les valeurs (utiliser `app.config.ts`)
4. **Ne PAS oublier** de tester en conditions réelles

---

## 🎓 RÉSUMÉ

| Action | Outil | Commande |
|--------|-------|----------|
| Développer isolé | Playground | `cd layers/vpsn-elections && npm run dev` |
| Développer intégré | Projet principal | `npm run dev` (racine) |
| Ajouter composant | Créer dans `components/` | Auto-import |
| Ajouter composable | Créer dans `composables/` | Auto-import |
| Ajouter route API | Créer dans `server/api/` | Auto-disponible |
| Ajouter page | Créer dans `pages/` | Auto-route |
| Modifier config | Éditer `app.config.ts` | `useAppConfig()` |

---

**Le layer est conçu pour être facile à faire évoluer. Bon développement ! 🚀**

---

**Date:** 2026-01-11
**Version:** 0.1.0
