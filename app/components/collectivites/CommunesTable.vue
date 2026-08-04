<!--
  Vue « Liste » des collectivités. N'est qu'un jeu de colonnes posé sur
  `CollectivitesDataTable` : le rendu (table desktop / blocs mobile) est partagé
  avec le hub des départements.
-->
<template>
  <CollectivitesDataTable
    :rows="communes"
    :columns="columns"
    :row-key="(c: CommuneGeo) => c.slug"
    :to="(c: CommuneGeo) => `/collectivites-territoriales/communes/${c.slug}`"
  />
</template>

<script setup lang="ts">
import type { CommuneGeo } from '~~/types/collectivite';
import type { DataTableColumn } from '~/composables/collectivites/dataTable';
import { getResponsableLien } from '~/composables/collectivites/responsable';
import { formatNumber } from '#shared/format';

/** Colonnes disponibles à droite du nom de la commune. */
type CommuneColumn = 'region' | 'arrondissement' | 'maire' | 'population';

interface Props {
  communes: CommuneGeo[];
  /**
   * Colonnes affichées, dans l'ordre donné. Par défaut celles de l'annuaire
   * national ; une page déjà cadrée sur un département retire « Région », et
   * « Maire » quand aucune de ses collectivités n'en a un.
   */
  columns?: CommuneColumn[];
}

const props = withDefaults(defineProps<Props>(), {
  columns: () => ['region', 'arrondissement', 'maire', 'population'],
});

const DEFINITIONS: Record<CommuneColumn, DataTableColumn<CommuneGeo>> = {
  region: { key: 'region', label: 'Région', value: (c) => c.region },
  arrondissement: {
    key: 'arrondissement',
    label: 'Arrondissement',
    value: (c) => c.arrondissement,
  },
  maire: {
    key: 'maire',
    label: 'Maire',
    value: (c) => c.maire?.nom ?? null,
    // Un maire sans slug au référentiel n'a pas de fiche : nom sans lien.
    to: (c) => getResponsableLien(c.maire),
  },
  population: {
    key: 'population',
    label: 'Population',
    align: 'right',
    value: (c) => (c.population === null ? null : formatNumber(c.population)),
  },
};

const columns = computed<DataTableColumn<CommuneGeo>[]>(() => [
  {
    key: 'nom',
    label: 'Commune',
    value: (c) => c.nom,
    // Le département ne se rappelle que sur une liste qui en mélange plusieurs :
    // sur la page d'un département, il serait répété à chaque ligne.
    hint: (c) => (props.columns.includes('region') ? c.departement : null),
  },
  ...props.columns.map((key) => DEFINITIONS[key]),
]);
</script>
