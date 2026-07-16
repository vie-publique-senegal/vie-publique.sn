<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div
      v-for="it in items"
      :key="it.label"
      class="custom-shadow rounded-lg bg-white p-5 dark:bg-gray-800"
    >
      <UIcon :name="it.icon" class="size-6 text-gray-400 dark:text-gray-500" />
      <div class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
        {{ formatNumber(it.value) }}
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">{{ it.label }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commune } from '~~/types/collectivite';
import { formatNumber } from '#shared/communes';

interface Props {
  commune: Commune;
}

const props = defineProps<Props>();

const items = computed(() => {
  const t = props.commune.territoire;
  return [
    { label: 'Villages', value: t.villages, icon: 'i-heroicons-home-modern' },
    { label: 'Quartiers', value: t.quartiers, icon: 'i-heroicons-map-pin' },
    { label: 'Conseils de quartier', value: t.conseilsQuartier, icon: 'i-heroicons-user-group' },
    { label: 'Postes de santé', value: t.postesSante, icon: 'i-heroicons-heart' },
    { label: 'Écoles', value: t.ecoles, icon: 'i-heroicons-academic-cap' },
    { label: 'Marchés', value: t.marches, icon: 'i-heroicons-shopping-cart' },
    { label: 'Postes de police', value: t.postesPolice, icon: 'i-heroicons-shield-check' },
    {
      label: 'Brigades de gendarmerie',
      value: t.brigadesGendarmerie,
      icon: 'i-heroicons-shield-exclamation',
    },
  ];
});
</script>
