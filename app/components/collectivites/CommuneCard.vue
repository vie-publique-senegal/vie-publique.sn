<template>
  <NuxtLink
    :to="`/collectivites-territoriales/communes/${commune.slug}`"
    class="group block overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-lg dark:bg-gray-800 dark:ring-gray-800"
  >
    <!-- Bandeau : photo de couverture du profil d'entité si elle existe, sinon
         aplat sobre (aucune illustration d'archive à la place d'un visuel réel). -->
    <div class="relative h-32 overflow-hidden bg-gray-100 dark:bg-gray-700">
      <img
        v-if="commune.photoCouverture"
        :src="useCmsImage(commune.photoCouverture)"
        :alt="commune.nom"
        loading="lazy"
        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div v-else class="h-full w-full bg-gradient-to-br from-sky-700 to-sky-900" />
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
        <p class="text-xl font-bold leading-tight sm:text-2xl">{{ commune.nom }}</p>
        <div class="text-xs opacity-90">{{ commune.region }} · {{ commune.departement }}</div>
      </div>
    </div>
    <div class="p-4">
      <div class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Maire</div>
      <div v-if="commune.maire" class="mt-0.5 font-medium text-gray-900 dark:text-white">
        {{ commune.maire.nom }}
      </div>
      <div v-else class="mt-0.5 text-sm italic text-gray-400 dark:text-gray-500">Non renseigné</div>

      <div
        class="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-center dark:border-gray-700"
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
import type { CommuneGeo } from '~~/types/collectivite';
import { formatNumber } from '#shared/format';

interface Props {
  commune: CommuneGeo;
}

const props = defineProps<Props>();

const stats = computed(() => [
  {
    label: props.commune.populationAnnee
      ? `Population ${props.commune.populationAnnee}`
      : 'Population',
    value: props.commune.population === null ? '-' : formatNumber(props.commune.population),
  },
  {
    label: 'Arrondissement',
    value: props.commune.arrondissement ?? '-',
  },
]);
</script>
