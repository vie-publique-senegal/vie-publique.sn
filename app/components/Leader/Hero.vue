<script setup lang="ts">
interface Props {
  name: string;
  photo: string | null;
  roleLabel: string;
  period: string;
  duration: string;
  isCurrent?: boolean;
}
defineProps<Props>();

const { initials } = useLeaderFormat();
</script>

<template>
  <header class="flex flex-col items-center gap-4 pt-2 text-center sm:flex-row sm:text-left">
    <CmsImage
      v-if="photo"
      :src="photo"
      :alt="name"
      class="size-28 flex-shrink-0 rounded-2xl object-cover ring-1 ring-gray-200 dark:ring-gray-700"
      fetchpriority="high"
      loading="eager"
      :width="112"
      :height="112"
    />
    <div
      v-else
      class="flex size-28 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-2xl font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
    >
      {{ initials(name) }}
    </div>
    <div class="min-w-0">
      <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        <h1 class="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{{ name }}</h1>
        <span
          v-if="isCurrent"
          class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"
          >En cours</span
        >
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ roleLabel }} · {{ period }}</p>
      <p class="text-xs text-gray-400 dark:text-gray-500">{{ duration }}</p>
    </div>
  </header>
</template>
