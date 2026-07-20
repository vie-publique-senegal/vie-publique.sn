<template>
  <div>
    <div class="mb-6 flex flex-wrap gap-2">
      <button
        v-for="g in GROUPS"
        :key="g"
        type="button"
        class="rounded-full border px-4 py-1.5 text-sm transition"
        :class="
          group === g
            ? 'border-primary-600 bg-primary-600 text-white'
            : 'hover:border-primary-400 border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
        "
        @click="group = g"
      >
        {{ g }} <span class="ml-1 opacity-70">({{ counts[g] }})</span>
      </button>
    </div>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="(cons, i) in filtered"
        :key="i"
        class="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
        >
          {{ initials(cons.nom) }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate font-medium text-gray-900 dark:text-white">{{ cons.nom }}</div>
          <div class="truncate text-xs text-gray-500 dark:text-gray-400">
            {{ cons.commission ? `Commission ${cons.commission}` : cons.groupe }}
          </div>
        </div>
        <CollectivitesPartiBadge :parti="cons.parti" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commune } from '~~/types/collectivite';

interface Props {
  commune: Commune;
}

const props = defineProps<Props>();

const GROUPS = ['Tous', 'Majorité', 'Opposition', 'Indépendant'] as const;
type Group = (typeof GROUPS)[number];

const group = ref<Group>('Tous');

const filtered = computed(() =>
  group.value === 'Tous'
    ? props.commune.conseillers
    : props.commune.conseillers.filter((c) => c.groupe === group.value),
);

const counts = computed<Record<Group, number>>(() => ({
  Tous: props.commune.conseillers.length,
  Majorité: props.commune.conseillers.filter((c) => c.groupe === 'Majorité').length,
  Opposition: props.commune.conseillers.filter((c) => c.groupe === 'Opposition').length,
  Indépendant: props.commune.conseillers.filter((c) => c.groupe === 'Indépendant').length,
}));

const initials = (nom: string) =>
  nom
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
</script>
