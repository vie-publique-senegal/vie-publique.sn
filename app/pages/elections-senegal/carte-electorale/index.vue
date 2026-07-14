<script setup lang="ts">
/**
 * Hub de la carte électorale : fiche de la révision consultée (scrutins
 * rattachés avec lien vers leur dashboard, arrêtés officiels) et navigation
 * vers les sous-pages Nationale / Diaspora / Résumé (routes dédiées pour le
 * SEO, cf. nationale/index.vue, diaspora/index.vue, resume/index.vue).
 */

const { siteName, siteUrl, keywords, themeColor } = useSiteMetadata();

const {
  currentRevision: selectedRevision,
  contextQuery,
} = useElectoralRevision({ syncUrl: true });

const title = computed(() => selectedRevision.value?.year
  ? `Carte Électorale ${selectedRevision.value.year} | Élections Sénégal`
  : 'Carte Électorale | Élections Sénégal');
const description = computed(() => selectedRevision.value?.year
  ? `Carte électorale ${selectedRevision.value.year} du Sénégal : lieux de vote, bureaux et statistiques par département et pour la diaspora.`
  : 'Explorez la cartographie électorale du Sénégal : lieux de vote, répartition géographique et statistiques.');
const url = `${siteUrl}/elections-senegal/carte-electorale`;

useSeoMeta({
  title,
  description,
  ogTitle: () => selectedRevision.value?.year
    ? `Carte Électorale ${selectedRevision.value.year} — Sénégal`
    : 'Carte Électorale | Élections Sénégal',
  ogDescription: 'Visualisez la carte électorale du Sénégal à travers le territoire national et la diaspora.',
  ogUrl: url,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  keywords: [...keywords, 'carte électorale sénégal', 'bureaux de vote sénégal', 'lieux de vote sénégal'].join(', '),
});

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Élections', item: `${siteUrl}/elections-senegal` },
    { '@type': 'ListItem', position: 3, name: 'Carte électorale', item: url },
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
  script: [{ type: 'application/ld+json', children: JSON.stringify(breadcrumbSchema) }],
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-8 pb-16">
    <div class="w-full max-w-7xl">
      <AppBreadcrumb
        class="mb-6"
        :items="[
          { label: 'Élections', to: '/elections-senegal' },
          { label: 'Carte électorale' }
        ]"
      />

      <h1 class="text-xl font-bold text-gray-900 md:text-3xl dark:text-white">
        Carte Électorale
      </h1>
      <p class="mt-0.5 max-w-2xl text-xs text-gray-500 md:mt-1 md:text-sm dark:text-gray-400">
        La carte électorale fixe les lieux et bureaux de vote d'une révision du fichier
        électoral. Elle est partagée par tous les scrutins qui s'y rattachent.
      </p>

      <ElectionRevisionCard class="mt-6" />

      <!-- Navigation vers les données nationale / diaspora / résumé -->
      <ElectionMapTabs :query="contextQuery" />
    </div>
  </div>
</template>
