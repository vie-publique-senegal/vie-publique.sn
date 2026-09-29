<template>
  <div
    class="flex justify-between gap-4 border-b border-gray-100 py-2.5 text-sm last:border-0 dark:border-gray-700"
  >
    <span class="text-gray-500 dark:text-gray-400">{{ label }}</span>
    <span class="text-right font-medium text-gray-900 dark:text-white">
      <slot>{{ value }}</slot>
    </span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string;
  value?: string | number;
}

defineProps<Props>();
</script>
