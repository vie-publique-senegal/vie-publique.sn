<template>
  <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="colorClass">
    {{ parti }}
  </span>
</template>

<script setup lang="ts">
interface Props {
  parti: string;
}

const props = defineProps<Props>();

// Palette sobre vpsn : sky pour la mouvance présidentielle passée (APR/BBY),
// tons neutres différenciés pour le reste — pas de couleurs flashy.
const COLORS: Record<string, string> = {
  APR: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  BBY: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300',
  PASTEF: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Yewwi: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  PDS: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  Indépendant: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const colorClass = computed(
  () => COLORS[props.parti] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
);
</script>
