<script setup lang="ts">
import type { ElectionStatsList } from '~~/types/election-stats-profession';
import type { Coalition } from '~~/types/coalition';

const props = defineProps<{
  stats: ElectionStatsList[];
  coalitions: Coalition[];
}>();

const coalitionById = computed(() => {
  const map = new Map<number, Coalition>();
  for (const coalition of props.coalitions) {
    map.set(Number(coalition.id), coalition);
  }
  return map;
});

const maxCount = computed(() =>
  props.stats.reduce((max, item) => Math.max(max, Number(item.count.id) || 0), 0),
);

const rows = computed(() =>
  props.stats
    .map((item) => {
      const coalition = coalitionById.value.get(Number(item.coalition));
      return {
        id: item.coalition,
        name: coalition?.name || '',
        logo: coalition?.logo || '',
        count: Number(item.count.id) || 0,
      };
    })
    .filter((row) => row.name),
);

const barWidth = (count: number) =>
  maxCount.value > 0 ? `${(count / maxCount.value) * 100}%` : '0%';
</script>

<template>
  <div class="space-y-1">
    <p class="mb-4 text-xs text-gray-500 dark:text-gray-400">
      Nombre de circonscriptions (départements et zones de la diaspora) où chaque coalition présente
      une liste.
    </p>
    <div
      v-for="row in rows"
      :key="row.id"
      class="flex items-center gap-3 border-b border-gray-100 py-2.5 last:border-b-0 dark:border-gray-800"
    >
      <UAvatar :src="useCmsImage(row.logo, '25')" size="sm" loading="lazy" />
      <div class="min-w-0 flex-1">
        <div class="mb-1 flex items-baseline justify-between gap-2">
          <span class="truncate text-sm text-gray-900 dark:text-white">{{ row.name }}</span>
          <span class="shrink-0 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
            {{ row.count }}
          </span>
        </div>
        <div class="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            class="h-1.5 rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"
            :style="{ width: barWidth(row.count) }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
