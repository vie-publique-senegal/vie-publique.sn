<script setup lang="ts">
/**
 * Détail d'une coalition au sein d'une circonscription (élections locales).
 * Remplace l'ancien `/candidats?constituency=<id>&coalition=<id>`.
 */
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useElectoralConstituencies } from '~/composables/elections/dashboard/useElectoralConstituencies';
import { useElectoralDashboardLists } from '~/composables/elections/dashboard/useElectoralDashboardLists';

const route = useRoute();
const router = useRouter();
const constituencySlug = computed(() => route.params.constituencySlug as string);
const coalitionSlugParam = computed(() => route.params.coalitionSlug as string);

const { selectedYear, selectedType, currentElection, loadingConfig } = useElectoralDashboard();

const { constituencies, loading: loadingConstituencies } = useElectoralConstituencies({
  year: selectedYear,
  type: selectedType,
});

const constituency = computed(
  () => constituencies.value.find((c) => c.slug === constituencySlug.value) || null,
);

const { lists, loading: loadingLists } = useElectoralDashboardLists({
  constituencyId: computed(() => (constituency.value ? String(constituency.value.id) : null)),
  year: selectedYear,
  type: selectedType,
});

// La coalition d'une élection locale n'a pas toujours de slug (entité politique
// non rattachée) : on matche par slug si disponible, sinon par id numérique.
const matchedList = computed(() => {
  if (!lists.value.length) return null;
  return (
    (lists.value as any[]).find(
      (l) => l.coalition?.political_entity?.slug === coalitionSlugParam.value,
    ) ||
    (lists.value as any[]).find((l) => String(l.coalition?.id) === coalitionSlugParam.value) ||
    null
  );
});

const loading = computed(
  () => loadingConfig.value || loadingConstituencies.value || loadingLists.value,
);
const notFound = computed(() => !loading.value && (!constituency.value || !matchedList.value));

const candidatsUrl = computed(() => `/elections-senegal/${currentElection.value?.slug}/candidats`);
const constituencyUrl = computed(
  () => `${candidatsUrl.value}/circonscription/${constituencySlug.value}`,
);

useSeoMeta({
  title: () =>
    matchedList.value?.coalition?.name && constituency.value
      ? `${matchedList.value.coalition.name} · ${constituency.value.name} | Vie-Publique SN`
      : 'Coalition | Élections Sénégal',
  description: () =>
    matchedList.value?.coalition?.name && constituency.value
      ? `Candidats de ${matchedList.value.coalition.name} à ${constituency.value.name}.`
      : undefined,
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
      <h2 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Coalition introuvable</h2>
      <p class="mb-6 text-sm text-gray-500">
        Cette coalition n'existe pas dans cette circonscription.
      </p>
      <UButton :to="candidatsUrl" icon="i-heroicons-arrow-left" variant="soft"
        >Retour aux candidats</UButton
      >
    </div>

    <div v-else class="animate-in fade-in zoom-in-95 duration-500">
      <ElectionsDashboardCoalitionDetails
        :coalition-id="String(matchedList!.coalition.id)"
        :coalition-name="matchedList!.coalition.name"
        :year="selectedYear"
        :type="selectedType"
        :constituency-id="constituency!.id"
        @close="router.push(constituencyUrl)"
      />
    </div>
  </div>
</template>
