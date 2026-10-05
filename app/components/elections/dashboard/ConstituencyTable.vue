<script setup lang="ts">
/**
 * Circonscriptions (départements) d'une élection locale, en tableau sobre.
 * Chaque ligne est un vrai lien (indexable, ouvrable dans un nouvel onglet) vers
 * la page des listes en lice de la circonscription.
 */
import type { Constituency } from '~/composables/elections/dashboard/useElectoralConstituencies';

interface Props {
  constituencies: Constituency[];
  electionSlug: string;
}

const props = defineProps<Props>();

const constituencyUrl = (c: Constituency) =>
  `/elections-senegal/${props.electionSlug}/candidats/circonscription/${c.slug}`;

const regionUrl = (c: Constituency) =>
  c.region_slug ? `/collectivites-territoriales/regions/${c.region_slug}` : null;

// Lien région posé au-dessus du lien pleine ligne (`before:inset-0`) pour rester cliquable
const regionLinkClass =
  'relative z-10 text-primary-600 underline decoration-primary-600/30 underline-offset-2 hover:decoration-primary-600 dark:text-primary-400 dark:decoration-primary-400/30 dark:hover:decoration-primary-400';
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
  >
    <table class="w-full text-left text-sm">
      <thead
        class="border-b border-gray-200 text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400"
      >
        <tr>
          <th scope="col" class="px-4 py-2.5 font-medium">Circonscription</th>
          <th scope="col" class="hidden px-4 py-2.5 font-medium sm:table-cell">Région</th>
          <th scope="col" class="px-2 py-2.5 text-right font-medium sm:px-4">Communes</th>
          <th scope="col" class="px-2 py-2.5 text-right font-medium sm:px-4">Listes</th>
          <th scope="col" class="w-8 pr-3"><span class="sr-only">Voir</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
        <tr
          v-for="c in constituencies"
          :key="c.id"
          class="group relative transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
        >
          <td class="px-4 py-3">
            <NuxtLink
              v-if="c.slug"
              :to="constituencyUrl(c)"
              class="group-hover:text-primary-600 dark:group-hover:text-primary-400 font-semibold text-gray-900 before:absolute before:inset-0 focus:outline-none dark:text-white"
            >
              {{ c.name }}
            </NuxtLink>
            <span v-else class="font-semibold text-gray-900 dark:text-white">{{ c.name }}</span>
            <span v-if="c.region" class="block text-xs text-gray-500 dark:text-gray-400 sm:hidden">
              <NuxtLink v-if="regionUrl(c)" :to="regionUrl(c)!" :class="regionLinkClass">
                {{ c.region }}
              </NuxtLink>
              <template v-else>{{ c.region }}</template>
            </span>
          </td>
          <td class="hidden px-4 py-3 text-gray-600 dark:text-gray-300 sm:table-cell">
            <NuxtLink v-if="c.region && regionUrl(c)" :to="regionUrl(c)!" :class="regionLinkClass">
              {{ c.region }}
            </NuxtLink>
            <template v-else>{{ c.region || '—' }}</template>
          </td>
          <td class="px-2 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300 sm:px-4">
            {{ c.communes_count ?? '—' }}
          </td>
          <td
            class="px-2 py-3 text-right font-semibold tabular-nums text-gray-900 dark:text-white sm:px-4"
          >
            {{ c.coalitions_count ?? '—' }}
          </td>
          <td class="pr-3 text-right">
            <UIcon
              name="i-heroicons-chevron-right-20-solid"
              class="group-hover:text-primary-500 ml-auto block h-4 w-4 text-gray-300 dark:text-gray-500"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
