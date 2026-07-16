<template>
  <div>
    <!-- Desktop : table -->
    <div class="custom-shadow hidden overflow-hidden rounded-lg bg-white dark:bg-gray-800 md:block">
      <table class="w-full text-sm">
        <thead
          class="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        >
          <tr>
            <th class="px-4 py-3 font-medium">Titre</th>
            <th class="px-4 py-3 font-medium">Type</th>
            <th class="px-4 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
          <tr
            v-for="(d, i) in commune.documents"
            :key="i"
            class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ d.titre }}</td>
            <td class="px-4 py-3">
              <span
                class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                {{ d.type }}
              </span>
            </td>
            <td class="px-4 py-3 tabular-nums text-gray-500 dark:text-gray-400">
              {{ formatDate(d.date) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile : blocs empilés -->
    <div class="space-y-3 md:hidden">
      <div
        v-for="(d, i) in commune.documents"
        :key="i"
        class="custom-shadow rounded-lg bg-white p-4 dark:bg-gray-800"
      >
        <div class="font-medium text-gray-900 dark:text-white">{{ d.titre }}</div>
        <div class="mt-2 flex items-center gap-3 text-xs">
          <span
            class="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            {{ d.type }}
          </span>
          <span class="tabular-nums text-gray-500 dark:text-gray-400">{{
            formatDate(d.date)
          }}</span>
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

const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
</script>
