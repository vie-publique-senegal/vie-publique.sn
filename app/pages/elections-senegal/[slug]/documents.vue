<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';

const { currentElection, currentElectionDocuments, loadingConfig } = useElectoralDashboard();

useSeoMeta({
  title: () => currentElection.value?.name
    ? `Documents · ${currentElection.value.name} | Vie-Publique SN`
    : 'Documents Officiels | Élections Sénégal',
  description: () => currentElection.value?.name
    ? `Documents et textes officiels de ${currentElection.value.name}.`
    : 'Documents officiels des élections au Sénégal.',
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-700">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-xl sm:text-2xl font-black uppercase tracking-tighter">Documents Officiels</h2>
        <p class="text-sm text-gray-500">Retrouvez les textes et documents liés à ce scrutin.</p>
      </div>
      <UButton to="/elections-senegal/legislation" variant="ghost" size="xs" icon="i-heroicons-arrow-top-right-on-square" class="self-start sm:self-auto shrink-0">
        Voir toute la législation
      </UButton>
    </div>

    <div class="min-h-[300px]">
      <ElectionsDashboardDocumentsTab
        :documents="currentElectionDocuments"
        :election-name="currentElection?.name"
        :loading="loadingConfig"
      />
    </div>
  </div>
</template>
