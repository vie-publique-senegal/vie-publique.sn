<!--
  Liste de départements. Comme `CommunesTable`, ce n'est qu'un jeu de colonnes
  posé sur `CollectivitesDataTable` : hub des départements et page région
  affichent la même table, avec ou sans la colonne « Région ».
-->
<template>
  <CollectivitesDataTable
    :rows="departements"
    :columns="colonnes"
    :row-key="(d: DepartementGeo) => d.slug"
    :to="(d: DepartementGeo) => `/collectivites-territoriales/departements/${d.slug}`"
  />
</template>

<script setup lang="ts">
import type { DepartementGeo } from '~~/types/collectivite';
import type { DataTableColumn } from '~/composables/collectivites/dataTable';
import { formatNumber } from '#shared/format';

/** Colonnes disponibles à droite du nom du département. */
type DepartementColumn = 'region' | 'collectivites' | 'population';

interface Props {
  departements: DepartementGeo[];
  /** Colonnes affichées, dans l'ordre donné. Une page région retire « Région ». */
  columns?: DepartementColumn[];
  /**
   * Ligne de contexte sous le nom, calculée par l'appelant : le hub y met les
   * communes qui ont répondu à la recherche.
   */
  hint?: (departement: DepartementGeo) => string | null;
}

const props = withDefaults(defineProps<Props>(), {
  columns: () => ['region', 'collectivites', 'population'],
  hint: undefined,
});

const DEFINITIONS: Record<DepartementColumn, DataTableColumn<DepartementGeo>> = {
  region: {
    key: 'region',
    label: 'Région',
    value: (d) => d.region,
    to: (d) => (d.regionSlug ? `/collectivites-territoriales/regions/${d.regionSlug}` : null),
  },
  collectivites: {
    key: 'collectivites',
    label: 'Collectivités',
    align: 'right',
    value: (d) => formatNumber(d.nbCollectivites),
  },
  population: {
    key: 'population',
    label: 'Population',
    align: 'right',
    value: (d) => (d.population === null ? null : formatNumber(d.population)),
  },
};

const colonnes = computed<DataTableColumn<DepartementGeo>[]>(() => [
  {
    key: 'nom',
    label: 'Département',
    value: (d) => d.nom,
    ...(props.hint && { hint: props.hint }),
  },
  ...props.columns.map((key) => DEFINITIONS[key]),
]);
</script>
