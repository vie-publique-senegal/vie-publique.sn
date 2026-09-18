<!--
  Tableau du module Collectivités territoriales : une liste d'entités cliquables,
  décrite par ses colonnes (cf. `composables/collectivites/dataTable.ts`).

  Deux rendus pour un même jeu de colonnes : table sur desktop, blocs empilés sur
  mobile (règle « pas de scroll horizontal » du design.md). La PREMIÈRE colonne
  est la colonne d'identité : elle porte le lien de la ligne et le `hint`, les
  suivantes sont des attributs, éventuellement cliquables eux aussi (`col.to`).

  ⚠️ Le bloc mobile n'est PAS un lien englobant : une cellule cliquable (le maire)
  y produirait un `<a>` dans un `<a>`, HTML invalide au comportement imprévisible.
  Chaque lien est donc porté par son propre texte, dans les deux rendus.
-->
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
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3 font-medium"
              :class="col.align === 'right' && 'text-right'"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
          <tr
            v-for="row in rows"
            :key="rowKey(row)"
            class="transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <td
              v-for="(col, index) in columns"
              :key="col.key"
              class="px-4 py-3"
              :class="[
                col.align === 'right' ? 'text-right tabular-nums' : '',
                index === 0 ? '' : 'text-gray-500 dark:text-gray-400',
              ]"
            >
              <NuxtLink
                v-if="lien(col, row, index)"
                :to="lien(col, row, index)!"
                class="text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                {{ display(col, row) }}
              </NuxtLink>
              <template v-else>{{ display(col, row) }}</template>

              <div
                v-if="index === 0 && col.hint?.(row)"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                {{ col.hint(row) }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile : blocs empilés (pas de scroll horizontal) -->
    <div class="space-y-3 md:hidden">
      <div
        v-for="row in rows"
        :key="rowKey(row)"
        class="rounded-xl bg-white p-4 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      >
        <NuxtLink
          :to="to(row)"
          class="text-primary-600 dark:text-primary-400 font-medium hover:underline"
        >
          {{ columns[0] ? display(columns[0], row) : '' }}
        </NuxtLink>
        <div v-if="columns[0]?.hint?.(row)" class="text-xs text-gray-500 dark:text-gray-400">
          {{ columns[0].hint(row) }}
        </div>
        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span v-for="col in columns.slice(1)" :key="col.key">
            {{ col.label }} :
            <NuxtLink
              v-if="col.to?.(row)"
              :to="col.to(row)!"
              class="text-primary-600 dark:text-primary-400 font-medium hover:underline"
            >
              {{ display(col, row) }}
            </NuxtLink>
            <span v-else class="font-medium text-gray-900 dark:text-gray-200">
              {{ display(col, row) }}
            </span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import type { DataTableColumn } from '~/composables/collectivites/dataTable';

interface Props {
  rows: T[];
  /** Première colonne = identité (lien de la ligne + hint), les suivantes = attributs. */
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  /** Destination de l'entité de la ligne (portée par la première colonne). */
  to: (row: T) => string;
}

const props = defineProps<Props>();

/** Une valeur absente du référentiel s'affiche « - », jamais reconstituée. */
const display = (col: DataTableColumn<T>, row: T) => {
  const value = col.value(row);
  return value === null || value === '' ? '-' : value;
};

/** La première colonne pointe l'entité ; les autres seulement si elles le déclarent. */
const lien = (col: DataTableColumn<T>, row: T, index: number) =>
  index === 0 ? props.to(row) : (col.to?.(row) ?? null);
</script>
