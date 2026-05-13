<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useElectoralCoalitions } from '~/composables/elections/dashboard/useElectoralCoalitions';
import { type TableResultItem, useElectionMapDataResult } from '~/composables/useElectionMapJsonResult';

const { selectedYear, selectedType, currentElection, loadingConfig } = useElectoralDashboard();

const isLocalElection = computed(() => selectedType.value === 'locale');

const { coalitions, loading: loadingCoalitions } = useElectoralCoalitions({
  year: selectedYear,
  type: selectedType,
  ranking: true,
  search: ref(''),
});

const resultViewType = ref('list');
const resultDeptPanelOpen = ref(false);
const resultDeptPanelData = ref<any>(null);
const resultCommunesByDept = ref<TableResultItem[]>([]);
const mapResultHasNoData = ref(false);

const { getTableDataResult } = useElectionMapDataResult();

const loadLocaleResultsData = async () => {
  if (resultCommunesByDept.value.length > 0) return;
  const data = await getTableDataResult(selectedType.value, selectedYear.value);
  resultCommunesByDept.value = data;
};

watch([resultViewType, isLocalElection], async ([view, isLocale]) => {
  if (view === 'map' && isLocale) await loadLocaleResultsData();
}, { immediate: true });

const mapIsReady = ref(false);

watch(resultViewType, (newView) => {
  if (newView === 'map') mapIsReady.value = false;
});

watch([selectedType, selectedYear], () => {
  resultCommunesByDept.value = [];
  resultDeptPanelOpen.value = false;
  resultDeptPanelData.value = null;
  mapResultHasNoData.value = false;
  mapIsReady.value = false;
});

const handleResultDeptSelected = async (dept: any) => {
  resultDeptPanelData.value = dept;
  resultDeptPanelOpen.value = true;
};

const closeResultDeptPanel = () => {
  resultDeptPanelOpen.value = false;
  setTimeout(() => { resultDeptPanelData.value = null; }, 300);
};

const resultCommunesForDept = computed(() => {
  if (!resultDeptPanelData.value) return [];
  if (resultDeptPanelData.value.communes?.length > 0) return resultDeptPanelData.value.communes;
  if (!resultCommunesByDept.value.length) return [];
  const deptKey = resultDeptPanelData.value.departement.trim().toLowerCase();
  return resultCommunesByDept.value.filter(r =>
    r.departement && r.departement.trim().toLowerCase() === deptKey
  );
});

