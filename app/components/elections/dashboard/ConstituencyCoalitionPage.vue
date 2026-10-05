<script setup lang="ts">
/**
 * Page « coalition dans une circonscription » (élections locales), partagée par :
 * - `/circonscription/<département>/coalition/<coalition>` : toutes les listes du département ;
 * - `/circonscription/<département>/<commune>/coalition/<coalition>` : la liste d'une
 *   commune ou ville (URL propre et indexable, slug de circonscription de la commune).
 * Remplace l'ancien `/candidats?constituency=<id>&coalition=<id>`.
 *
 * Résout le département ; listes et coalition sont lues par
 * `ElectionsDashboardConstituencyCoalitionDetail`, monté une fois l'id connu (SSR).
 */
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useElectoralConstituencies } from '~/composables/elections/dashboard/useElectoralConstituencies';

const route = useRoute();
const constituencySlug = computed(() => route.params.constituencySlug as string);
const coalitionSlugParam = computed(() => route.params.coalitionSlug as string);
const communeSlug = computed(() => (route.params.communeSlug as string | undefined) || null);

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
const constituencyUrl = computed(
  () => `${candidatsUrl.value}/circonscription/${constituencySlug.value}`,
);

// Titre de repli ; le composant enfant, déclaré après, le remplace par « Coalition · Lieu ».
useSeoMeta({ title: 'Coalition | Élections Sénégal' });
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

    <ElectionsDashboardConstituencyCoalitionDetail
      v-else
      :constituency-id="constituency!.id"
      :constituency-name="constituency!.name"
      :coalition-slug="coalitionSlugParam"
      :commune-slug="communeSlug"
      :year="selectedYear"
      :type="selectedType"
      :candidats-url="candidatsUrl"
      :constituency-url="constituencyUrl"
    />
  </div>
</template>
