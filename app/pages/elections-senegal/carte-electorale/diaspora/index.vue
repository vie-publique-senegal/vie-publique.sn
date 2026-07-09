<script setup lang="ts">
/**
 * Carte électorale - vue diaspora (zones officielles + pays).
 * Route dédiée (SEO) ; contexte de révision partagé via useElectoralRevision.
 */

const {
  currentRevision: selectedRevision,
  diasporaFileId,
  contextQuery,
  pending: loadingRevision,
} = useElectoralRevision({ syncUrl: true });

useSeoMeta({
  title: () => selectedRevision.value?.year
    ? `Carte Électorale - Diaspora ${selectedRevision.value.year} | Élections Sénégal`
    : 'Carte Électorale - Diaspora | Élections Sénégal',
  description: () =>
    "Carte électorale de la diaspora sénégalaise : les 8 circonscriptions de l'étranger, leurs pays, bureaux et lieux de vote.",
  ogTitle: () => selectedRevision.value?.year
    ? `Carte Électorale - Diaspora ${selectedRevision.value.year}`
    : 'Carte Électorale - Diaspora',
  ogDescription: () =>
    "Explorez la répartition des électeurs sénégalais de l'étranger par circonscription et par pays.",
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
          { label: 'Diaspora' },
        ]"
      />

      <h1 class="text-xl font-bold text-gray-900 md:text-3xl dark:text-white">
        Carte Électorale - Diaspora
      </h1>
      <p class="mt-0.5 max-w-3xl text-xs text-gray-500 md:mt-1 md:text-sm dark:text-gray-400">
        Les Sénégalais de l'étranger votent dans 8 circonscriptions.
      </p>

      <ElectionRevisionCard class="mt-6" />

      <ElectionMapTabs active="diaspora" :query="contextQuery" />
    </div>

    <div class="w-full max-w-7xl">
      <div v-if="loadingRevision" class="flex h-[400px] w-full items-center justify-center">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
      </div>
      <ElectionDiasporaZones
        v-else
        :electoral-file-id="diasporaFileId"
        :election-id="representativeElectionId"
      />
    </div>
  </div>
</template>
