<template>
  <div class="my-6">
    <h2 class="mb-4 text-center text-xl font-semibold text-gray-800 dark:text-white">
      Suivez-nous sur les réseaux sociaux
    </h2>

    <div class="mx-auto max-w-5xl px-4">
      <!-- Loading state -->
      <div v-if="loading" class="flex flex-wrap items-center justify-center gap-2">
        <div
          v-for="i in 5"
          :key="i"
          class="h-10 w-36 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
        />
      </div>

      <!-- Stats -->
      <div v-else class="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <a
          v-for="network in enrichedNetworks"
          :key="network.id"
          :href="network.link"
          target="_blank"
          rel="noopener noreferrer"
          class="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80 sm:px-4 sm:py-2.5"
          :class="network.hoverBorderClass"
        >
          <UIcon
            :name="network.icon"
            class="network-color h-4 w-4 shrink-0 sm:h-5 sm:w-5"
            :style="`--nc-light: ${network.colorLight}; --nc-dark: ${network.colorDark}`"
          />
          <span class="text-xs font-medium text-gray-700 dark:text-gray-300 sm:text-sm">
            {{ network.name }}
          </span>
          <span
            class="network-color text-xs font-bold sm:text-sm"
            :style="`--nc-light: ${network.colorLight}; --nc-dark: ${network.colorDark}`"
          >
            {{ formatFollowers(network.followers) }}
          </span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SocialStat } from '~~/types/social-stat';
import { formatFollowers, getSocialNetworkMeta } from '#shared/social-networks';

const { visibleStats: socialStats, loading } = useSocialStats();

const enrichedNetworks = computed(() =>
  socialStats.value.map((stat: SocialStat) => {
    const meta = getSocialNetworkMeta(stat.name);
    return {
      ...stat,
      icon: meta.icon,
      colorLight: meta.color,
      colorDark: meta.colorDark,
      hoverBorderClass: meta.hoverBorderClass,
    };
  }),
);
</script>

<style scoped>
.network-color {
  color: var(--nc-light);
}

.dark .network-color {
  color: var(--nc-dark);
}
</style>
