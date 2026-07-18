<script setup lang="ts">
import type { ElectionStatsList } from '~~/types/election-stats-profession';
import type { Coalition } from '~~/types/coalition';

interface Props {
  statsDepartmental: ElectionStatsList[];
  coalitions: Coalition[];
  loading?: boolean;
}

const props = defineProps<Props>();

const getCoalitionById = (id: number) => props.coalitions.find((c) => c.id === id);

const maxCount = computed(() =>
  Math.max(...props.statsDepartmental.map((item) => Number(item.count.id) || 0), 1),
);
</script>

<template>
  <div class="space-y-4">
    <div>
      <h3 class="text-lg font-bold">Présence des listes par département</h3>
      <p class="text-sm text-gray-500">Nombre de départements où chaque liste est présente.</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-2">
      <USkeleton v-for="i in 8" :key="i" class="h-14 w-full rounded-xl" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="!statsDepartmental || statsDepartmental.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <UIcon name="i-heroicons-chart-bar" class="mb-4 h-12 w-12 text-gray-200 dark:text-gray-700" />
      <p class="text-sm text-gray-500">Aucune donnée disponible pour cette élection.</p>
    </div>

    <!-- Liste -->
    <div v-else class="grid grid-cols-1 gap-2 md:grid-cols-2">
      <div
        v-for="item in statsDepartmental"
        :key="item.coalition"
        class="flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
        >
          <CmsImage
            v-if="getCoalitionById(item.coalition)?.logo"
            :src="getCoalitionById(item.coalition)!.logo!"
            class="max-h-full max-w-full object-contain p-1"
            :alt="getCoalitionById(item.coalition)?.name || ''"
          />
          <UIcon v-else name="i-heroicons-photo" class="h-5 w-5 text-gray-400" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="line-clamp-1 text-xs font-black uppercase tracking-tight sm:text-sm">
            {{ getCoalitionById(item.coalition)?.name || `Coalition ${item.coalition}` }}
          </p>
          <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              class="bg-primary-500 h-full rounded-full"
              :style="{ width: `${(Number(item.count.id) / maxCount) * 100}%` }"
            />
          </div>
        </div>
        <span
          class="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          {{ item.count.id }}
        </span>
      </div>
    </div>
  </div>
</template>
