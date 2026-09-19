<script setup lang="ts">
import { formatNumber } from '#shared/format';
import { repereCollectivites, reperesPopulation } from '~/composables/collectivites/reperes';
import { useCollectionPageSeo } from '~/composables/collectivites/useCollectionPageSeo';
import { useDepartementGeo } from '~/composables/collectivites/useDepartementsGeo';

// Page hub d'un département : liste ses communes et renvoie vers leurs fiches.
// Pas de filtre ni de pagination - un département compte au plus une trentaine
// de collectivités, toutes tiennent sur la page (et donc dans le HTML indexé).
const route = useRoute();
const { siteUrl } = useSiteMetadata();

const slug = computed(() => route.params.slug as string);

const { departement, communes, voisins } = await useDepartementGeo(slug);

if (!departement.value) {
  throw createError({ statusCode: 404, statusMessage: 'Département introuvable', fatal: true });
}

const nom = computed(() => departement.value?.nom ?? '');
const region = computed(() => departement.value?.region ?? '');

// Repères chiffrés : même bandeau sobre que l'annuaire (valeur en gras suivie de
// son libellé), pas des tuiles. La région y est un lien - elle a sa page.
const reperes = computed(() => {
  const dep = departement.value;
  if (!dep) return [];
  return [
    repereCollectivites(dep.nbCollectivites),
    ...reperesPopulation(dep),
    ...(dep.region
      ? [
          {
            key: 'region',
            prefix: 'Région de',
            value: dep.region,
            ...(dep.regionSlug && { to: `/collectivites-territoriales/regions/${dep.regionSlug}` }),
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
useCollectionPageSeo({
  key: 'ld-departement',
  title: () => `Communes du département de ${nom.value} (région de ${region.value})`,
  description: () => {
    const dep = departement.value;
    if (!dep) return '';
    const habitants =
      dep.population !== null ? `, ${formatNumber(dep.population)} habitants recensés` : '';
    return `Les ${dep.nbCollectivites} collectivités du département de ${dep.nom}, région de ${dep.region}${habitants}. Maire, population et contact de chaque commune.`;
  },
  url: () => `${siteUrl}/collectivites-territoriales/departements/${departement.value?.slug}`,
  items: () =>
    communes.value.map((commune) => ({
      name: commune.nom,
      url: `${siteUrl}/collectivites-territoriales/communes/${commune.slug}`,
    })),
});
</script>

<template>
  <div v-if="departement" class="min-h-screen pb-16">
    <CollectivitesPageHeader
      :breadcrumb="[
        { label: 'Collectivités territoriales', to: '/collectivites-territoriales' },
        { label: 'Départements', to: '/collectivites-territoriales/departements' },
        { label: departement.nom },
      ]"
      :title="`Département de ${departement.nom}`"
    >
      <template #description>
        Les {{ formatNumber(departement.nbCollectivites) }} collectivités du département de
        {{ departement.nom }}, région de {{ departement.region }}. Cliquez sur une commune pour
        ouvrir sa fiche : maire, population, contact de la mairie.
      </template>

      <CollectivitesStatStrip :items="reperes" class="mt-4" />
    </CollectivitesPageHeader>

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
    <CollectivitesRelatedLinks
      :title="`Autres départements de la région de ${departement.region}`"
      :items="voisins"
      base-path="/collectivites-territoriales/departements"
      more-to="/collectivites-territoriales/departements"
      more-label="Voir les 46 départements du Sénégal"
      class="mt-10"
    />
  </div>
</template>
