<template>
  <div class="grid gap-6 lg:grid-cols-3">
    <div class="custom-shadow rounded-lg bg-white p-6 dark:bg-gray-800 lg:col-span-1">
      <div class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Budget {{ budget.annee }}
      </div>
      <div class="mt-2 text-4xl font-bold text-gray-900 dark:text-white">
        {{ formatFCFA(budget.total) }}
      </div>
      <div class="mt-6">
        <CollectivitesInfoRow label="Recettes" :value="formatFCFA(budget.recettes)" />
        <CollectivitesInfoRow label="Dépenses" :value="formatFCFA(budget.depenses)" />
        <CollectivitesInfoRow label="Solde">
          <span
            :class="
              solde >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            "
          >
            {{ formatFCFA(solde) }}
          </span>
        </CollectivitesInfoRow>
      </div>
    </div>
    <div class="custom-shadow rounded-lg bg-white p-6 dark:bg-gray-800 lg:col-span-2">
      <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Répartition</h2>
      <div class="space-y-5">
        <div v-for="it in items" :key="it.label">
          <div class="mb-1.5 flex justify-between text-sm">
            <span class="font-medium text-gray-900 dark:text-white">{{ it.label }}</span>
            <span class="tabular-nums text-gray-700 dark:text-gray-300">{{
              formatFCFA(it.value)
            }}</span>
          </div>
          <div class="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              class="h-full"
              :class="it.color"
              :style="{ width: `${(it.value / maxValue) * 100}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commune } from '~~/types/collectivite';
import { formatFCFA } from '#shared/communes';

interface Props {
  commune: Commune;
}

const props = defineProps<Props>();

const budget = computed(() => props.commune.budget);
const solde = computed(() => budget.value.recettes - budget.value.depenses);

const items = computed(() => [
  { label: 'Fonctionnement', value: budget.value.fonctionnement, color: 'bg-sky-600' },
  { label: 'Investissement', value: budget.value.investissement, color: 'bg-sky-400' },
  { label: 'Dette', value: budget.value.dette, color: 'bg-gray-400 dark:bg-gray-500' },
]);

const maxValue = computed(() => Math.max(...items.value.map((i) => i.value)));
</script>
