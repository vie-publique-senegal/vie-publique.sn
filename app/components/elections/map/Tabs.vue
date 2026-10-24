<script setup lang="ts">
interface Tab {
  id: 'nationale' | 'diaspora' | 'resume';
  label: string;
  to: string;
  icon: string;
}

interface Props {
  active?: Tab['id'] | null;
  query?: Record<string, string>;
}

withDefaults(defineProps<Props>(), { active: null, query: () => ({}) });

const tabs: Tab[] = [
  {
    id: 'nationale',
    label: 'Nationale',
    to: '/elections-senegal/carte-electorale/nationale',
    icon: 'i-heroicons-map',
  },
  {
    id: 'diaspora',
    label: 'Diaspora',
    to: '/elections-senegal/carte-electorale/diaspora',
    icon: 'i-heroicons-globe-europe-africa',
  },
  {
    id: 'resume',
    label: 'Résumé',
    to: '/elections-senegal/carte-electorale/resume',
    icon: 'i-heroicons-chart-bar',
  },
];
</script>

<template>
  <nav
    class="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800"
    aria-label="Carte électorale"
  >
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.id"
      :to="{ path: tab.to, query: query ?? {} }"
      class="inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
      :class="
        tab.id === active
          ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
      "
    >
      <UIcon :name="tab.icon" class="h-4 w-4" />
      {{ tab.label }}
    </NuxtLink>
  </nav>
</template>
