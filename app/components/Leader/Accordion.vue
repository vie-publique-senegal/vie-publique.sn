<script setup lang="ts">
interface Props {
  title: string;
  count?: number | null;
}
defineProps<Props>();
</script>

<template>
  <details class="group">
    <summary
      class="flex cursor-pointer list-none items-center justify-between border-b border-gray-100 pb-2 text-base font-semibold text-gray-900 dark:border-gray-700 dark:text-white"
    >
      <span>{{ title }}<span v-if="count != null"> ({{ count }})</span></span>
      <UIcon
        name="i-heroicons-chevron-down"
        class="size-5 text-gray-400 transition-transform group-open:rotate-180"
      />
    </summary>
    <div class="mt-3">
      <slot />
    </div>
  </details>
</template>
