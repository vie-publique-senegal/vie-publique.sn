<template>
  <div>
    <!-- Desktop : table -->
    <div
      class="hidden overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 md:block"
    >
      <table class="w-full text-sm">
        <thead
          class="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        >
          <tr>
            <th class="px-4 py-3 font-medium">Commune</th>
            <th class="px-4 py-3 font-medium">Région</th>
            <th class="px-4 py-3 font-medium">Arrondissement</th>
            <th class="px-4 py-3 font-medium">Maire</th>
            <th class="px-4 py-3 text-right font-medium">Population</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
          <tr
            v-for="c in communes"
            :key="c.slug"
            class="transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <td class="px-4 py-3">
              <NuxtLink
                :to="`/collectivites-territoriales/communes/${c.slug}`"
                class="hover:text-primary-600 dark:hover:text-primary-400 font-medium text-gray-900 dark:text-white"
              >
                {{ c.nom }}
              </NuxtLink>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ c.departement }}</div>
            </td>
            <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ c.region }}</td>
            <td class="px-4 py-3 text-gray-500 dark:text-gray-400">
              {{ c.arrondissement ?? '-' }}
            </td>
            <td class="px-4 py-3">
              <span v-if="c.maire" class="text-gray-900 dark:text-gray-200">{{ c.maire.nom }}</span>
              <span v-else class="italic text-gray-400 dark:text-gray-500">Non renseigné</span>
            </td>
            <td class="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-200">
              {{ c.population === null ? '-' : formatNumber(c.population) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile : blocs empilés (pas de scroll horizontal) -->
    <div class="space-y-3 md:hidden">
      <NuxtLink
        v-for="c in communes"
        :key="c.slug"
        :to="`/collectivites-territoriales/communes/${c.slug}`"
        class="hover:ring-primary-300 dark:hover:ring-primary-700 block rounded-xl bg-white p-4 ring-1 ring-gray-200 transition dark:bg-gray-800 dark:ring-gray-700"
      >
        <div>
          <div class="font-medium text-gray-900 dark:text-white">{{ c.nom }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ c.region }} · {{ c.departement }}
          </div>
        </div>
        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Maire :
            <span v-if="c.maire" class="font-medium text-gray-900 dark:text-gray-200">
              {{ c.maire.nom }}
            </span>
            <span v-else class="italic">non renseigné</span>
          </span>
          <span v-if="c.population !== null">{{ formatNumber(c.population) }} hab.</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommuneGeo } from '~~/types/collectivite';
import { formatNumber } from '#shared/format';

interface Props {
  communes: CommuneGeo[];
}

defineProps<Props>();
</script>
