<script setup lang="ts">
import { formatNumber } from '#shared/format';
import { useDepartementGeo } from '~/composables/collectivites/useDepartementsGeo';

// Page hub d'un département : liste ses communes et renvoie vers leurs fiches.
// Pas de filtre ni de pagination - un département compte au plus une trentaine
// de collectivités, toutes tiennent sur la page (et donc dans le HTML indexé).
const route = useRoute();
const { siteName, siteUrl, themeColor } = useSiteMetadata();

const slug = computed(() => route.params.slug as string);

const { departement, communes, voisins } = await useDepartementGeo(slug);

if (!departement.value) {
  throw createError({ statusCode: 404, statusMessage: 'Département introuvable', fatal: true });
}

const nom = computed(() => departement.value?.nom ?? '');
const region = computed(() => departement.value?.region ?? '');

// Repères chiffrés : même bandeau sobre que l'annuaire (valeur en gras suivie de
// son libellé), pas des tuiles.
const reperes = computed(() => {
  const dep = departement.value;
  if (!dep) return [];
  return [
    {
      key: 'collectivites',
      valeur: formatNumber(dep.nbCollectivites),
      libelle: ` collectivité${dep.nbCollectivites > 1 ? 's' : ''}`,
    },
    ...(dep.population !== null
      ? [
          {
            key: 'population',
            valeur: formatNumber(dep.population),
            // Cumul explicitement partiel quand toutes les communes ne sont pas
            // renseignées : on préfère le dire qu'afficher un total qui paraît
            // complet.
            libelle:
              dep.avecPopulation === dep.nbCollectivites
                ? ` habitants (RGPH ${dep.populationAnnee})`
                : ` habitants (RGPH ${dep.populationAnnee}, sur ${dep.avecPopulation} des ${dep.nbCollectivites} collectivités)`,
          },
        ]
      : []),
  ];
});

// « Maire » ne s'affiche que si le département a au moins un maire au
// référentiel : une colonne entièrement vide n'apprend rien.
const colonnesCommunes = computed<('maire' | 'arrondissement' | 'population')[]>(() =>
  communes.value.some((c) => c.maire)
    ? ['maire', 'arrondissement', 'population']
    : ['arrondissement', 'population'],
);

// ── SEO (en dernier - helpers et computeds déclarés avant) ─────────
const pageUrl = computed(
  () => `${siteUrl}/collectivites-territoriales/departements/${departement.value?.slug}`,
);
const pageTitle = computed(
  () => `Communes du département de ${nom.value} (région de ${region.value})`,
);
const pageDescription = computed(() => {
  const dep = departement.value;
  if (!dep) return '';
  const habitants =
    dep.population !== null ? `, ${formatNumber(dep.population)} habitants recensés` : '';
  return `Les ${dep.nbCollectivites} collectivités du département de ${dep.nom}, région de ${dep.region}${habitants}. Maire, population et contact de chaque commune.`;
});

useSeoMeta({
  title: pageTitle,
  ogTitle: pageTitle,
  description: pageDescription,
  ogDescription: pageDescription,
  ogUrl: pageUrl,
  ogType: 'website',
  twitterCard: 'summary_large_image',
});

const collectionPageSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: pageTitle.value,
  description: pageDescription.value,
  url: pageUrl.value,
  inLanguage: 'fr-SN',
  isPartOf: { '@type': 'WebSite', name: siteName, url: siteUrl },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: communes.value.length,
    itemListElement: communes.value.map((commune, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: commune.nom,
      url: `${siteUrl}/collectivites-territoriales/communes/${commune.slug}`,
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
      key: 'ld-departement',
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(collectionPageSchema.value)),
    },
  ],
});
</script>

<template>
  <div v-if="departement" class="min-h-screen pb-16">
    <div class="mx-auto max-w-7xl px-4 pt-2">
      <AppBreadcrumb
        :items="[
          { label: 'Collectivités territoriales', to: '/collectivites-territoriales' },
          { label: 'Départements', to: '/collectivites-territoriales/departements' },
          { label: departement.nom },
        ]"
      />
    </div>

    <header class="mx-auto max-w-7xl px-4 pt-4">
      <!-- Même échelle de titre que l'annuaire et le hub du module. -->
      <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
        Département de {{ departement.nom }}
      </h1>
      <p class="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Les {{ formatNumber(departement.nbCollectivites) }} collectivités du département de
        {{ departement.nom }}, région de {{ departement.region }}. Cliquez sur une commune pour
        ouvrir sa fiche : maire, population, contact de la mairie.
      </p>
    </header>

    <section class="mx-auto max-w-7xl px-4">
      <div class="flex flex-wrap gap-6 border-b border-gray-100 py-4 text-sm dark:border-gray-700">
        <div v-for="repere in reperes" :key="repere.key">
          <span class="font-bold text-gray-900 dark:text-white">{{ repere.valeur }}</span>
          <span class="text-gray-500 dark:text-gray-400">{{ repere.libelle }}</span>
        </div>

        <div v-if="departement.region">
          <span class="text-gray-500 dark:text-gray-400">Région de </span>
          <NuxtLink
            v-if="departement.regionSlug"
            :to="`/collectivites-territoriales/regions/${departement.regionSlug}`"
            class="text-primary-600 dark:text-primary-400 font-bold hover:underline"
          >
            {{ departement.region }}
          </NuxtLink>
          <span v-else class="font-bold text-gray-900 dark:text-white">
            {{ departement.region }}
          </span>
        </div>
      </div>
    </section>

    <section class="mx-auto mt-6 max-w-7xl px-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        Communes du département de {{ departement.nom }}
      </h2>

      <!-- Table plutôt que cartes : les visuels de chaque commune sont sur sa
           fiche, ici on compare des lignes. -->
      <CollectivitesCommunesTable
        v-if="communes.length"
        :communes="communes"
        :columns="colonnesCommunes"
        class="mt-4"
      />

      <p v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Aucune collectivité n'est rattachée à ce département dans le référentiel.
      </p>
    </section>

    <!-- Maillage interne : les départements voisins de la même région. -->
    <section v-if="voisins.length" class="mx-auto mt-10 max-w-7xl px-4">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Autres départements de la région de {{ departement.region }}
      </h2>
      <div class="mt-3 flex flex-wrap gap-2">
        <NuxtLink
          v-for="voisin in voisins"
          :key="voisin.slug"
          :to="`/collectivites-territoriales/departements/${voisin.slug}`"
          class="text-primary-600 dark:text-primary-400 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          {{ voisin.nom }}
        </NuxtLink>
      </div>
      <NuxtLink
        to="/collectivites-territoriales/departements"
        class="text-primary-600 dark:text-primary-400 mt-4 inline-block text-sm hover:underline"
      >
        Voir les 46 départements du Sénégal
      </NuxtLink>
    </section>
  </div>
</template>
