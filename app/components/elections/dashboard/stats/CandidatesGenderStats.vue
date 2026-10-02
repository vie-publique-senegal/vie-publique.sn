<script setup lang="ts">
import type { ElectionStatsGender } from '~~/types/election-stats-profession';

const props = defineProps<{
  data: ElectionStatsGender[];
}>();

const total = computed(() => props.data.reduce((acc, item) => acc + item.count, 0));

const percentage = (count: number) =>
  total.value > 0 ? ((count / total.value) * 100).toFixed(1) : '0';

// Paire catégorielle validée (CVD + contraste) sur les surfaces claire et sombre du site
const segmentClasses: Record<ElectionStatsGender['gender'], string> = {
  F: 'bg-[#2a78d6] dark:bg-[#3987e5]',
  M: 'bg-[#008300]',
  unknown: 'bg-gray-400 dark:bg-gray-500',
};

const formatNumber = (num: number) => new Intl.NumberFormat('fr-FR').format(num);
</script>

<template>
  <div class="space-y-6">
    <!-- Tuiles de synthèse -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <div
        v-for="item in data"
        :key="item.gender"
        class="rounded-lg border border-gray-100 p-4 dark:border-gray-700"
      >
        <div class="flex items-center gap-2">
          <span
            class="h-2.5 w-2.5 shrink-0 rounded-full"
            :class="segmentClasses[item.gender]"
            aria-hidden="true"
          />
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ item.label }}</span>
        </div>
        <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          {{ percentage(item.count) }}<span class="text-base font-semibold">%</span>
        </p>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {{ formatNumber(item.count) }} candidat{{ item.count > 1 ? 's' : '' }}
        </p>
      </div>
    </div>

    <!-- Barre de répartition (part du total) -->
    <div
      class="flex h-4 w-full gap-[2px] overflow-hidden rounded-full"
      role="img"
      :aria-label="`Répartition par sexe : ${data.map((d) => `${d.label} ${percentage(d.count)}%`).join(', ')}`"
    >
      <div
        v-for="item in data"
        :key="item.gender"
        :class="segmentClasses[item.gender]"
        :style="{ width: `${percentage(item.count)}%` }"
      />
    </div>

    <!-- Tableau accessible -->
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 text-left dark:border-gray-700">
            <th class="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Sexe</th>
            <th class="py-2 pr-4 text-right font-medium text-gray-500 dark:text-gray-400">
              Candidats
            </th>
            <th class="py-2 text-right font-medium text-gray-500 dark:text-gray-400">Part</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in data"
            :key="item.gender"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="py-2 pr-4 text-gray-900 dark:text-white">{{ item.label }}</td>
            <td class="py-2 pr-4 text-right tabular-nums text-gray-900 dark:text-white">
              {{ formatNumber(item.count) }}
            </td>
            <td class="py-2 text-right tabular-nums text-gray-500 dark:text-gray-400">
              {{ percentage(item.count) }}%
            </td>
          </tr>
          <tr class="font-semibold">
            <td class="py-2 pr-4 text-gray-900 dark:text-white">Total</td>
            <td class="py-2 pr-4 text-right tabular-nums text-gray-900 dark:text-white">
              {{ formatNumber(total) }}
            </td>
            <td class="py-2 text-right tabular-nums text-gray-900 dark:text-white">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
