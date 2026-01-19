<script setup lang="ts">
import { useElectionMapDataResult } from '../../../../composables/elections/useElectionMapJsonResult';

// useElectionMapDataResult est auto-importé par Nuxt

interface Props {
  electionType: string;
  electionYear: number;
}

const props = defineProps<Props>();

const { getTableDataResult, loading } = useElectionMapDataResult();

const {
  data: tableData,
  pending,
  refresh,
} = await useAsyncData(
  `table-results-${props.electionType}-${props.electionYear}`,
  () => getTableDataResult(props.electionType, props.electionYear),
  {
    watch: [() => props.electionType, () => props.electionYear],
  },
);

// Sort logic
const sortConfig = ref({
  field: 'commune' as 'commune' | 'coalition' | 'votes',
  direction: 'asc' as 'asc' | 'desc',
});

const searchQuery = ref('');

const filteredData = computed(() => {
  if (!tableData.value) return [];
  if (!searchQuery.value) return tableData.value;

  const query = searchQuery.value.toLowerCase().trim();
  return tableData.value.filter(
    (item) =>
      item.commune.toLowerCase().includes(query) ||
      item.coalition.toLowerCase().includes(query) ||
      item.headOfList.toLowerCase().includes(query),
  );
});

const sortedData = computed(() => {
  const data = [...filteredData.value];
  return data.sort((a, b) => {
    let valA = a[sortConfig.value.field];
    let valB = b[sortConfig.value.field];

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    const multiplier = sortConfig.value.direction === 'asc' ? 1 : -1;
    if (valA < valB) return -1 * multiplier;
    if (valA > valB) return 1 * multiplier;
    return 0;
  });
});

const toggleSort = (field: 'commune' | 'coalition' | 'votes') => {
  if (sortConfig.value.field === field) {
    sortConfig.value.direction = sortConfig.value.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortConfig.value.field = field;
    sortConfig.value.direction = field === 'votes' ? 'desc' : 'asc';
  }
};

const getSortIcon = (field: string) => {
  if (sortConfig.value.field !== field) return 'i-heroicons-arrows-up-down';
  return sortConfig.value.direction === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down';
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('fr-FR').format(num);
};
</script>

<template>
  <div class="relative flex h-full flex-col gap-4">
    <!-- Search Bar -->
    <div class="flex items-center justify-between gap-4">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        placeholder="Rechercher une commune, coalition..."
        class="w-full shadow-sm sm:max-w-md"
        size="md"
        :ui="{ rounded: 'rounded-xl', padding: { md: 'px-4 py-2.5' } }"
      />

      <div v-if="sortedData.length > 0" class="hidden sm:block">
        <UBadge color="gray" variant="subtle" class="rounded-full px-3 py-1">
          {{
            sortedData.length === 1
              ? `${sortedData.length} commune trouvée`
              : `${sortedData.length} communes trouvées`
          }}
        </UBadge>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="pending || loading"
      class="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white/50 py-20 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/50"
    >
      <div class="relative">
        <div
          class="border-primary-500/20 border-t-primary-600 h-12 w-12 animate-spin rounded-full border-4"
        ></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="bg-primary-600 h-2 w-2 animate-pulse rounded-full"></div>
        </div>
      </div>
      <p class="mt-4 animate-pulse text-sm font-medium text-gray-500">
        Chargement des résultats locaux...
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!sortedData.length"
      class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 dark:border-gray-800 dark:bg-gray-900"
    >
      <UIcon
        name="i-heroicons-table-cells"
        class="mb-4 h-12 w-12 text-gray-300 dark:text-gray-700"
      />
      <h3 class="text-lg font-bold text-gray-500">Aucun résultat trouvé</h3>
      <p class="text-sm text-gray-400">Aucune donnée n'est disponible pour cette sélection.</p>
    </div>

    <!-- Table Container -->
    <div
      v-else
      class="flex-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div
        class="scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 relative max-h-[calc(100vh-350px)] overflow-x-auto overflow-y-auto sm:max-h-150"
      >
        <table class="w-full border-collapse text-left">
          <!-- Sticky Header -->
          <thead
            class="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95"
          >
            <tr>
              <th
                scope="col"
                class="min-w-37.5 p-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400"
              >
                <button
                class="hover:text-primary-600 flex items-center gap-1 uppercase transition-colors"
                @click="toggleSort('commune')"
                >
                  Commune
                  <UIcon :name="getSortIcon('commune')" class="h-3.5 w-3.5" />
                </button>
              </th>
              <th
                scope="col"
                class="min-w-45 p-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400"
              >
                <button
                class="hover:text-primary-600 flex items-center gap-1 uppercase transition-colors"
                @click="toggleSort('coalition')"
                >
                  Coalition Gagnante
                  <UIcon :name="getSortIcon('coalition')" class="h-3.5 w-3.5" />
                </button>
              </th>
              <th
                scope="col"
                class="min-w-37.5 p-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400"
              >
                Tête de liste
              </th>
              <th
                scope="col"
                class="min-w-25 p-4 text-right text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400"
              >
                <button
                class="hover:text-primary-600 flex w-full items-center justify-end gap-1 uppercase transition-colors"
                  @click="toggleSort('votes')"
                >
                  Voix
                  <UIcon :name="getSortIcon('votes')" class="h-3.5 w-3.5" />
                </button>
              </th>
            </tr>
          </thead>

          <!-- Table Body -->
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="item in sortedData"
              :key="item.id"
              class="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30"
            >
              <!-- Commune -->
              <td class="p-4">
                <div class="flex flex-col">
                  <span
                    class="text-sm font-bold uppercase tracking-tight text-gray-900 dark:text-white"
                    >{{ item.commune }}</span
                  >
                </div>
              </td>

              <!-- Coalition -->
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <div
                    class="bg-primary-500 h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(var(--color-primary-500),0.4)]"
                  ></div>
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{
                    item.coalition
                  }}</span>
                </div>
              </td>

              <!-- Head of List -->
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-user" class="h-3.5 w-3.5 text-gray-400" />
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{
                    item.headOfList
                  }}</span>
                </div>
              </td>

              <!-- Votes -->
              <td class="p-4 text-right">
                <div class="inline-flex flex-col items-end">
                  <span class="text-sm font-black text-gray-900 dark:text-white">{{
                    formatNumber(item.votes)
                  }}</span>
                  <UBadge
                    size="xs"
                    color="gray"
                    variant="subtle"
                    class="mt-0.5 font-bold uppercase tracking-tighter"
                    >voix</UBadge
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for a more premium look */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  border-radius: 10px;
}
</style>
