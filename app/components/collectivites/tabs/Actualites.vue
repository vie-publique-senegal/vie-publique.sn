<template>
  <div class="grid gap-4 md:grid-cols-2">
    <div
      v-for="(a, i) in commune.actualites"
      :key="i"
      class="rounded-xl bg-white p-5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
    >
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-primary-600 dark:text-primary-400 text-xs uppercase tracking-wider">{{
          a.categorie
        }}</span>
        <span class="text-xs tabular-nums text-gray-500 dark:text-gray-400">{{
          formatDate(a.date)
        }}</span>
      </div>
      <h3 class="mt-2 text-xl font-semibold leading-tight text-gray-900 dark:text-white">
        {{ a.titre }}
      </h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ a.extrait }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commune } from '~~/types/collectivite';

interface Props {
  commune: Commune;
}

defineProps<Props>();

const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
</script>
