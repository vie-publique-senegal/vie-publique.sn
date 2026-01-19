<script setup lang="ts">
import { useElectoralCoalitions } from '../../../composables/elections/dashboard/useElectoralCoalitions';
import { useElectoralConstituencies } from '../../../composables/elections/dashboard/useElectoralConstituencies';
import { useElectoralDashboard } from '../../../composables/elections/dashboard/useElectoralDashboard';
import { useElectoralProfessions } from '../../../composables/elections/dashboard/useElectoralProfessions';
import { useElectoralStatsList } from '../../../composables/elections/dashboard/useElectoralStatsList';
import { useElectionsConfig } from '../../../composables/useElectionsConfig';

/**
 * ElectoralDashboardView - Composant maÃ®tre pour le rendu du dashboard électoral.
 * Ce composant est conÃ§u pour Ãªtre utilisé dans une page dynamique du projet hÃ´te.
 */

const props = defineProps<{
  type?: string
  year?: number | string
}>()

// Configuration dynamique
const electionsConfig = useElectionsConfig();

// 1. Initialisation du Dashboard via le composable du layer
const dashboard = useElectoralDashboard();
const {
  selectedYear,
  selectedType,
  activeTab,
  selectedConstituencyId,
  selectedCoalitionId,
  config,
  currentElection,
  loadingConfig,
  selectConstituency,
  clearConstituency,
  selectCoalition,
  clearCoalition,
  searchQuery
} = dashboard;

const statsTypes = [
  { label: "Profession des candidats", value: "professionCandidat" },
  { label: "Répartition par sexe", value: "genderDistribution" },
  { label: "Répartition par Ã¢ge", value: "ageDistribution" },
];

const route = useRoute();
const router = useRouter();
const statsType = ref<string>("professionCandidat");

// Synchronisation avec les props (provenant de la page dynamique)
watch([() => props.type, () => props.year], ([type, year]) => {
    if (type && year) {
        const newType = type as string;
        const newYear = Number(year);

        if (selectedType.value !== newType || selectedYear.value !== newYear) {
            selectedType.value = newType;
            selectedYear.value = newYear;

            clearConstituency();
            clearCoalition();
        }
    }
}, { immediate: true, flush: 'sync' });

// Logique d'onglet par défaut
watch(() => currentElection.value, (election) => {
    if (route.query.tab) {
        if (activeTab.value !== route.query.tab) {
            activeTab.value = route.query.tab as string;
        }
    } else if (election) {
         if (election.status === 'completed') {
             activeTab.value = 'resultats';
         } else {
             activeTab.value = 'candidats';
         }
    }
}, { immediate: true });

// Sync stats avec query params
if (process.client) {
    if (route.query.stats_type) {
        const found = statsTypes.find(t => t.value === route.query.stats_type);
        if (found) statsType.value = found.value;
    }
    watch(statsType, (newType) => {
        router.replace({ query: { ...route.query, stats_type: newType } });
    });
}

// Fetch Stats
const { data: professions, pending: loadingProfessions, error: errorProfessions } = useElectoralProfessions({
    year: selectedYear,
    type: selectedType
});

const { data: statsDepartmental, pending: loadingDepertmental, error: errorDepertmental } = useElectoralStatsList({
    year: selectedYear,
    type: selectedType
});

const isLocalElection = computed(() => selectedType.value === 'locale');

const { constituencies } = useElectoralConstituencies({
  year: selectedYear,
  type: selectedType,
  search: searchQuery
});

const { coalitions } = useElectoralCoalitions({
  year: selectedYear,
  type: selectedType,
  ranking: true,
  search: searchQuery
});

const selectedConstituencyName = computed(() => {
  if (!selectedConstituencyId.value) return '';
  const constituency = constituencies.value.find(c => c.id === selectedConstituencyId.value);
  return constituency?.name || '';
});

const tabs = computed(() => [
  {
    id: "candidats",
    label: selectedType.value === 'presidential'
      ? electionsConfig.getLabel('candidates')
      : (selectedType.value === 'locale'
        ? electionsConfig.getLabel('constituencies')
        : electionsConfig.getLabel('coalitions')),
    icon: "i-heroicons-user-group"
  },
  { id: "carte", label: electionsConfig.ui.mapTab || "Carte", icon: "i-heroicons-map" },
  { id: "resultats", label: electionsConfig.ui.resultsTab || "Résultats", icon: "i-heroicons-chart-bar" },
  { id: "documents", label: electionsConfig.ui.documentsTab || "Documents", icon: "i-heroicons-document-duplicate" },
  { id: "statistiques", label: electionsConfig.ui.statsTab || "Stats", icon: "i-heroicons-presentation-chart-line" },
  { id: "guide", label: electionsConfig.ui.guideTab || "Guide", icon: "i-heroicons-play-circle" },
]);

const currentTabIndex = computed({
  get: () => {
    const idx = tabs.value.findIndex((t) => t.id === activeTab.value);
    return idx === -1 ? 0 : idx;
  },
  set: (index) => {
    activeTab.value = tabs.value[index].id;
  },
});

