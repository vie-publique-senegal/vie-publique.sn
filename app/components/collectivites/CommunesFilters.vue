<template>
  <div class="custom-shadow rounded-lg bg-white p-4 dark:bg-gray-800 md:p-6">
    <div class="flex flex-col gap-3 md:flex-row">
      <UInput
        v-model="q"
        icon="i-heroicons-magnifying-glass"
        type="search"
        size="lg"
        class="flex-1"
        placeholder="Rechercher une commune, un maire, une région…"
      />
      <slot name="actions" />
    </div>

    <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
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

    <div class="mt-4 flex items-center justify-between text-sm">
      <span class="text-gray-500 dark:text-gray-400">
        <strong class="text-gray-900 dark:text-white">{{ count }}</strong>
        commune{{ count > 1 ? 's' : '' }} correspondante{{ count > 1 ? 's' : '' }}
      </span>
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
  count: number;
}

defineProps<Props>();
defineEmits<{ reset: [] }>();

const q = defineModel<string>('q', { default: '' });
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
