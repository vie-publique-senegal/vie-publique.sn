<script setup lang="ts">
const data = ref([35, 25, 20, 15, 5]);

const labels = [
  { name: 'Product A', color: '#3b82f6' },
  { name: 'Product B', color: '#22c55e' },
  { name: 'Product C', color: '#f59e0b' },
  { name: 'Product D', color: '#a855f7' },
  { name: 'Other', color: '#06b6d4' },
];

const categories: Record<string, BulletLegendItemInterface> = Object.fromEntries(
  labels.map((i) => [i.name, { name: i.name, color: i.color }]),
);
</script>

<template>
  <DonutChart
    :data="data"
    :height="260"
    :categories="categories"
    :radius="4"
    :arc-width="20"
    :pad-angle="0.1"
  />
</template>
