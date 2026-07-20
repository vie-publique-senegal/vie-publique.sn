<template>
  <div
    class="rounded-xl bg-white p-4 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 md:p-6"
  >
    <div class="flex items-center justify-between gap-3">
      <p class="text-xs text-gray-500 dark:text-gray-400">Filtrer les résultats</p>
      <slot name="actions" />
    </div>

    <div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      <label class="flex flex-col text-xs text-gray-500 dark:text-gray-400">
        <span class="mb-1 uppercase tracking-wider">Région</span>
        <USelect v-model="region" :options="withAll(regions)" />
      </label>
      <label class="flex flex-col text-xs text-gray-500 dark:text-gray-400">
        <span class="mb-1 uppercase tracking-wider">Département</span>
        <USelect v-model="departement" :options="withAll(departements)" />
      </label>
      <label class="flex flex-col text-xs text-gray-500 dark:text-gray-400">
        <span class="mb-1 uppercase tracking-wider">Parti</span>
        <USelect v-model="parti" :options="withAll(partis)" />
      </label>
      <label class="flex flex-col text-xs text-gray-500 dark:text-gray-400">
        <span class="mb-1 uppercase tracking-wider">Type</span>
        <USelect v-model="type" :options="withAll(TYPES)" />
      </label>
      <label class="flex flex-col text-xs text-gray-500 dark:text-gray-400">
        <span class="mb-1 uppercase tracking-wider">Population min.</span>
        <USelect v-model="popMin" :options="POP_OPTIONS" />
      </label>
      <div class="flex items-center">
        <UCheckbox v-model="hasWeb" label="Site web" />
      </div>
      <div class="flex items-center">
        <UCheckbox v-model="hasFb" label="Facebook" />
      </div>
    </div>

    <div class="mt-4 flex justify-end text-sm">
      <button
        type="button"
        class="text-primary-600 dark:text-primary-400 hover:underline"
        @click="$emit('reset')"
      >
        Réinitialiser les filtres
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatNumber } from '#shared/communes';

interface Props {
  regions: string[];
  departements: string[];
  partis: string[];
}

defineProps<Props>();
defineEmits<{ reset: [] }>();

const region = defineModel<string>('region', { default: '' });
const departement = defineModel<string>('departement', { default: '' });
const parti = defineModel<string>('parti', { default: '' });
const type = defineModel<string>('type', { default: '' });
const popMin = defineModel<string>('popMin', { default: '' });
const hasWeb = defineModel<boolean>('hasWeb', { default: false });
const hasFb = defineModel<boolean>('hasFb', { default: false });

const TYPES = ['Commune', 'Ville', "Commune d'arrondissement"];

const withAll = (options: string[]) => [
  { label: 'Toutes', value: '' },
  ...options.map((o) => ({ label: o, value: o })),
];

const POP_OPTIONS = [
  { label: 'Toutes', value: '' },
  ...['10000', '50000', '100000', '250000', '500000'].map((v) => ({
    label: `≥ ${formatNumber(Number(v))} hab.`,
    value: v,
  })),
];
</script>
