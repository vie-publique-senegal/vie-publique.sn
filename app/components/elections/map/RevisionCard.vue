<script setup lang="ts">
/**
 * Fiche de la révision de carte électorale consultée (sélecteur de révision,
 * scrutins rattachés, arrêtés officiels) : affichée sur le hub et les 3
 * sous-pages carte-electorale (nationale/diaspora/résumé) pour garder le
 * contexte de révision visible pendant la navigation entre onglets.
 */

const {
  revisions,
  currentRevision: selectedRevision,
  currentRevisionKey,
  revisionOptions,
  setRevision,
  elections,
  pending: loadingRevisions,
} = useElectoralRevision();

const { data: summaryTotals } = await useFetch<{
  total?: { voters: number; offices: number; places: number };
}>('/api/elections/map/summary', {
  key: computed(
    () =>
      `revision-summary-${selectedRevision.value?.national?.id ?? selectedRevision.value?.diaspora?.id ?? 'latest'}`,
  ),
  query: computed(() => {
    const election = selectedRevision.value?.elections?.[0];
    return election ? { election: String(election.id) } : {};
  }),
  watch: [selectedRevision],
  default: () => ({}),
});

const formatNumber = (value?: number | null) =>
  value === null || value === undefined ? '' : value.toLocaleString('fr-FR');

const revisionTotals = computed(() => {
  const total = summaryTotals.value?.total;
  if (!total?.voters) return '';
  return `${formatNumber(total.voters)} électeurs · ${formatNumber(total.offices)} bureaux · ${formatNumber(total.places)} lieux de vote`;
});

const officialDocuments = computed(() =>
  selectedRevision.value ? officialDocumentsOf(selectedRevision.value) : [],
);
</script>

<template>
  <div class="mb-6">
    <!-- Mobile : sélecteur au-dessus du box (position conservée) -->
    <div v-if="revisions.length > 1" class="mb-3 flex justify-end md:hidden">
      <USelect
        :model-value="currentRevisionKey"
        :options="revisionOptions"
        :loading="loadingRevisions"
        size="md"
        class="w-full"
        placeholder="Révision"
        @update:model-value="setRevision"
      />
    </div>

    <div
      v-if="selectedRevision"
      class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/60"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <UIcon name="i-heroicons-map" class="text-primary-600 h-5 w-5 shrink-0" />
          <span class="font-bold dark:text-white">
            Carte électorale {{ selectedRevision.year }}
          </span>
          <span v-if="revisionTotals" class="text-sm text-gray-500 dark:text-gray-400">
            {{ revisionTotals }}
          </span>
        </div>

        <!-- Desktop : sélecteur intégré au box d'infos/stats -->
        <USelect
          v-if="revisions.length > 1"
          :model-value="currentRevisionKey"
          :options="revisionOptions"
          :loading="loadingRevisions"
          size="md"
          class="hidden w-56 md:block"
          placeholder="Révision"
          @update:model-value="setRevision"
        />
      </div>

      <!-- Scrutins rattachés (liste extensible, lien vers le tableau de bord de chacun) -->
      <div v-if="elections.length" class="flex flex-col gap-2">
        <span class="text-xs font-semibold uppercase text-gray-400">
          {{ elections.length > 1 ? `${elections.length} scrutins rattachés` : 'Scrutin rattaché' }}
        </span>
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            v-for="election in elections"
            :key="election.id"
            :to="election.dashboardUrl ?? undefined"
            size="xs"
            color="primary"
            :variant="election.dashboardUrl ? 'soft' : 'solid'"
            :trailing-icon="election.dashboardUrl ? 'i-heroicons-arrow-right' : undefined"
          >
            {{ election.label }}
          </UButton>
        </div>
      </div>

      <div v-if="officialDocuments.length" class="flex flex-wrap items-center gap-2">
        <UButton
          v-for="doc in officialDocuments"
          :key="doc.to"
          :to="doc.to"
          size="xs"
          color="gray"
          variant="soft"
          icon="i-heroicons-document-text"
          trailing-icon="i-heroicons-chevron-right"
        >
          {{ doc.label }}
        </UButton>
      </div>
    </div>
  </div>
</template>
