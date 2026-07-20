<template>
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div
      v-for="s in commune.services"
      :key="s"
      class="rounded-xl bg-white p-5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
    >
      <UIcon name="i-heroicons-building-office-2" class="size-6 text-gray-400 dark:text-gray-500" />
      <div class="mt-2 font-medium text-gray-900 dark:text-white">{{ s }}</div>
      <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">Service municipal</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commune } from '~~/types/collectivite';

interface Props {
  commune: Commune;
}

defineProps<Props>();
</script>
