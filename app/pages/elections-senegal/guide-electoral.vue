<script setup lang="ts">
/**
 * Guide Électoral - Sénégal : vidéos tutorielles filtrables par type de
 * scrutin et par langue (filtres et lightbox gérés par le composant
 * ElectionsDashboardGuideElectoralVideos, avec sync des filtres dans l'URL).
 */

const { siteUrl, siteName } = useSiteMetadata();
const url = `${siteUrl}/elections-senegal/guide-electoral`;

useSeoMeta({
  title: 'Guide Électoral | Élections Sénégal',
  description:
    'Apprenez comment voter au Sénégal : vidéos tutoriels en plusieurs langues, étapes du scrutin et conseils pour exercer votre droit de vote.',
  ogTitle: 'Guide Électoral - Élections Sénégal',
  ogDescription:
    'Découvrez le processus de vote au Sénégal avec nos vidéos explicatives et guides pratiques.',
  ogUrl: url,
});

useHead({
  link: [{ rel: 'canonical', href: url }],
  meta: [
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Élections',
            item: `${siteUrl}/elections-senegal`,
          },
          { '@type': 'ListItem', position: 3, name: 'Guide électoral', item: url },
        ],
      }),
    },
  ],
});
</script>

<template>
  <div class="min-h-screen pb-20 dark:bg-gray-900">
    <div class="container mx-auto max-w-6xl px-4 pt-4">
      <AppBreadcrumb
        :items="[{ label: 'Élections', to: '/elections-senegal' }, { label: 'Guide Électoral' }]"
      />
    </div>

    <header class="container mx-auto max-w-6xl px-4 py-3 md:py-6">
      <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
        Guide de l'Électeur
      </h1>
      <p class="mt-0.5 max-w-2xl text-xs text-gray-500 dark:text-gray-400">
        Apprenez comment voter et découvrez les étapes du scrutin, en vidéo et en plusieurs langues.
      </p>
    </header>

    <main class="container mx-auto max-w-6xl px-4">
      <ElectionsDashboardGuideElectoralVideos />
    </main>
  </div>
</template>
