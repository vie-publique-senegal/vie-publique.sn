<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';

const { currentElection } = useElectoralDashboard();

useSeoMeta({
  title: () =>
    currentElection.value?.name
      ? `PVs · ${currentElection.value.name}`
      : 'Procès-Verbaux | Élections Sénégal',
  description: () =>
    currentElection.value?.name
      ? `Procès-verbaux de ${currentElection.value.name}.`
      : 'Procès-verbaux des élections au Sénégal.',
  ogTitle: () =>
    currentElection.value?.name
      ? `Procès-Verbaux · ${currentElection.value.name}`
      : 'Procès-Verbaux des Élections au Sénégal',
  ogDescription: () =>
    currentElection.value?.name
      ? `Procès-verbaux officiels de ${currentElection.value.name} — transparence du scrutin.`
      : 'Procès-verbaux officiels des élections au Sénégal.',
});
</script>

<template>
  <div class="animate-in fade-in mx-auto max-w-7xl duration-700">
    <ElectionsDashboardPvsTab :election="currentElection" />
  </div>
</template>
