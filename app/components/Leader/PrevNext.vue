<script setup lang="ts">
interface NavLink {
  slug: string;
  full_name: string;
}
interface Props {
  basePath: string;
  prev: NavLink | null;
  next: NavLink | null;
}
defineProps<Props>();
</script>

<template>
  <nav
    class="flex items-stretch justify-between gap-3 border-t border-gray-100 pt-6 dark:border-gray-700"
  >
    <NuxtLink
      v-if="prev"
      :to="`${basePath}/${prev.slug}`"
      class="flex max-w-[48%] flex-col rounded-xl border border-gray-100 bg-white p-3 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <span class="text-[11px] text-gray-400 dark:text-gray-500">← Précédent</span>
      <span class="mt-0.5 truncate text-xs font-semibold text-gray-900 dark:text-white">{{
        prev.full_name
      }}</span>
    </NuxtLink>
    <span v-else />
    <NuxtLink
      v-if="next"
      :to="`${basePath}/${next.slug}`"
      class="flex max-w-[48%] flex-col rounded-xl border border-gray-100 bg-white p-3 text-right hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <span class="text-[11px] text-gray-400 dark:text-gray-500">Suivant →</span>
      <span class="mt-0.5 truncate text-xs font-semibold text-gray-900 dark:text-white">{{
        next.full_name
      }}</span>
    </NuxtLink>
    <span v-else />
  </nav>
</template>