const isViewingDetails = computed(() => !!selectedCoalitionId.value || !!selectedConstituencyId.value);

// MAP CONFIG
const optionMap = "Vue Carte";
const optionList = "Vue Liste";
const selectedMapOption = ref(optionMap);
const resultViewType = ref('list');

const mapListOptions = [
  { label: optionMap, icon: "i-heroicons-map-solid" },
  { label: optionList, icon: "i-heroicons-list-bullet-solid" },
];

const mapTabs = [
  { label: "Nationale", icon: "i-heroicons-map" },
  { label: "Diaspora", icon: "i-heroicons-globe-europe-africa" },
  { label: "Résumé", icon: "i-heroicons-chart-bar" },
];

const navigateToElection = (type: string, year: number) => {
   const targetElection = config.value?.elections?.find((e: any) => e.type === type && e.year === year);
   let targetTab = targetElection?.status === 'completed' ? 'resultats' : 'candidats';

   const appConfig = useAppConfig();
   const dashboardBaseUrl = appConfig.vpsnElections?.links?.dashboard || '/elections/dashboard';

   router.push({
       path: `${dashboardBaseUrl}/${type}/${year}`,
       query: { ...route.query, tab: targetTab }
   });
};

const onYearChange = (year: number) => navigateToElection(selectedType.value, year);
const onTypeChange = (type: string) => {
    let targetYear = selectedYear.value;
    const electionsOfType = config.value?.elections?.filter((e: any) => e.type === type) || [];
    const exists = electionsOfType.some((e: any) => e.year === targetYear);

    if (!exists && electionsOfType.length > 0) {
        const latestCompleted = electionsOfType.filter((e: any) => e.status === 'completed').sort((a: any, b: any) => b.year - a.year)[0];
        targetYear = latestCompleted ? latestCompleted.year : electionsOfType.sort((a: any, b: any) => b.year - a.year)[0].year;
    }
    navigateToElection(type, targetYear);
};

</script>