useSeoMeta({
  title: () => currentElection.value?.name
    ? `Résultats · ${currentElection.value.name} | Vie-Publique SN`
    : 'Résultats | Élections Sénégal',
  description: () => currentElection.value?.name
    ? `Résultats officiels de ${currentElection.value.name} : classement des coalitions et carte des résultats.`
    : 'Résultats des élections au Sénégal.',
  ogTitle: () => currentElection.value?.name
    ? `Résultats · ${currentElection.value.name}`
    : 'Résultats des Élections au Sénégal',
  ogDescription: () => currentElection.value?.name
    ? `Résultats officiels de ${currentElection.value.name} : classement des coalitions et carte des résultats.`
    : 'Résultats des élections au Sénégal.',
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-3 animate-in fade-in duration-700">
    <div class="flex items-center justify-between">
      <h2 class="text-xl sm:text-2xl font-black uppercase tracking-tighter">Résultats Globaux</h2>
      <div class="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex gap-1">
        <UButton :color="resultViewType === 'list' ? 'white' : 'gray'" :variant="resultViewType === 'list' ? 'solid' : 'ghost'" size="xs" class="rounded-lg transition-all" icon="i-heroicons-table-cells" @click="resultViewType = 'list'">
          <span class="hidden sm:inline">Liste</span>
        </UButton>
        <UButton :color="resultViewType === 'map' ? 'white' : 'gray'" :variant="resultViewType === 'map' ? 'solid' : 'ghost'" size="xs" class="rounded-lg transition-all" icon="i-heroicons-map" @click="resultViewType = 'map'">
          <span class="hidden sm:inline">Carte</span>
        </UButton>
      </div>
    </div>

    <div class="min-h-[400px]">
      <div v-if="resultViewType === 'list'">
        <div v-if="selectedType === 'locale'">
          <ElectionsDashboardStatsElectionResultatsLocalesTable :election-type="selectedType" :election-year="selectedYear" />
        </div>
        <template v-else>
          <div v-if="loadingCoalitions" class="space-y-3">
            <USkeleton v-for="i in 6" :key="i" class="h-16 w-full rounded-xl" />
          </div>
          <div v-else-if="!coalitions || coalitions.length === 0" class="flex flex-col items-center justify-center h-64 text-center px-4">
            <UIcon name="i-heroicons-chart-bar" class="w-12 h-12 sm:w-16 sm:h-16 text-gray-200 dark:text-gray-800 mb-4" />
            <h3 class="text-base sm:text-lg font-bold text-gray-400">Aucun résultat disponible</h3>
            <p class="text-xs sm:text-sm text-gray-500">Les résultats ne sont pas encore publiés.</p>
          </div>
          <div v-else>
            <ElectionsDashboardResultChart v-if="['presidential', 'legislative'].includes(selectedType)" :results="coalitions" :type="selectedType" class="mb-6" />
            <ElectionsDashboardResultClassement :coalitions="coalitions" :loading="loadingCoalitions" :type="selectedType" />
          </div>
        </template>
      </div>

      <div v-else-if="resultViewType === 'map'" class="w-full h-full min-h-[400px] sm:min-h-[500px]">
        <!-- Loading state pendant le chargement de la config -->
        <div v-if="loadingConfig" class="flex flex-col items-center justify-center py-20">
          <div class="relative h-12 w-12">
            <div class="absolute inset-0 border-4 border-primary-100 dark:border-primary-900 rounded-full"></div>
            <div class="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p class="text-sm font-medium text-gray-400 animate-pulse mt-3">Chargement...</p>
        </div>
        <!-- Erreur si pas de données après chargement -->
        <div v-else-if="!currentElection?.id || mapResultHasNoData" class="flex flex-col items-center justify-center py-20 text-center">
          <div class="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-6">
            <UIcon name="i-heroicons-map" class="h-16 w-16 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 class="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">Carte des résultats non disponible</h3>
          <p class="text-sm text-gray-400 dark:text-gray-500 max-w-md">Les données cartographiques des résultats pour cette élection ne sont pas encore disponibles.</p>
        </div>
        <ClientOnly v-else>
          <div class="relative w-full min-h-[500px] sm:min-h-[600px]">
            <div v-if="!mapIsReady" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
              <div class="relative h-12 w-12">
                <div class="absolute inset-0 border-4 border-primary-100 dark:border-primary-900 rounded-full"></div>
                <div class="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p class="text-sm font-medium text-gray-400 animate-pulse">Chargement de la carte...</p>
            </div>
            <template v-if="isLocalElection">
              <ElectionMapComponentResultLocale
                :key="`result-map-locale-${selectedYear}`"
                :election-type="selectedType"
                :election-year="selectedYear"
                @department-selected="handleResultDeptSelected"
                @map-error="mapResultHasNoData = true"
                @map-ready="mapIsReady = true"
              />
            </template>
            <ElectionMapComponentResult
              v-else
              :election-type="selectedType"
              :election-year="selectedYear"
              @map-error="mapResultHasNoData = true"
              @map-ready="mapIsReady = true"
            />
          </div>
          <template #fallback>
            <div class="flex h-[500px] w-full items-center justify-center">
              <div class="flex flex-col items-center gap-3">
                <div class="relative h-12 w-12">
                  <div class="absolute inset-0 border-4 border-primary-100 dark:border-primary-900 rounded-full"></div>
                  <div class="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p class="text-sm font-medium text-gray-400 animate-pulse">Chargement de la carte...</p>
              </div>
            </div>
          </template>
        </ClientOnly>
      </div>
    </div>
  </div>

  <ElectionMapResultDepartmentPanel
    :department="resultDeptPanelData"
    :is-open="resultDeptPanelOpen"
    :all-results="resultCommunesForDept"
    @close="closeResultDeptPanel"
  />
</template>
