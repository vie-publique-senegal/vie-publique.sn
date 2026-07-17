<script setup lang="ts">
/**
 * Coalitions en lice dans une circonscription (élections locales). Route
 * dédiée et indexable, remplace l'ancien `/candidats?constituency=<id>`.
 */
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useElectoralConstituencies } from '~/composables/elections/dashboard/useElectoralConstituencies';

const route = useRoute();
const router = useRouter();
const constituencySlug = computed(() => route.params.constituencySlug as string);

const { selectedYear, selectedType, currentElection, loadingConfig } = useElectoralDashboard();

const { constituencies, loading: loadingConstituencies } = useElectoralConstituencies({
  year: selectedYear,
  type: selectedType,
});

const constituency = computed(
  () => constituencies.value.find((c) => c.slug === constituencySlug.value) || null,
);

const loading = computed(() => loadingConfig.value || loadingConstituencies.value);
const notFound = computed(() => !loading.value && !constituency.value);

const candidatsUrl = computed(() => `/elections-senegal/${currentElection.value?.slug}/candidats`);

interface SelectCoalitionPayload {
  coalitionId: number | string;
  coalitionSlug?: string | null;
  constituencyId: number | string;
}

const handleSelectCoalition = (payload: SelectCoalitionPayload) => {
  const targetSlug =
    constituencies.value.find((c) => String(c.id) === String(payload.constituencyId))?.slug ??
    constituencySlug.value;
  // La coalition d'une élection locale n'a pas toujours d'entité politique
  // rattachée (slug) : on retombe sur l'id numérique plutôt que de bloquer la navigation.
  const coalitionSegment = payload.coalitionSlug || String(payload.coalitionId);
  router.push(
    `/elections-senegal/${currentElection.value?.slug}/candidats/circonscription/${targetSlug}/coalition/${coalitionSegment}`,
  );
};

useSeoMeta({
  title: () =>
    constituency.value
      ? `${constituency.value.name} · ${currentElection.value?.name || ''} | Vie-Publique SN`
      : 'Circonscription | Élections Sénégal',
  description: () =>
    constituency.value
      ? `Coalitions et listes en lice à ${constituency.value.name} pour ${currentElection.value?.name || 'cette élection'}.`
      : 'Détail de circonscription électorale.',
  ogTitle: () => constituency.value?.name || 'Circonscription',
});
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div v-if="loading" class="animate-in fade-in zoom-in-95 duration-500">
      <USkeleton class="h-72 w-full rounded-2xl" />
    </div>

    <div
      v-else-if="notFound"
      class="rounded-2xl bg-white py-20 text-center ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
    >
      <UIcon
        name="i-heroicons-face-frown"
        class="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-700"
      />
      <h2 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">
        Circonscription introuvable
      </h2>
      <p class="mb-6 text-sm text-gray-500">
        Cette circonscription n'existe pas ou n'est pas encore publiée.
      </p>
      <UButton :to="candidatsUrl" icon="i-heroicons-arrow-left" variant="soft"
        >Retour aux candidats</UButton
      >
    </div>

    <ElectionsDashboardConstituencyCoalitions
      v-else
      :constituency-id="constituency!.id"
      :constituency-name="constituency!.name"
      :year="selectedYear"
      :type="selectedType"
      @close="router.push(candidatsUrl)"
      @select-coalition="handleSelectCoalition"
    />
  </div>
</template>
