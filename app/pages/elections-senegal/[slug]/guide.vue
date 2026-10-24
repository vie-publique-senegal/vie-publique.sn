<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';

const { selectedType, currentElection } = useElectoralDashboard();

useSeoMeta({
  title: () =>
    currentElection.value?.name
      ? `Guide de vote · ${currentElection.value.name}`
      : 'Guide de vote | Élections Sénégal',
  description: () => 'Apprenez comment voter et participez à la vie démocratique du Sénégal.',
  ogTitle: () =>
    currentElection.value?.name
      ? `Guide de vote · ${currentElection.value.name}`
      : 'Guide de vote — Élections Sénégal',
  ogDescription: () =>
    'Apprenez comment voter au Sénégal : étapes du scrutin, guide pratique et vidéos explicatives.',
});
</script>

<template>
  <div class="animate-in fade-in mx-auto max-w-7xl duration-700">
    <ElectionsDashboardGuideElectoralVideos :type-election="selectedType" />
  </div>
</template>
