<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';

const { currentElection } = useElectoralDashboard();

useSeoMeta({
  title: () => currentElection.value?.name
    ? `PVs · ${currentElection.value.name} | Vie-Publique SN`
    : 'Procès-Verbaux | Élections Sénégal',
  description: () => currentElection.value?.name
    ? `Procès-verbaux de ${currentElection.value.name}.`
    : 'Procès-verbaux des élections au Sénégal.',
});
</script>

<template>
  <div class="max-w-7xl mx-auto animate-in fade-in duration-700">
    <ElectionsDashboardPvsTab :election="currentElection" />
  </div>
</template>
