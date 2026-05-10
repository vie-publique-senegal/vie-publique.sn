<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';

const { selectedType, currentElection } = useElectoralDashboard();

useSeoMeta({
  title: () => currentElection.value?.name
    ? `Guide de vote · ${currentElection.value.name} | Vie-Publique SN`
    : 'Guide de vote | Élections Sénégal',
  description: () => 'Apprenez comment voter et participez à la vie démocratique du Sénégal.',
});
</script>

<template>
  <div class="max-w-7xl mx-auto animate-in fade-in duration-700">
    <ElectionsDashboardGuideElectoralVideos :type-election="selectedType" />
  </div>
</template>
