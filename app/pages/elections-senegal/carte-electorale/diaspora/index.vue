<script setup lang="ts">
/**
 * Carte électorale - vue diaspora (zones officielles + pays).
 * Route dédiée (SEO) ; contexte de révision partagé via useElectoralRevision.
 */

const { siteName, siteUrl, keywords, themeColor } = useSiteMetadata();

const {
  currentRevision: selectedRevision,
  diasporaFileId,
  contextQuery,
} = useElectoralRevision({ syncUrl: true });

const title = computed(() =>
  selectedRevision.value?.year
    ? `Carte Électorale - Diaspora ${selectedRevision.value.year} | Élections Sénégal`
    : 'Carte Électorale - Diaspora | Élections Sénégal',
);
const description =
  "Carte électorale de la diaspora sénégalaise : les 8 circonscriptions de l'étranger, leurs pays, bureaux et lieux de vote.";
const url = `${siteUrl}/elections-senegal/carte-electorale/diaspora`;

useSeoMeta({
  title,
  description,
  ogTitle: () =>
    selectedRevision.value?.year
      ? `Carte Électorale - Diaspora ${selectedRevision.value.year}`
      : 'Carte Électorale - Diaspora',
  ogDescription:
    "Explorez la répartition des électeurs sénégalais de l'étranger par circonscription et par pays.",
  ogUrl: url,
  ogImage: `${siteUrl}/images/share-linkedin.png`,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: `${siteUrl}/images/share-linkedin.png`,
  keywords: [...keywords, 'carte électorale diaspora sénégal', 'vote sénégalais étranger'].join(
    ', ',
  ),
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
    { '@type': 'ListItem', position: 4, name: 'Diaspora', item: url },
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
          { label: 'Diaspora' },
        ]"
      />

      <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
        Carte Électorale - Diaspora
      </h1>
      <p class="mt-0.5 max-w-3xl text-xs text-gray-500 dark:text-gray-400">
        Les Sénégalais de l'étranger votent dans 8 circonscriptions.
      </p>

      <ElectionsMapRevisionCard class="mt-6" />

      <ElectionsMapTabs active="diaspora" :query="contextQuery" />
    </div>

    <div class="w-full max-w-7xl">
      <ElectionsMapDiasporaZones
        :electoral-file-id="diasporaFileId"
        :election-id="representativeElectionId"
      />
    </div>
  </div>
</template>
