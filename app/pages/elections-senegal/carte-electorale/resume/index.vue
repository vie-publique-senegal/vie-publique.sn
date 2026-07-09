<script setup lang="ts">
/**
 * Carte électorale - résumé (statistiques globales national + diaspora).
 * Route dédiée (SEO) ; contexte de révision partagé via useElectoralRevision.
 */

const {
  currentRevision: selectedRevision,
  revisionLabel,
  contextQuery,
  pending: loadingRevision,
} = useElectoralRevision({ syncUrl: true });

useSeoMeta({
  title: () => selectedRevision.value?.year
    ? `Résumé - Carte Électorale ${selectedRevision.value.year} | Élections Sénégal`
    : 'Résumé - Carte Électorale | Élections Sénégal',
  description: () =>
    'Statistiques globales de la carte électorale du Sénégal : électeurs, bureaux et lieux de vote, national et diaspora.',
  ogTitle: () => selectedRevision.value?.year
    ? `Résumé - Carte Électorale ${selectedRevision.value.year}`
    : 'Résumé - Carte Électorale',
  ogDescription: () => 'Chiffres clés de la carte électorale du Sénégal.',
});

const representativeElectionId = computed(() => {
  const elections = selectedRevision.value?.elections || [];
  return elections.length > 0 ? String(elections[0].id) : null;
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-8 pb-16">
    <div class="w-full max-w-7xl mb-6">
      <AppBreadcrumb
        class="mb-6"
        :items="[
          { label: 'Élections', to: '/elections-senegal' },
          { label: 'Carte électorale', to: { path: '/elections-senegal/carte-electorale', query: contextQuery } },
          { label: 'Résumé' },
        ]"
      />

      <h1 class="text-xl font-bold text-gray-900 md:text-3xl dark:text-white">
        Résumé de la Carte Électorale
      </h1>
      <p class="mt-0.5 max-w-3xl text-xs text-gray-500 md:mt-1 md:text-sm dark:text-gray-400">
        <span v-if="revisionLabel">{{ revisionLabel }}</span>
      </p>

      <ElectionRevisionCard class="mt-6" />

      <ElectionMapTabs active="resume" :query="contextQuery" />
    </div>

    <div class="w-full max-w-7xl">
      <div v-if="loadingRevision" class="flex h-[400px] w-full items-center justify-center">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
      </div>
      <ElectionMapSummary v-else :election-id="representativeElectionId" />
    </div>
  </div>
</template>
