<script setup lang="ts">
import { formatNumber } from '#shared/format';
import {
  repereCollectivites,
  repereDepartements,
  reperesPopulation,
  reperesResultats,
} from '~/composables/collectivites/reperes';
import { useCollectionPageSeo } from '~/composables/collectivites/useCollectionPageSeo';
import { useGeoSearch } from '~/composables/collectivites/useGeoSearch';
import { useRegionGeo } from '~/composables/collectivites/useRegionsGeo';

// Page d'une région : ses départements (le pas suivant) puis toutes ses
// collectivités (ce que cherche « communes de la région de … »). Au plus 57
// lignes : tout tient dans le HTML indexé, sans pagination.
const route = useRoute();
const { siteUrl } = useSiteMetadata();

const slug = computed(() => route.params.slug as string);

const { region, departements, communes, autresRegions } = await useRegionGeo(slug);

if (!region.value) {
  throw createError({ statusCode: 404, statusMessage: 'Région introuvable', fatal: true });
}

const nom = computed(() => region.value?.nom ?? '');

// ── Recherche dans la région (département, commune, maire) ────────
const { q, query, normalize, isSearching } = useGeoSearch();

const communesFiltrees = computed(() => {
  if (!query.value) return communes.value;
  return communes.value.filter((c) =>
    normalize(`${c.nom} ${c.departement} ${c.arrondissement ?? ''} ${c.maire?.nom ?? ''}`).includes(
      query.value,
    ),
  );
});

// Un département reste affiché s'il porte le terme cherché ou si l'une de ses
// communes y répond : les deux tables racontent alors la même recherche.
const departementsFiltres = computed(() => {
  if (!query.value) return departements.value;
  const slugsTrouves = new Set(communesFiltrees.value.map((c) => c.departementSlug));
  return departements.value.filter(
    (d) => normalize(d.nom).includes(query.value) || slugsTrouves.has(d.slug),
  );
});

const reperes = computed(() => {
  const reg = region.value;
  if (!reg) return [];
  return [
    repereDepartements(reg.nbDepartements),
    repereCollectivites(reg.nbCollectivites),
    ...reperesPopulation(reg),
    ...reperesResultats(
      isSearching.value,
      communesFiltrees.value.length,
      'commune trouvée',
      'communes trouvées',
    ),
  ];
});

// « Maire » ne s'affiche que si la région a au moins un maire au référentiel.
const colonnesCommunes = computed<('departement' | 'maire' | 'population')[]>(() =>
  communes.value.some((c) => c.maire)
    ? ['departement', 'maire', 'population']
    : ['departement', 'population'],
);

// ── SEO (en dernier — helpers et computeds déclarés avant) ─────────
useCollectionPageSeo({
  key: 'ld-region',
  title: () => `Région de ${nom.value} : départements et communes`,
  description: () => {
    const reg = region.value;
    if (!reg) return '';
    const habitants =
      reg.population !== null ? `, ${formatNumber(reg.population)} habitants recensés` : '';
    return `Les ${reg.nbDepartements} départements et ${reg.nbCollectivites} collectivités de la région de ${reg.nom}${habitants}. Maire et population de chaque commune.`;
  },
  url: () => `${siteUrl}/collectivites-territoriales/regions/${region.value?.slug}`,
  // Décrit ce qui est réellement affiché : toutes les communes sans recherche,
  // les résultats sinon.
  items: () =>
    communesFiltrees.value.map((commune) => ({
      name: commune.nom,
      url: `${siteUrl}/collectivites-territoriales/communes/${commune.slug}`,
    })),
  noindexWhen: () => isSearching.value,
});
</script>

<template>
  <div v-if="region" class="min-h-screen pb-16">
    <CollectivitesPageHeader
      :breadcrumb="[
        { label: 'Collectivités territoriales', to: '/collectivites-territoriales' },
        { label: 'Régions', to: '/collectivites-territoriales/regions' },
        { label: region.nom },
      ]"
      :title="`Région de ${region.nom}`"
    >
      <template #description>
        Les {{ formatNumber(region.nbDepartements) }} départements et
        {{ formatNumber(region.nbCollectivites) }} collectivités de la région de {{ region.nom }}.
        Cliquez sur une commune pour ouvrir sa fiche : maire, population, contact de la mairie.
      </template>

      <!-- Recherche dans la région : département, commune, arrondissement ou
           maire. Les deux tables ci-dessous s'accordent sur le même terme. -->
      <CollectivitesSearchInput
        v-model="q"
        :placeholder="`Rechercher un département, une commune, un maire de la région de ${region.nom}…`"
        class="mt-4"
      />

      <CollectivitesStatStrip :items="reperes" class="mt-4" />
    </CollectivitesPageHeader>

    <section v-if="departementsFiltres.length" class="mx-auto mt-6 max-w-7xl px-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        Départements de la région de {{ region.nom }}
      </h2>
      <CollectivitesDepartementsTable
        :departements="departementsFiltres"
        :columns="['collectivites', 'population']"
        class="mt-4"
      />
    </section>

    <section class="mx-auto mt-10 max-w-7xl px-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        Communes de la région de {{ region.nom }}
      </h2>

      <CollectivitesCommunesTable
        v-if="communesFiltrees.length"
        :communes="communesFiltrees"
        :columns="colonnesCommunes"
        class="mt-4"
      />

      <p v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {{
          communes.length === 0
            ? "Aucune collectivité n'est rattachée à cette région dans le référentiel."
            : 'Aucune commune de cette région ne correspond à cette recherche.'
        }}
      </p>
    </section>

    <!-- Maillage interne : les autres régions. -->
    <CollectivitesRelatedLinks
      title="Autres régions du Sénégal"
      :items="autresRegions"
      base-path="/collectivites-territoriales/regions"
      class="mt-10"
    />
  </div>
</template>
