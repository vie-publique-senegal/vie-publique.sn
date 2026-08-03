<!--
  Bandeau de repères d'une collectivité. Uniquement des données du référentiel :
  ce qui manque affiche « - » plutôt qu'une valeur reconstituée.
-->
<template>
  <section class="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
    <div
      class="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-gray-100 px-4 dark:divide-gray-700 md:grid-cols-4"
    >
      <div v-for="kpi in kpis" :key="kpi.label" class="px-4 py-5 text-center">
        <div class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {{ kpi.label }}
        </div>
        <div class="mt-1 truncate text-lg font-bold text-gray-900 dark:text-white md:text-xl">
          {{ kpi.value }}
          <span v-if="kpi.unit" class="text-sm font-normal text-gray-500 dark:text-gray-400">
            {{ kpi.unit }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CommuneGeo } from '~~/types/collectivite';
import { formatNumber } from '#shared/format';

interface Props {
  commune: CommuneGeo;
}

const props = defineProps<Props>();

const kpis = computed(() => [
  {
    label: props.commune.populationAnnee
      ? `Population (${props.commune.populationAnnee})`
      : 'Population',
    value: props.commune.population === null ? '-' : formatNumber(props.commune.population),
    unit: props.commune.population === null ? undefined : 'hab.',
  },
  { label: 'Département', value: props.commune.departement || '-' },
  { label: 'Région', value: props.commune.region || '-' },
  { label: 'Chef-lieu', value: props.commune.chefLieu ? 'Oui' : 'Non' },
]);
</script>
