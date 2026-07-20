<template>
  <div class="grid gap-8">
    <div>
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Adjoints au maire</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(a, i) in commune.adjoints"
          :key="i"
          class="rounded-xl bg-white p-5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            >
              {{ initials(a.nom) }}
            </div>
            <div class="min-w-0">
              <div class="font-medium text-gray-900 dark:text-white">{{ a.nom }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ a.fonction }}</div>
              <div v-if="a.telephone" class="text-primary-600 dark:text-primary-400 mt-1 text-xs">
                {{ a.telephone }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div>
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Secrétariat municipal
      </h2>
      <div class="rounded-xl bg-white p-5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
        <div class="flex items-center gap-3">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
          >
            {{ initials(commune.secretaireMunicipal.nom) }}
          </div>
          <div>
            <div class="font-medium text-gray-900 dark:text-white">
              {{ commune.secretaireMunicipal.nom }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Secrétaire municipal</div>
            <div
              v-if="commune.secretaireMunicipal.telephone"
              class="text-primary-600 dark:text-primary-400 mt-0.5 text-xs"
            >
              {{ commune.secretaireMunicipal.telephone }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commune } from '~~/types/collectivite';

interface Props {
  commune: Commune;
}

defineProps<Props>();

const initials = (nom: string) =>
  nom
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
</script>
