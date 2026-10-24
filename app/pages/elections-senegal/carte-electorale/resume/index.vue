<script setup lang="ts">
/**
 * Carte électorale - résumé (statistiques globales national + diaspora).
 * Route dédiée (SEO) ; contexte de révision partagé via useElectoralRevision.
 */

const { siteName, siteUrl, keywords, themeColor } = useSiteMetadata();

const {
  currentRevision: selectedRevision,
  revisionLabel,
  contextQuery,
} = useElectoralRevision({ syncUrl: true });

const title = computed(() =>
  selectedRevision.value?.year
    ? `Résumé - Carte Électorale ${selectedRevision.value.year} | Élections Sénégal`
    : 'Résumé - Carte Électorale | Élections Sénégal',
);
const description =
  'Statistiques globales de la carte électorale du Sénégal : électeurs, bureaux et lieux de vote, national et diaspora.';
const url = `${siteUrl}/elections-senegal/carte-electorale/resume`;

useSeoMeta({
  title,
  description,
  ogTitle: () =>
    selectedRevision.value?.year
      ? `Résumé - Carte Électorale ${selectedRevision.value.year}`
      : 'Résumé - Carte Électorale',
  ogDescription: 'Chiffres clés de la carte électorale du Sénégal.',
  ogUrl: url,
  ogImage: `${siteUrl}/images/share-linkedin.png`,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: `${siteUrl}/images/share-linkedin.png`,
  keywords: [...keywords, 'statistiques carte électorale sénégal'].join(', '),
});

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Élections', item: `${siteUrl}/elections-senegal` },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Carte électorale',
      item: `${siteUrl}/elections-senegal/carte-electorale/nationale`,
    },
    { '@type': 'ListItem', position: 4, name: 'Résumé', item: url },
  ],
};

useHead({
  link: [{ rel: 'canonical', href: url }],
  meta: [
    { name: 'theme-color', content: themeColor },
    { name: 'author', content: siteName },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
    { name: 'robots', content: 'index, follow' },
    { name: 'geo.region', content: 'SN' },
  ],
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbSchema) }],
});

const representativeElectionId = computed(() => {
  const elections = selectedRevision.value?.elections || [];
  return elections.length > 0 ? String(elections[0].id) : null;
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-8 pb-16">
    <div class="mb-6 w-full max-w-7xl">
      <AppBreadcrumb
        class="mb-6"
        :items="[
          { label: 'Élections', to: '/elections-senegal' },
          {
            label: 'Carte électorale',
            to: { path: '/elections-senegal/carte-electorale/nationale', query: contextQuery },
          },
          { label: 'Résumé' },
        ]"
      />

      <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
        Résumé de la Carte Électorale
      </h1>
      <p class="mt-0.5 max-w-3xl text-xs text-gray-500 dark:text-gray-400">
        <span v-if="revisionLabel">{{ revisionLabel }}</span>
      </p>

      <ElectionsMapRevisionCard class="mt-6" />

      <ElectionsMapTabs active="resume" :query="contextQuery" />
    </div>

    <div class="w-full max-w-7xl">
      <ElectionsMapSummary :election-id="representativeElectionId" />
    </div>
  </div>
</template>
