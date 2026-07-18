<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useElectoralCoalitions } from '~/composables/elections/dashboard/useElectoralCoalitions';
import {
  type TableResultItem,
  useElectionMapDataResult,
} from '~/composables/useElectionMapJsonResult';

const { selectedYear, selectedType, currentElection, loadingConfig } = useElectoralDashboard();

const isLocalElection = computed(() => selectedType.value === 'locale');

const { coalitions, loading: loadingCoalitions } = useElectoralCoalitions({
  year: selectedYear,
  type: selectedType,
  ranking: true,
  search: ref(''),
});

// Seules les élections présidentielles peuvent avoir 2 tours (rounds=2)
const isPresidential2Rounds = computed(
  () => currentElection.value?.type === 'presidential' && currentElection.value?.rounds === 2,
);

// La section second tour s'affiche uniquement si l'élection est présidentielle à 2 tours
// ET qu'au moins une coalition a des données de second tour renseignées
const isPresidentialWithRound2 = computed(
  () =>
    isPresidential2Rounds.value &&
    coalitions.value.some(
      (c) =>
        (c.round_2_voix != null && c.round_2_voix > 0) ||
        (c.round_2_pourcentage != null && c.round_2_pourcentage > 0),
    ),
);

// Disponibilité des données carte vérifiée en amont (même source que la carte) :
// le toggle Carte n'apparaît jamais si l'élection n'a aucun résultat cartographique.
const { data: mapResultRows } = useFetch<any[]>('/api/carte/result', {
  key: computed(() => `map-result-availability-${currentElection.value?.id ?? 'none'}`),
  query: computed(() => ({ election: currentElection.value?.id })),
  immediate: true,
  default: () => [],
});

const mapResultAvailable = computed(() => {
  if (!currentElection.value?.id) return false;
  const wantedLevel = isLocalElection.value ? 'commune' : 'departement';
  return (mapResultRows.value || []).some(
    (row) => row?.constituencie?.slug && row?.constituencie?.nationale_type === wantedLevel,
  );
});

const resultViewType = ref('list');
const resultDeptPanelOpen = ref(false);
const resultDeptPanelData = ref<any>(null);
const resultCommunesByDept = ref<TableResultItem[]>([]);
const mapResultHasNoData = ref(false);

const rankingPanelOpen = ref(false);
const rankingPanelConstituency = ref<{ slug: string; name: string } | null>(null);

const { getTableDataResult } = useElectionMapDataResult();

const loadLocaleResultsData = async () => {
  if (resultCommunesByDept.value.length > 0) return;
  const data = await getTableDataResult(selectedType.value, selectedYear.value);
  resultCommunesByDept.value = data;
};

watch(
  [resultViewType, isLocalElection],
  async ([view, isLocale]) => {
    if (view === 'map' && isLocale) await loadLocaleResultsData();
  },
  { immediate: true },
);

watch([selectedType, selectedYear], () => {
  resultCommunesByDept.value = [];
  resultDeptPanelOpen.value = false;
  resultDeptPanelData.value = null;
  rankingPanelOpen.value = false;
  rankingPanelConstituency.value = null;
  mapResultHasNoData.value = false;
});

// Quand la carte signale qu'elle n'a pas de données, on masque le toggle
// et on rebascule sur la liste : pas d'onglet Carte cassé pour l'utilisateur.
const handleMapResultError = () => {
  mapResultHasNoData.value = true;
  resultViewType.value = 'list';
};

watch(mapResultAvailable, (available) => {
  if (!available && resultViewType.value === 'map') resultViewType.value = 'list';
});

const handleResultDeptSelected = async (dept: any) => {
  resultDeptPanelData.value = dept;
  resultDeptPanelOpen.value = true;
};

const closeResultDeptPanel = () => {
  resultDeptPanelOpen.value = false;
  setTimeout(() => {
    resultDeptPanelData.value = null;
  }, 300);
};

const handleOpenRanking = (constituency: { slug: string; name: string }) => {
  rankingPanelConstituency.value = constituency;
  rankingPanelOpen.value = true;
};

const closeRankingPanel = () => {
  rankingPanelOpen.value = false;
  setTimeout(() => {
    rankingPanelConstituency.value = null;
  }, 300);
};

const localesTableRef = ref<{ hasData: boolean; loading: boolean } | null>(null);

// Détermine s'il y a des résultats à afficher pour l'onglet "Liste", pour savoir
// si le header "Résultats globaux" (+ toggle Liste/Carte) doit rester visible.
const hasListResults = computed(() => {
  if (selectedType.value === 'locale') {
    if (localesTableRef.value?.loading) return true;
    return !!localesTableRef.value?.hasData;
  }
  if (loadingCoalitions.value) return true;
  return !!(coalitions.value && coalitions.value.length > 0);
});

const resultCommunesForDept = computed(() => {
  if (!resultDeptPanelData.value) return [];
  if (resultDeptPanelData.value.communes?.length > 0) return resultDeptPanelData.value.communes;
  if (!resultCommunesByDept.value.length) return [];
  const deptKey = resultDeptPanelData.value.departement.trim().toLowerCase();
  return resultCommunesByDept.value.filter(
    (r) => r.departement && r.departement.trim().toLowerCase() === deptKey,
  );
});

useSeoMeta({
  title: () =>
    currentElection.value?.name
      ? `Résultats · ${currentElection.value.name} | Vie-Publique SN`
      : 'Résultats | Élections Sénégal',
  description: () =>
    currentElection.value?.name
      ? `Résultats officiels de ${currentElection.value.name} : classement des coalitions et carte des résultats.`
      : 'Résultats des élections au Sénégal.',
  ogTitle: () =>
    currentElection.value?.name
      ? `Résultats · ${currentElection.value.name}`
      : 'Résultats des Élections au Sénégal',
  ogDescription: () =>
    currentElection.value?.name
      ? `Résultats officiels de ${currentElection.value.name} : classement des coalitions et carte des résultats.`
      : 'Résultats des élections au Sénégal.',
});
</script>

