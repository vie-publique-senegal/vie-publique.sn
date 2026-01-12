<script setup lang="ts">
import ElectionAgeDistributionChart from '../ElectionAgeDistributionChart.vue';
import ElectionCandidatProfessionChart from '../ElectionCandidatProfessionChart.vue';
import ElectionGenderDistributionChart from '../ElectionGenderDistributionChart.vue';
import ConstituencyCard from './cards/ConstituencyCard.vue';
import PresidentialCoalitionCard from './cards/PresidentialCoalitionCard.vue';
import CoalitionDetails from './CoalitionDetails.vue';
import ConstituencyCoalitions from './ConstituencyCoalitions.vue';
import DocumentsTab from './DocumentsTab.vue';
import ElectoralDashboardHeader from './ElectoralDashboardHeader.vue';
import ElectoralDashboardTabs from './ElectoralDashboardTabs.vue';
import ElectoralDetailsCard from './ElectoralDetailsCard.vue';
import EmptyStateCoalitions from './EmptyStateCoalitions.vue';
import GuideElectoralVideos from './GuideElectoralVideos.vue';
import ElectionResultatsLocalesTable from './stats/ElectionResultatsLocalesTable.vue';
import ElectionResultatsStats from './stats/ElectionResultatsStats.vue';

/**
 * ElectoralDashboardView - Composant maÃ®tre pour le rendu du dashboard Ã©lectoral.
 * Ce composant est conÃ§u pour Ãªtre utilisÃ© dans une page dynamique du projet hÃ´te.
 */

const props = defineProps<{
  type?: string
  year?: number | string
}>()

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
  searchQuery,
  legislativeViewType
} = dashboard;

