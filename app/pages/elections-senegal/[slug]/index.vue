<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';

const route = useRoute();
const { config } = useElectoralDashboard();

const electionSlug = route.params.slug as string;

const election = computed(
  () => config.value?.elections?.find((e: any) => e.slug === electionSlug) || null,
);

const defaultTab = computed(() =>
  election.value?.status === 'completed' ? 'resultats' : 'candidats',
);

// Page de transition (redirection vers l'onglet par défaut) : ne pas indexer
useSeoMeta({ robots: 'noindex, follow' });

// Rediriger vers l'onglet par défaut dès que l'élection est connue
watchEffect(() => {
  if (election.value) {
    navigateTo(`/elections-senegal/${electionSlug}/${defaultTab.value}`, { replace: true });
  }
});
</script>

<template>
  <div class="flex items-center justify-center py-32">
    <div
      class="border-t-primary-600 h-12 w-12 animate-spin rounded-full border-4 border-gray-300"
    ></div>
  </div>
</template>