<template>
  <div class="animate-in fade-in mx-auto max-w-7xl space-y-3 duration-700">
    <div v-if="hasListResults || (mapResultAvailable && !mapResultHasNoData)" class="flex items-center justify-between">
      <h2 v-if="hasListResults" class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
        Résultats globaux
      </h2>
      <div
        v-if="mapResultAvailable && !mapResultHasNoData"
        class="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800"
      >
        <UButton
          :color="resultViewType === 'list' ? 'white' : 'gray'"
          :variant="resultViewType === 'list' ? 'solid' : 'ghost'"
          size="xs"
          class="rounded-lg transition-all"
          icon="i-heroicons-table-cells"
          @click="resultViewType = 'list'"
        >
          <span class="hidden sm:inline">Liste</span>
        </UButton>
        <UButton
          :color="resultViewType === 'map' ? 'white' : 'gray'"
          :variant="resultViewType === 'map' ? 'solid' : 'ghost'"
          size="xs"
          class="rounded-lg transition-all"
          icon="i-heroicons-map"
          @click="resultViewType = 'map'"
        >
          <span class="hidden sm:inline">Carte</span>
        </UButton>
      </div>
    </div>

    <div class="min-h-[400px]">
      <div v-if="resultViewType === 'list'">
        <div v-if="selectedType === 'locale'">
          <ElectionsDashboardStatsElectionResultatsLocalesTable
            ref="localesTableRef"
            :election-type="selectedType"
            :election-year="selectedYear"
          />
        </div>
        <template v-else>
          <div v-if="loadingCoalitions" class="space-y-3">
            <USkeleton v-for="i in 6" :key="i" class="h-16 w-full rounded-xl" />
          </div>
          <div
            v-else-if="!coalitions || coalitions.length === 0"
            class="flex h-64 flex-col items-center justify-center px-4 text-center"
          >
            <UIcon
              name="i-heroicons-chart-bar"
              class="mb-4 h-12 w-12 text-gray-200 dark:text-gray-800 sm:h-16 sm:w-16"
            />
            <h3 class="text-base font-bold text-gray-400 sm:text-lg">Aucun résultat disponible</h3>
            <p class="text-xs text-gray-500 sm:text-sm">
              Les résultats ne sont pas encore publiés.
            </p>
          </div>
          <div v-else>
            <ElectionsDashboardResultChart
              v-if="['presidential', 'legislative'].includes(selectedType)"
              :results="coalitions"
              :type="selectedType"
              class="mb-6"
            />
            <ElectionsDashboardResultClassement
              :coalitions="coalitions"
              :loading="loadingCoalitions"
              :type="selectedType"
            />

            <!-- Section Second Tour (présidentielle uniquement) -->
            <div
              v-if="isPresidentialWithRound2"
              class="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800"
            >
              <ElectionsDashboardResultRound2
                :coalitions="coalitions"
                :loading="loadingCoalitions"
                :election-date-round2="currentElection?.election_date_round_2"
              />
            </div>
          </div>
        </template>
      </div>

      <div
        v-else-if="resultViewType === 'map'"
        class="h-full min-h-[400px] w-full sm:min-h-[500px]"
      >
        <!-- Loading state pendant le chargement de la config -->
        <div v-if="loadingConfig" class="flex flex-col items-center justify-center py-20">
          <div class="relative h-12 w-12">
            <div
              class="border-primary-100 dark:border-primary-900 absolute inset-0 rounded-full border-4"
            ></div>
            <div
              class="border-primary-600 absolute inset-0 animate-spin rounded-full border-4 border-t-transparent"
            ></div>
          </div>
          <p class="mt-3 animate-pulse text-sm font-medium text-gray-400">Chargement...</p>
        </div>
        <!-- Erreur si pas de données après chargement -->
        <div
          v-else-if="!currentElection?.id || mapResultHasNoData"
          class="flex flex-col items-center justify-center py-20 text-center"
        >
          <div class="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
            <UIcon name="i-heroicons-map" class="h-16 w-16 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 class="mb-2 text-lg font-bold text-gray-500 dark:text-gray-400">
            Carte des résultats non disponible
          </h3>
          <p class="max-w-md text-sm text-gray-400 dark:text-gray-500">
            Les données cartographiques des résultats pour cette élection ne sont pas encore
            disponibles.
          </p>
        </div>
        <ClientOnly v-else>
          <div class="relative min-h-[500px] w-full sm:min-h-[600px]">
            <ElectionUnifiedMap
              :key="`result-map-${selectedType}-${selectedYear}`"
              :mode="isLocalElection ? 'results-locale' : 'results'"
              :election-id="currentElection?.id"
              height="600px"
              @department-selected="handleResultDeptSelected"
              @open-ranking="handleOpenRanking"
              @map-error="handleMapResultError"
            />
          </div>
          <template #fallback>
            <div class="h-[500px] w-full" />
          </template>
        </ClientOnly>
      </div>
    </div>

    <ElectionMapResultDepartmentPanel
      :department="resultDeptPanelData"
      :is-open="resultDeptPanelOpen"
      :all-results="resultCommunesForDept"
      @close="closeResultDeptPanel"
    />

    <ElectionConstituencyRankingPanel
      :constituency="rankingPanelConstituency"
      :is-open="rankingPanelOpen"
      :election-id="currentElection?.id"
      @close="closeRankingPanel"
    />
  </div>
</template>
