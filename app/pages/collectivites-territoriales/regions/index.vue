<script setup lang="ts">
import type { RegionGeo } from '~~/types/collectivite';
import type { DataTableColumn } from '~/composables/collectivites/dataTable';
import { formatNumber } from '#shared/format';
import { repereCollectivites, repereDepartements } from '~/composables/collectivites/reperes';
import { useCollectionPageSeo } from '~/composables/collectivites/useCollectionPageSeo';
import { useRegionsGeo } from '~/composables/collectivites/useRegionsGeo';

// Hub des régions : le niveau qui manquait entre l'annuaire et le département.
// Pas de recherche ici, contrairement au hub des départements — 14 lignes se
// parcourent d'un coup d'œil, un champ de recherche serait du décor.
const { siteUrl } = useSiteMetadata();

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

const reperes = computed(() => [
  { key: 'regions', value: total.value, label: 'régions' },
  repereDepartements(totalDepartements.value),
  repereCollectivites(totalCollectivites.value),
  { key: 'population', value: populationTotale.value, label: 'habitants (RGPH 2023)' },
]);

// ── SEO (en dernier — helpers et computeds déclarés avant) ─────────
useCollectionPageSeo({
  key: 'ld-regions',
  title: 'Régions du Sénégal : départements et communes de chaque région',
  description:
    'Les 14 régions du Sénégal : nombre de départements, de communes et population au recensement 2023. Accédez aux collectivités territoriales de chaque région.',
  url: `${siteUrl}/collectivites-territoriales/regions`,
  items: () =>
    regions.value.map((r) => ({
      name: `Région de ${r.nom}`,
      url: `${siteUrl}/collectivites-territoriales/regions/${r.slug}`,
    })),
});
</script>

<template>
  <div class="min-h-screen pb-16">
    <CollectivitesPageHeader
      :breadcrumb="[
        { label: 'Collectivités territoriales', to: '/collectivites-territoriales' },
        { label: 'Régions' },
      ]"
      title="Les régions du Sénégal"
    >
      <template #description>
        Choisissez une région pour voir ses départements et l'ensemble de ses communes. Le découpage
        et les populations proviennent du référentiel officiel (recensement 2023).
      </template>

      <CollectivitesStatStrip :items="reperes" class="mt-4" />
    </CollectivitesPageHeader>

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
