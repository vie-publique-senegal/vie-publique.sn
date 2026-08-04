<script setup lang="ts">
import type { RegionGeo } from '~~/types/collectivite';
import type { DataTableColumn } from '~/composables/collectivites/dataTable';
import { formatNumber } from '#shared/format';
import { useRegionsGeo } from '~/composables/collectivites/useRegionsGeo';

// Hub des régions : le niveau qui manquait entre l'annuaire et le département.
// Pas de recherche ici, contrairement au hub des départements — 14 lignes se
// parcourent d'un coup d'œil, un champ de recherche serait du décor.
const { siteName, siteUrl, themeColor } = useSiteMetadata();

const { regions, total, totalCollectivites, totalDepartements } = useRegionsGeo();

const columns = computed<DataTableColumn<RegionGeo>[]>(() => [
  { key: 'nom', label: 'Région', value: (r) => r.nom },
  {
    key: 'departements',
    label: 'Départements',
    align: 'right',
    value: (r) => formatNumber(r.nbDepartements),
  },
  {
    key: 'collectivites',
    label: 'Collectivités',
    align: 'right',
    value: (r) => formatNumber(r.nbCollectivites),
  },
  {
    key: 'population',
    label: 'Population',
    align: 'right',
    value: (r) => (r.population === null ? null : formatNumber(r.population)),
  },
]);

const populationTotale = computed(() =>
  regions.value.reduce((sum, r) => sum + (r.population ?? 0), 0),
);

// ── SEO (en dernier — helpers et computeds déclarés avant) ─────────
const pageTitle = 'Régions du Sénégal : départements et communes de chaque région';
const pageDescription =
  'Les 14 régions du Sénégal : nombre de départements, de communes et population au recensement 2023. Accédez aux collectivités territoriales de chaque région.';
const pageUrl = `${siteUrl}/collectivites-territoriales/regions`;

useSeoMeta({
  title: pageTitle,
  ogTitle: pageTitle,
  description: pageDescription,
  ogDescription: pageDescription,
  ogUrl: pageUrl,
  ogType: 'website',
  twitterCard: 'summary_large_image',
});

// Nœud d'entité propre à la page (le BreadcrumbList est émis par <AppBreadcrumb>).
const collectionPageSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: pageTitle,
  description: pageDescription,
  url: pageUrl,
  inLanguage: 'fr-SN',
  isPartOf: { '@type': 'WebSite', name: siteName, url: siteUrl },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: regions.value.length,
    itemListElement: regions.value.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `Région de ${r.nom}`,
      url: `${siteUrl}/collectivites-territoriales/regions/${r.slug}`,
    })),
  },
}));

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: [{ rel: 'canonical', href: pageUrl }],
  meta: [
    { name: 'robots', content: 'index, follow' },
    { name: 'theme-color', content: themeColor },
  ],
  script: [
    {
      key: 'ld-regions',
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(collectionPageSchema.value)),
    },
  ],
});
</script>

<template>
  <div class="min-h-screen pb-16">
    <div class="mx-auto max-w-7xl px-4 pt-2">
      <AppBreadcrumb
        :items="[
          { label: 'Collectivités territoriales', to: '/collectivites-territoriales' },
          { label: 'Régions' },
        ]"
      />
    </div>

    <header class="mx-auto max-w-7xl px-4 pt-4">
      <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
        Les régions du Sénégal
      </h1>
      <p class="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Choisissez une région pour voir ses départements et l'ensemble de ses communes. Le découpage
        et les populations proviennent du référentiel officiel (recensement 2023).
      </p>

      <div
        class="mt-4 flex flex-wrap gap-6 border-b border-gray-100 py-4 text-sm dark:border-gray-700"
      >
        <div>
          <span class="font-bold text-gray-900 dark:text-white">{{ formatNumber(total) }}</span>
          <span class="text-gray-500 dark:text-gray-400"> régions</span>
        </div>
        <div>
          <span class="font-bold text-gray-900 dark:text-white">{{
            formatNumber(totalDepartements)
          }}</span>
          <span class="text-gray-500 dark:text-gray-400"> départements</span>
        </div>
        <div>
          <span class="font-bold text-gray-900 dark:text-white">{{
            formatNumber(totalCollectivites)
          }}</span>
          <span class="text-gray-500 dark:text-gray-400"> collectivités</span>
        </div>
        <div>
          <span class="font-bold text-gray-900 dark:text-white">{{
            formatNumber(populationTotale)
          }}</span>
          <span class="text-gray-500 dark:text-gray-400"> habitants (RGPH 2023)</span>
        </div>
      </div>
    </header>

    <section class="mx-auto mt-6 max-w-7xl px-4">
      <CollectivitesDataTable
        :rows="regions"
        :columns="columns"
        :row-key="(r: RegionGeo) => r.slug"
        :to="(r: RegionGeo) => `/collectivites-territoriales/regions/${r.slug}`"
      />

      <p
        v-if="regions.length === 0"
        class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        Le référentiel des régions n'est pas disponible pour le moment.
      </p>
    </section>
  </div>
</template>