<template>
  <div class="min-h-screen bg-[#f8fafc] dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
    <!-- Header & Navigation Sticky -->
    <ElectionsDashboardElectoralDashboardHeader
      :selected-year="selectedYear"
      :selected-type="selectedType"
      :config="config"
      :hide-tabs-mobile="isViewingDetails"
      @update:year="onYearChange"
      @update:type="onTypeChange"
      @clear-coalition="clearConstituency"
    >
      <template #tabs>
        <ElectionsDashboardElectoralDashboardTabs
          v-model="currentTabIndex"
          :selected-type="selectedType"
        />
      </template>
    </ElectionsDashboardElectoralDashboardHeader>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
      <!-- State: Invalid Election -->
      <div v-if="!loadingConfig && !currentElection" class="flex flex-col items-center justify-center py-32 text-center">
           <div class="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-full mb-6">
              <UIcon name="i-heroicons-face-frown" class="h-20 w-20 text-primary-500" />
           </div>
           <h1 class="text-4xl font-black mb-4 tracking-tight">Oups ! Élection introuvable</h1>
           <p class="text-gray-500 text-lg max-w-lg mx-auto mb-8">
             Aucune élection <span class="font-bold">{{ selectedType }}</span> enregistrée pour l'année <span class="font-bold">{{ selectedYear }}</span>.
           </p>
      </div>

      <div v-else>
      <!-- Breadcrumb / Back Navigation -->
      <nav v-if="!isViewingDetails" class="mb-8">
        <NuxtLink :to="electionsConfig.config.links?.home || '/elections-senegal'" class="flex items-center text-sm font-bold text-gray-500 hover:text-primary-600">
          <UIcon name="i-heroicons-arrow-left" class="mr-2" />
          {{ electionsConfig.ui.backToHome }}
        </NuxtLink>
      </nav>

      <!-- Details Card -->
      <transition name="fade">
        <ElectionsDashboardElectoralDetailsCard
          v-if="currentElection && !selectedCoalitionId && !selectedConstituencyId && (currentElection.status !== 'completed' || activeTab === 'candidats')"
          :election="currentElection"
          :coalitions="coalitions"
          :constituencies="constituencies"
          class="mb-10"
        />
      </transition>

      <!-- Loading State -->
      <div v-if="loadingConfig" class="flex flex-col items-center justify-center py-32">
          <UIcon name="i-heroicons-arrow-path" class="h-10 w-10 animate-spin text-primary-600 mb-4" />
          <p class="text-sm font-bold text-gray-400">Synchronisation des données...</p>
      </div>

      <div v-else class="max-w-7xl mx-auto">
        <!-- Candidats/Coalitions -->
        <section v-if="activeTab === 'candidats'" class="space-y-8">
          <div v-if="selectedCoalitionId">
            <ElectionsDashboardCoalitionDetails
              :coalition-id="selectedCoalitionId"
              :coalition-name="coalitions.find(c => String(c.id) === String(selectedCoalitionId))?.name"
              :year="Number(selectedYear)"
              :type="selectedType"
              :constituency-id="dashboard.selectedFilterConstituencyId.value"
              @close="clearCoalition"
            />
          </div>

          <div v-else-if="isLocalElection && selectedConstituencyId">
            <ElectionsDashboardConstituencyCoalitions
              :constituency-id="selectedConstituencyId"
              :constituency-name="selectedConstituencyName"
              :year="Number(selectedYear)"
              :type="selectedType"
              @close="clearConstituency"
              @select-coalition="(payload) => selectCoalition(typeof payload === 'object' ? payload.coalitionId : payload)"
            />
          </div>

          <div v-else class="space-y-8">
            <!-- Search -->
            <div class="max-w-3xl mx-auto w-full mb-12">
              <UInput
                v-model="searchQuery"
                icon="i-heroicons-magnifying-glass"
                :placeholder="isLocalElection ? electionsConfig.ui?.searchConstituencyPlaceholder : electionsConfig.ui?.searchPlaceholder"
                size="xl"
                class="rounded-2xl shadow-xl"
              />
            </div>

            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <h2 class="text-3xl font-black uppercase tracking-tighter">
                {{ isLocalElection ? electionsConfig.getLabel('constituencies') : electionsConfig.getLabel('coalitions') }}
              </h2>
              <UBadge size="lg" color="white" class="border">
                <span class="text-primary-600 font-black mr-1">{{ isLocalElection ? constituencies.length : coalitions.length }}</span> {{ electionsConfig.ui?.engaged }}
              </UBadge>
            </div>

            <!-- Grids -->
            <template v-if="isLocalElection">
               <div v-if="constituencies.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ElectionsDashboardCardsConstituencyCard
                  v-for="c in constituencies"
                  :key="c.id"
                  :constituency="c"
                  @select="selectConstituency"
                />
              </div>
              <ElectionsDashboardEmptyStateCoalitions v-else />
            </template>

            <template v-else>
               <div v-if="coalitions.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ElectionsDashboardCardsPresidentialCoalitionCard
                  v-for="c in coalitions"
                  :key="c.id"
                  :coalition="c"
                  @select="selectCoalition"
                />
              </div>
              <ElectionsDashboardEmptyStateCoalitions v-else />
            </template>
          </div>
        </section>

        <!-- Carte -->
        <section v-else-if="activeTab === 'carte'">
             <div class="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border shadow-xl">
                <div class="p-6 border-b flex items-center justify-between">
                    <h2 class="text-2xl font-black uppercase">Carte Électorale</h2>
                </div>
                <div class="p-4">
                  <UTabs :items="mapTabs">
                    <template #item="{ item }">
                      <div v-if="item.label === 'Résumé'" class="pt-4"><ElectionsElectionMapSummary /></div>
                      <div v-if="item.label === 'Nationale'" class="pt-4">
                        <div v-if="selectedMapOption == optionMap"><ElectionsElectionMapComponent4 /></div>
                        <div v-else><ElectionsElectionMapNationalDepartment /></div>
                      </div>
                      <div v-if="item.label === 'Diaspora'" class="pt-4"><ElectionsElectionMapDiasporaCountries /></div>
                    </template>
                  </UTabs>
                </div>
             </div>
        </section>

        <!-- Résultats -->
        <section v-else-if="activeTab === 'resultats'">
            <div class="space-y-6">
                <h2 class="text-2xl font-black uppercase">Résultats Globaux</h2>
                <div class="bg-white dark:bg-gray-900 rounded-xl p-6 border shadow-sm">
                    <div v-if="selectedType === 'locale'">
                        <ElectionsDashboardStatsElectionResultatsLocalesTable :election-type="selectedType" :election-year="Number(selectedYear)" />
                    </div>
                    <ElectionsDashboardStatsElectionResultatsStats v-else :coalitions="coalitions" :type="selectedType" />
                </div>
            </div>
        </section>

        <!-- Stats -->
        <section v-else-if="activeTab === 'statistiques'">
            <div class="space-y-6">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 class="text-2xl font-black uppercase">Statistiques</h2>
                    <USelect v-model="statsType" :options="statsTypes" class="w-full md:w-72" />
                </div>
                <div class="bg-white dark:bg-gray-900 rounded-xl p-6 border shadow-sm">
                    <ElectionsCandidatProfessionChart v-if="statsType == 'professionCandidat' && professions?.length" :professions="professions" />
                    <ElectionsGenderDistributionChart v-if="statsType == 'genderDistribution'" />
                    <ElectionsAgeDistributionChart v-if="statsType == 'ageDistribution'" />
                </div>
            </div>
        </section>

        <!-- Guide -->
        <section v-else-if="activeTab === 'guide'">
          <ElectionsDashboardGuideElectoralVideos :type-election="selectedType" />
        </section>

        <!-- Documents -->
        <section v-else-if="activeTab === 'documents'">
            <div class="space-y-6">
                <h2 class="text-2xl font-black uppercase">Documents Officiels</h2>
                <div class="bg-white dark:bg-gray-900 rounded-3xl p-8 border shadow-sm">
                    <ElectionsDashboardDocumentsTab v-if="currentElection" :election-id="currentElection.id" :election-name="currentElection.name" />
                </div>
            </div>
        </section>
      </div>
      </div>
    </main>
  </div>
</template>

