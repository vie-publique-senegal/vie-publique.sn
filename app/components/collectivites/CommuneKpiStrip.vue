<template>
  <section class="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
    <div
      class="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-gray-100 px-4 dark:divide-gray-700 md:grid-cols-4 lg:grid-cols-6"
    >
      <div v-for="kpi in kpis" :key="kpi.label" class="px-4 py-5 text-center">
        <div class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {{ kpi.label }}
        </div>
        <div class="mt-1 text-xl font-bold text-gray-900 dark:text-white md:text-2xl">
          {{ kpi.value }}
          <span v-if="kpi.unit" class="text-sm font-normal text-gray-500 dark:text-gray-400">{{
            kpi.unit
          }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Commune } from '~~/types/collectivite';
import { formatNumber, formatFCFA } from '#shared/communes';

interface Props {
  commune: Commune;
}

const props = defineProps<Props>();

const kpis = computed(() => [
  { label: 'Population', value: formatNumber(props.commune.population), unit: 'hab.' },
  { label: 'Superficie', value: String(props.commune.superficie), unit: 'km²' },
  { label: 'Densité', value: formatNumber(props.commune.densite), unit: '/km²' },
  { label: 'Conseillers', value: String(props.commune.conseillers.length) },
  { label: 'Adjoints', value: String(props.commune.adjoints.length) },
  { label: 'Budget', value: formatFCFA(props.commune.budget.total) },
]);
</script>
