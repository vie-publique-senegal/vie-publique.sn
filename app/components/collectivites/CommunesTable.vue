<template>
  <div>
    <!-- Desktop : table -->
    <div class="custom-shadow hidden overflow-hidden rounded-lg bg-white dark:bg-gray-800 md:block">
      <table class="w-full text-sm">
        <thead
          class="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        >
          <tr>
            <th class="px-4 py-3 font-medium">Commune</th>
            <th class="px-4 py-3 font-medium">Région</th>
            <th class="px-4 py-3 font-medium">Maire</th>
            <th class="px-4 py-3 font-medium">Parti</th>
            <th class="px-4 py-3 text-right font-medium">Population</th>
            <th class="px-4 py-3 text-right font-medium">Superficie</th>
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
            <td class="px-4 py-3 text-gray-900 dark:text-gray-200">{{ c.maire.nom }}</td>
            <td class="px-4 py-3"><CollectivitesPartiBadge :parti="c.maire.parti" /></td>
            <td class="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-200">
              {{ formatNumber(c.population) }}
            </td>
            <td class="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-200">
              {{ c.superficie }} km²
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
        class="custom-shadow block rounded-lg bg-white p-4 dark:bg-gray-800"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-medium text-gray-900 dark:text-white">{{ c.nom }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ c.region }} · {{ c.departement }}
            </div>
          </div>
          <CollectivitesPartiBadge :parti="c.maire.parti" />
        </div>
        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span
            >Maire :
            <span class="font-medium text-gray-900 dark:text-gray-200">{{
              c.maire.nom
            }}</span></span
          >
          <span>{{ formatNumber(c.population) }} hab.</span>
          <span>{{ c.superficie }} km²</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commune } from '~~/types/collectivite';
import { formatNumber } from '#shared/communes';

interface Props {
  communes: Commune[];
}

defineProps<Props>();
</script>
