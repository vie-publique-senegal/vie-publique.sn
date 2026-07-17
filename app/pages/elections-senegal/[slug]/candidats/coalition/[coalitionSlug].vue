<script setup lang="ts">
/**
 * Détail d'une coalition (présidentielle : profil candidat ; législatives :
 * listes et candidats). Route dédiée et indexable, remplace l'ancien
 * `/candidats?coalition=<id>` : le slug vient de political_entity.slug.
 */
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useElectoralCoalitions } from '~/composables/elections/dashboard/useElectoralCoalitions';

const route = useRoute();
const router = useRouter();
const coalitionSlug = computed(() => route.params.coalitionSlug as string);

const { selectedYear, selectedType, currentElection, loadingConfig } = useElectoralDashboard();

const { coalitions, loading: loadingCoalitions } = useElectoralCoalitions({
  year: selectedYear,
  type: selectedType,
  ranking: true,
  search: ref(''),
});

const coalition = computed(
  () => coalitions.value.find((c) => c.political_entity?.slug === coalitionSlug.value) || null,
);

const loading = computed(() => loadingConfig.value || loadingCoalitions.value);
const notFound = computed(() => !loading.value && !coalition.value);

const candidatsUrl = computed(() => `/elections-senegal/${currentElection.value?.slug}/candidats`);

useSeoMeta({
  title: () =>
    coalition.value
      ? `${coalition.value.name} · ${currentElection.value?.name || ''} | Vie-Publique SN`
      : 'Coalition | Élections Sénégal',
  description: () =>
    coalition.value
      ? `Candidats, listes et résultats de ${coalition.value.name} pour ${currentElection.value?.name || 'cette élection'}.`
      : 'Détail de coalition électorale.',
  ogTitle: () => coalition.value?.name || 'Coalition',
  ogDescription: () =>
    coalition.value ? `Candidats, listes et résultats de ${coalition.value.name}.` : undefined,
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
        Cette coalition n'existe pas ou n'est pas encore publiée.
      </p>
      <UButton :to="candidatsUrl" icon="i-heroicons-arrow-left" variant="soft"
        >Retour aux candidats</UButton
      >
    </div>

    <div v-else class="animate-in fade-in zoom-in-95 duration-500">
      <ElectionsDashboardCoalitionDetails
        :coalition-id="String(coalition!.id)"
        :coalition-name="coalition!.name"
        :year="selectedYear"
        :type="selectedType"
        @close="router.push(candidatsUrl)"
      />
    </div>
  </div>
</template>
