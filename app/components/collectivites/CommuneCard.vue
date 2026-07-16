<template>
  <NuxtLink
    :to="`/collectivites-territoriales/communes/${commune.slug}`"
    class="custom-shadow group block overflow-hidden rounded-lg bg-white transition hover:-translate-y-0.5 hover:shadow-xl dark:bg-gray-800"
  >
    <div class="relative h-40 overflow-hidden bg-gray-100 dark:bg-gray-700">
      <img
        :src="commune.photoCouverture"
        :alt="commune.nom"
        loading="lazy"
        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <div class="absolute left-3 top-3 flex gap-2">
        <span
          v-if="commune.chefLieu"
          class="rounded-full bg-sky-600/95 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white"
        >
          Chef-lieu
        </span>
        <span
          class="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-900"
        >
          {{ commune.type }}
        </span>
      </div>
      <div class="absolute bottom-3 left-3 right-3 text-white">
        <p class="text-2xl font-bold leading-tight">{{ commune.nom }}</p>
        <div class="text-xs opacity-90">{{ commune.region }} · {{ commune.departement }}</div>
      </div>
    </div>
    <div class="p-4">
      <div class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Maire</div>
      <div class="mt-0.5 font-medium text-gray-900 dark:text-white">{{ commune.maire.nom }}</div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {{ commune.maire.parti }} · Mandat {{ commune.maire.debutMandat.slice(0, 4) }}–{{
          commune.maire.finMandat.slice(0, 4)
        }}
      </div>
      <div
        class="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center dark:border-gray-700"
      >
        <div v-for="stat in stats" :key="stat.label">
          <div class="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {{ stat.label }}
          </div>
          <div class="text-sm font-medium text-gray-900 dark:text-white">{{ stat.value }}</div>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Commune } from '~~/types/collectivite';
import { formatNumber } from '#shared/communes';

interface Props {
  commune: Commune;
}

const props = defineProps<Props>();

const stats = computed(() => [
  { label: 'Population', value: formatNumber(props.commune.population) },
  { label: 'Superficie', value: `${props.commune.superficie} km²` },
  { label: 'Densité', value: `${formatNumber(props.commune.densite)}/km²` },
]);
</script>
