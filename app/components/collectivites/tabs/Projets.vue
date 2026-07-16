<template>
  <div>
    <div class="mb-6 flex flex-wrap gap-2">
      <button
        v-for="s in STATUTS"
        :key="s"
        type="button"
        class="rounded-full border px-4 py-1.5 text-sm transition"
        :class="
          statut === s
            ? 'border-primary-600 bg-primary-600 text-white'
            : 'hover:border-primary-400 border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
        "
        @click="statut = s"
      >
        {{ s }}
      </button>
    </div>
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="(p, i) in filtered"
        :key="i"
        class="custom-shadow rounded-lg bg-white p-5 dark:bg-gray-800"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{{
            p.categorie
          }}</span>
          <span
            class="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
            :class="statutClass(p.statut)"
          >
            {{ p.statut }}
          </span>
        </div>
        <h3 class="mt-2 text-lg font-semibold leading-tight text-gray-900 dark:text-white">
          {{ p.titre }}
        </h3>
        <div v-if="p.budget" class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Budget :
          <strong class="text-gray-900 dark:text-white">{{ formatFCFA(p.budget) }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commune, Projet } from '~~/types/collectivite';
import { formatFCFA } from '#shared/communes';

interface Props {
  commune: Commune;
}

const props = defineProps<Props>();

const STATUTS = ['Tous', 'En cours', 'Terminé', 'À venir'] as const;
type Statut = (typeof STATUTS)[number];

const statut = ref<Statut>('Tous');

const filtered = computed(() =>
  statut.value === 'Tous'
    ? props.commune.projets
    : props.commune.projets.filter((p) => p.statut === statut.value),
);

// Couleur porteuse de sens uniquement (statut) : vert=Terminé, sky=En cours, gris=À venir
const statutClass = (s: Projet['statut']) => {
  if (s === 'Terminé') return 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300';
  if (s === 'En cours') return 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
};
</script>