const statsTypes = [
  { label: "Profession des candidats", value: "professionCandidat" },
  { label: "RÃ©partition par sexe", value: "genderDistribution" },
  { label: "RÃ©partition par Ã¢ge", value: "ageDistribution" },
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

// Logique d'onglet par dÃ©faut
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

const { constituencies, loading: loadingConstituencies } = useElectoralConstituencies({
  year: selectedYear,
  type: selectedType,
  search: searchQuery
});

const { coalitions, loading: loadingCoalitions } = useElectoralCoalitions({
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
    label: selectedType.value === 'presidential' ? 'Candidats' : (selectedType.value === 'locale' ? 'Circonscriptions' : 'Coalitions'),
    icon: "i-heroicons-user-group"
  },
  { id: "carte", label: "Carte", icon: "i-heroicons-map" },
  { id: "resultats", label: "RÃ©sultats", icon: "i-heroicons-chart-bar" },
  { id: "documents", label: "Documents", icon: "i-heroicons-document-duplicate" },
  { id: "statistiques", label: "Stats", icon: "i-heroicons-presentation-chart-line" },
  { id: "guide", label: "Guide", icon: "i-heroicons-play-circle" },
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
  { label: "RÃ©sumÃ©", icon: "i-heroicons-chart-bar" },
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
    <ElectoralDashboardHeader
      :selected-year="selectedYear"
      :selected-type="selectedType"
      :config="config"
      :hide-tabs-mobile="isViewingDetails"
      @update:year="onYearChange"
      @update:type="onTypeChange"
      @clear-coalition="clearConstituency"
    >
      <template #tabs>
        <ElectoralDashboardTabs
          v-model="currentTabIndex"
          :selected-type="selectedType"
        />
      </template>
    </ElectoralDashboardHeader>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
      <!-- State: Invalid Election -->
      <div v-if="!loadingConfig && !currentElection" class="flex flex-col items-center justify-center py-32 text-center">
           <div class="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-full mb-6">
              <UIcon name="i-heroicons-face-frown" class="h-20 w-20 text-primary-500" />
           </div>
           <h1 class="text-4xl font-black mb-4 tracking-tight">Oups ! Ã‰lection introuvable</h1>
           <p class="text-gray-500 text-lg max-w-lg mx-auto mb-8">
             Aucune Ã©lection <span class="font-bold">{{ selectedType }}</span> enregistrÃ©e pour l'annÃ©e <span class="font-bold">{{ selectedYear }}</span>.
           </p>
      </div>

      <div v-else>
      <!-- Breadcrumb / Back Navigation -->
      <nav v-if="!isViewingDetails" class="mb-8">
        <NuxtLink to="/elections-senegal" class="flex items-center text-sm font-bold text-gray-500 hover:text-primary-600">
          <UIcon name="i-heroicons-arrow-left" class="mr-2" />
          Accueil Ã‰lections
        </NuxtLink>
      </nav>

      <!-- Details Card -->
      <transition name="fade">
        <ElectoralDetailsCard
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
          <p class="text-sm font-bold text-gray-400">Synchronisation des donnÃ©es...</p>
      </div>

      <div v-else class="max-w-7xl mx-auto">
        <!-- Candidats/Coalitions -->
        <section v-if="activeTab === 'candidats'" class="space-y-8">
          <div v-if="selectedCoalitionId">
            <CoalitionDetails
              :coalition-id="selectedCoalitionId"
              :coalition-name="coalitions.find(c => String(c.id) === String(selectedCoalitionId))?.name"
              :year="Number(selectedYear)"
              :type="selectedType"
              :constituency-id="dashboard.selectedFilterConstituencyId.value"
              @close="clearCoalition"
            />
          </div>

          <div v-else-if="isLocalElection && selectedConstituencyId">
            <ConstituencyCoalitions
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
                :placeholder="isLocalElection ? 'Rechercher un dÃ©partement...' : 'Rechercher...'"
                size="xl"
                class="rounded-2xl shadow-xl"
              />
            </div>

            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <h2 class="text-3xl font-black uppercase tracking-tighter">
                {{ isLocalElection ? 'Circonscriptions' : 'Coalitions' }}
              </h2>
              <UBadge size="lg" color="white" class="border">
                <span class="text-primary-600 font-black mr-1">{{ isLocalElection ? constituencies.length : coalitions.length }}</span> engagÃ©es
              </UBadge>
            </div>

            <!-- Grids -->
            <template v-if="isLocalElection">
               <div v-if="constituencies.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ConstituencyCard
                  v-for="c in constituencies"
                  :key="c.id"
                  :constituency="c"
                  @select="selectConstituency"
                />
              </div>
              <EmptyStateCoalitions v-else />
            </template>

            <template v-else>
               <div v-if="coalitions.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <PresidentialCoalitionCard
                  v-for="c in coalitions"
                  :key="c.id"
                  :coalition="c"
                  @select="selectCoalition"
                />
              </div>
              <EmptyStateCoalitions v-else />
            </template>
          </div>
        </section>

        <!-- Carte -->
        <section v-else-if="activeTab === 'carte'">
             <div class="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border shadow-xl">
                <div class="p-6 border-b flex items-center justify-between">
                    <h2 class="text-2xl font-black uppercase">Carte Ã‰lectorale</h2>
                </div>
                <div class="p-4">
                  <UTabs :items="mapTabs">
                    <template #item="{ item }">
                      <div v-if="item.label === 'RÃ©sumÃ©'" class="pt-4"><ElectionMapSummary /></div>
                      <div v-if="item.label === 'Nationale'" class="pt-4">
                        <div v-if="selectedMapOption == optionMap"><ElectionMapComponent4 /></div>
                        <div v-else><ElectionMapNationalDepartment /></div>
                      </div>
                      <div v-if="item.label === 'Diaspora'" class="pt-4"><ElectionMapDiasporaCountries /></div>
                    </template>
                  </UTabs>
                </div>
             </div>
        </section>

        <!-- RÃ©sultats -->
        <section v-else-if="activeTab === 'resultats'">
            <div class="space-y-6">
                <h2 class="text-2xl font-black uppercase">RÃ©sultats Globaux</h2>
                <div class="bg-white dark:bg-gray-900 rounded-xl p-6 border shadow-sm">
                    <div v-if="selectedType === 'locale'">
                        <ElectionResultatsLocalesTable :election-type="selectedType" :election-year="Number(selectedYear)" />
                    </div>
                    <ElectionResultatsStats v-else :coalitions="coalitions" :type="selectedType" />
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
                    <ElectionCandidatProfessionChart v-if="statsType == 'professionCandidat' && professions?.length" :professions="professions" />
                    <ElectionGenderDistributionChart v-if="statsType == 'genderDistribution'" />
                    <ElectionAgeDistributionChart v-if="statsType == 'ageDistribution'" />
                </div>
            </div>
        </section>

        <!-- Guide -->
        <section v-else-if="activeTab === 'guide'">
          <GuideElectoralVideos :type-election="selectedType" />
        </section>

        <!-- Documents -->
        <section v-else-if="activeTab === 'documents'">
            <div class="space-y-6">
                <h2 class="text-2xl font-black uppercase">Documents Officiels</h2>
                <div class="bg-white dark:bg-gray-900 rounded-3xl p-8 border shadow-sm">
                    <DocumentsTab v-if="currentElection" :election-id="currentElection.id" :election-name="currentElection.name" />
                </div>
            </div>
        </section>
      </div>
      </div>
    </main>
  </div>
</template>

