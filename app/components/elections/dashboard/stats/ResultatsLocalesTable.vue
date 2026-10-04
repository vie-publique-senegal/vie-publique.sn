<script setup lang="ts">
import { useElectionMapDataResult } from '~/composables/useElectionMapJsonResult';

interface Props {
  electionType: string;
  electionYear: number;
}

const props = defineProps<Props>();

const { getTableDataResult, loading } = useElectionMapDataResult();

// Utiliser useLazyAsyncData sans await pour éviter les problèmes de rendu initial
const {
  data: tableData,
  pending,
  refresh,
} = useLazyAsyncData(
  `table-results-${props.electionType}-${props.electionYear}`,
  () => getTableDataResult(props.electionType, props.electionYear),
  {
    watch: [() => props.electionType, () => props.electionYear],
    immediate: true,
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

defineExpose({
  hasData: computed(() => (tableData.value?.length || 0) > 0),
  loading: computed(() => pending.value || loading.value),
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Search Bar (uniquement si des résultats existent) -->
    <div v-if="tableData && tableData.length > 0" class="flex items-center gap-3">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        placeholder="Rechercher une commune, coalition..."
        class="flex-1"
        size="sm"
        :ui="{ rounded: 'rounded-xl', padding: { sm: 'px-3 py-2' } }"
      />
      <UBadge
        v-if="sortedData.length > 0"
        color="gray"
        variant="subtle"
        class="shrink-0 rounded-full px-2.5 py-1 text-[10px]"
      >
        {{ sortedData.length }}
      </UBadge>
    </div>

    <!-- Sort controls (uniquement si des résultats existent) -->
    <div
      v-if="tableData && tableData.length > 0"
      class="flex items-center gap-3 px-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400"
    >
      <button
        class="hover:text-primary-600 flex items-center gap-1 transition-colors"
        @click="toggleSort('commune')"
      >
        Commune
        <UIcon :name="getSortIcon('commune')" class="h-3 w-3" />
      </button>
      <button
        class="hover:text-primary-600 flex items-center gap-1 transition-colors"
        @click="toggleSort('coalition')"
      >
        Coalition
        <UIcon :name="getSortIcon('coalition')" class="h-3 w-3" />
      </button>
      <button
        class="hover:text-primary-600 ml-auto flex items-center gap-1 transition-colors"
        @click="toggleSort('votes')"
      >
        Voix
        <UIcon :name="getSortIcon('votes')" class="h-3 w-3" />
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="pending || loading" class="flex flex-col items-center justify-center py-20">
      <div
        class="border-primary-500/20 border-t-primary-600 h-10 w-10 animate-spin rounded-full border-4"
      ></div>
      <p class="mt-4 animate-pulse text-sm text-gray-500">Chargement des résultats...</p>
    </div>

    <!-- Empty State : aucune donnée pour cette élection -->
    <div
      v-else-if="!tableData || !tableData.length"
      class="flex flex-col items-center justify-center py-16"
    >
      <UIcon name="i-heroicons-chart-bar" class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-700" />
      <h3 class="text-base font-bold text-gray-500">Aucun résultat disponible</h3>
      <p class="text-xs text-gray-400">Les résultats ne sont pas encore publiés.</p>
    </div>

    <!-- Empty State : recherche sans résultat -->
    <div v-else-if="!sortedData.length" class="flex flex-col items-center justify-center py-16">
      <UIcon
        name="i-heroicons-magnifying-glass"
        class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-700"
      />
      <h3 class="text-base font-bold text-gray-500">Aucun résultat trouvé</h3>
      <p class="text-xs text-gray-400">Essayez une autre recherche.</p>
    </div>

    <!-- Results List -->
    <div v-else class="max-h-[calc(100vh-300px)] space-y-1.5 overflow-y-auto">
      <div
        v-for="item in sortedData"
        :key="item.id"
        class="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/60"
      >
        <!-- Commune + Coalition info -->
        <div class="min-w-0 flex-1">
          <h4
            class="truncate text-sm font-bold uppercase tracking-tight text-gray-900 dark:text-white"
          >
            {{ item.commune }}
          </h4>
          <div class="mt-0.5 flex items-center gap-1.5">
            <div class="bg-primary-500 h-1.5 w-1.5 shrink-0 rounded-full"></div>
            <span class="truncate text-xs text-gray-600 dark:text-gray-400">{{
              item.coalition
            }}</span>
          </div>
          <p v-if="item.headOfList" class="truncate pl-3 text-[10px] text-gray-400">
            {{ item.headOfList }}
          </p>
        </div>

        <!-- Votes -->
        <div class="shrink-0 text-right">
          <span class="text-sm font-black tabular-nums text-gray-900 dark:text-white">{{
            formatNumber(item.votes)
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
