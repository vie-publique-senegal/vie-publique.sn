<script setup lang="ts">
import type { ElectionStatsProfession } from '~~/types/election-stats-profession';

const props = withDefaults(
  defineProps<{
    professions: ElectionStatsProfession[];
    /** Libellé de l'unité comptée (ex. « candidats », « élus ») */
    unitLabel?: string;
  }>(),
  { unitLabel: 'candidats' },
);

const total = computed(() =>
  props.professions.reduce((sum, item) => sum + (Number(item.count?.id) || 0), 0),
);

const maxCount = computed(() =>
  props.professions.reduce((max, item) => Math.max(max, Number(item.count?.id) || 0), 0),
);

const percentage = (count: number) =>
  total.value > 0 ? ((count / total.value) * 100).toFixed(1) : '0.0';

const barWidth = (count: number) =>
  maxCount.value > 0 ? `${(count / maxCount.value) * 100}%` : '0%';

const formatNumber = (num: number) => new Intl.NumberFormat('fr-FR').format(num);
</script>

<template>
  <div class="space-y-1">
    <p class="mb-4 text-xs text-gray-500 dark:text-gray-400">
      Classement des professions - {{ formatNumber(total) }} {{ unitLabel }}.
    </p>
    <div
      v-for="item in professions"
      :key="item.profession"
      class="border-b border-gray-100 py-2.5 last:border-b-0 dark:border-gray-800"
    >
      <div class="mb-1 flex items-baseline justify-between gap-2">
        <span class="min-w-0 truncate text-sm text-gray-900 dark:text-white">
          {{ item.profession }}
        </span>
        <span class="shrink-0 text-sm tabular-nums">
          <span class="font-semibold text-gray-900 dark:text-white">
            {{ formatNumber(Number(item.count.id) || 0) }}
          </span>
          <span class="ml-1.5 text-xs text-gray-500 dark:text-gray-400">
            {{ percentage(Number(item.count.id) || 0) }}%
          </span>
        </span>
      </div>
      <div class="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          class="h-1.5 rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"
          :style="{ width: barWidth(Number(item.count.id) || 0) }"
        />
      </div>
    </div>
  </div>
</template>
