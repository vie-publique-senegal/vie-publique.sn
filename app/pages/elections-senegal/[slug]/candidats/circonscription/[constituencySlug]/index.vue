<script setup lang="ts">
/**
 * Coalitions en lice dans une circonscription (élections locales). Route
 * dédiée et indexable, remplace l'ancien `/candidats?constituency=<id>`.
 */
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useElectoralConstituencies } from '~/composables/elections/dashboard/useElectoralConstituencies';
import type { CoalitionLinkPayload } from '~/components/elections/dashboard/ConstituencyCoalitions.vue';

const route = useRoute();
const constituencySlug = computed(() => route.params.constituencySlug as string);

const { selectedYear, selectedType, currentElection, loadingConfig, configFailed } =
  useElectoralDashboard();

const {
  constituencies,
  loading: loadingConstituencies,
  error: constituenciesError,
} = useElectoralConstituencies({
  year: selectedYear,
  type: selectedType,
});

const constituency = computed(
  () => constituencies.value.find((c) => c.slug === constituencySlug.value) || null,
);

const loading = computed(() => loadingConfig.value || loadingConstituencies.value);
const notFound = computed(() => !loading.value && !constituency.value);
// 404 HTTP seulement si les données ont bien été lues (une panne CMS n'est pas un « introuvable »)
const sendNotFoundStatus = computed(() => !configFailed.value && !constituenciesError.value);

const candidatsUrl = computed(() => `/elections-senegal/${currentElection.value?.slug}/candidats`);

const coalitionUrl = (payload: CoalitionLinkPayload) => {
  // La coalition d'une élection locale n'a pas toujours d'entité politique
  // rattachée (slug) : on retombe sur l'id numérique plutôt que de bloquer la navigation.
  const coalitionSegment = payload.coalitionSlug || String(payload.coalitionId);
  // Liste d'une commune/ville du département : URL propre
  // `/circonscription/<département>/<commune>/coalition/<coalition>` (indexable).
  const isDepartmentList = String(payload.constituencyId) === String(constituency.value?.id);
  const communeSegment =
    !isDepartmentList && payload.constituencySlug ? `/${payload.constituencySlug}` : '';
  return `/elections-senegal/${currentElection.value?.slug}/candidats/circonscription/${constituencySlug.value}${communeSegment}/coalition/${coalitionSegment}`;
};

useSeoMeta({
  title: () =>
    constituency.value
      ? `${constituency.value.name} · ${currentElection.value?.name || ''}`
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
      <AppResponseStatus v-if="sendNotFoundStatus" :code="404" />
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
      :back-url="candidatsUrl"
      :coalition-url="coalitionUrl"
    />
  </div>
</template>
