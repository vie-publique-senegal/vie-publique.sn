<script setup lang="ts">
import { useElectoralCoalitions } from '~/composables/elections/dashboard/useElectoralCoalitions';
import { useElectoralConstituencies } from '~/composables/elections/dashboard/useElectoralConstituencies';
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useElectoralProfessions } from '~/composables/elections/dashboard/useElectoralProfessions';
import { useElectoralStatsList } from '~/composables/elections/dashboard/useElectoralStatsList';
import {
  useElectionMapDataResult,
  type TableResultItem,
} from '~/composables/useElectionMapJsonResult';

/**
 * Dashboard Électoral - Page Détail [Type]/[Année]
 */

// 1. Initialisation du Dashboard
const dashboard = useElectoralDashboard();
const {
  selectedYear,
  selectedType,
  activeTab,
  selectedConstituencyId,
  selectedCoalitionId,
  config,
  currentElection,
  currentElectionDocuments,
  loadingConfig,
  selectConstituency,
  clearConstituency,
  selectCoalition,
  clearCoalition,
  searchQuery,
  legislativeViewType,
} = dashboard;

const statsTypes = computed(() => {
  const types = [
    { label: 'Profession des candidats', value: 'professionCandidat' },
    { label: 'Présence des listes par département', value: 'departmental' },
    { label: 'Répartition par sexe', value: 'genderDistribution' },
    { label: 'Répartition par âge', value: 'ageDistribution' },
  ];
  // Données codées en dur des 165 députés élus — législatives 2024 uniquement
  if (selectedType.value === 'legislative' && Number(selectedYear.value) === 2024) {
    types.unshift({ label: 'Métiers des députés élus', value: 'professionDeputy' });
  }
  return types;
});

const route = useRoute();
const router = useRouter();
const statsType = ref<string>('professionCandidat');

watch(
  [() => route.params.type, () => route.params.year],
  ([type, year]) => {
    if (type && year) {
      const newType = type as string;
      const newYear = Number(year);

      // Only update and clear if the election context explicitly changes
      if (selectedType.value !== newType || selectedYear.value !== newYear) {
        // Force update even if already set (to override composable's default init)
        selectedType.value = newType;
        selectedYear.value = newYear;

        // Clear specific selections when changing election context
        clearConstituency();
        clearCoalition();
      }
    }
  },
  { immediate: true, flush: 'sync' },
); // flush: 'sync' ensures this runs before other watchers

// Default Tab Logic based on Election Status
watch(
  () => currentElection.value,
  (election) => {
    // Determine the tab based on query param OR default logic
    if (route.query.tab) {
      if (activeTab.value !== route.query.tab) {
        activeTab.value = route.query.tab as string;
      }
    } else if (election) {
      if (election.status === 'completed') {
        activeTab.value = 'resultats';
      } else {
        // For others: 'candidats', 'coalitions', 'circonscriptions' -> all mapped to 'candidats' tab ID in UI
        activeTab.value = 'candidats';
      }
    }
  },
  { immediate: true },
);
// --------------------------

// Sync statsType with query params
// Si l'option sélectionnée n'existe plus après changement d'élection, revenir au défaut
watch(statsTypes, (types) => {
  if (!types.some((t) => t.value === statsType.value)) {
    statsType.value = 'professionCandidat';
  }
});

if (import.meta.client) {
  if (route.query.stats_type) {
    const found = statsTypes.value.find((t) => t.value === route.query.stats_type);
    if (found) statsType.value = found.value;
  }

  // Mettre à jour l'URL uniquement quand on est sur l'onglet statistiques
  watch(statsType, (newType) => {
    if (activeTab.value === 'statistiques') {
      router.replace({ query: { ...route.query, stats_type: newType } });
    }
  });

  // Nettoyer stats_type de l'URL quand on quitte l'onglet statistiques
  // Nettoyer view de l'URL quand on quitte l'onglet resultats
  watch(activeTab, (newTab) => {
    const newQuery = { ...route.query };
    let shouldReplace = false;

    if (newTab !== 'statistiques' && route.query.stats_type) {
      delete newQuery.stats_type;
      shouldReplace = true;
    }
    if (newTab !== 'resultats' && route.query.view) {
      delete newQuery.view;
      shouldReplace = true;
    }

    if (shouldReplace) {
      router.replace({ query: newQuery });
    }
  });
}

// Fetch Stats Data
const {
  data: professions,
  pending: loadingProfessions,
  error: errorProfessions,
} = useElectoralProfessions({
  year: selectedYear,
  type: selectedType,
});

const {
  data: statsDepartmental,
  pending: loadingDepertmental,
  error: errorDepertmental,
} = useElectoralStatsList({
  year: selectedYear,
  type: selectedType,
});

// 2. Déterminer si c'est une élection locale
const isLocalElection = computed(() => selectedType.value === 'locale');

// 3. Fetch des circonscriptions pour les élections locales
const { constituencies, loading: loadingConstituencies } = useElectoralConstituencies({
  year: selectedYear,
  type: selectedType,
  search: searchQuery,
});

// 4. Fetch des coalitions (pour présidentielle et législatives)
const { coalitions, loading: loadingCoalitions } = useElectoralCoalitions({
  year: selectedYear,
  type: selectedType,
  ranking: true,
  search: searchQuery,
});

// 5. Récupérer le nom de la circonscription sélectionnée
const selectedConstituencyName = computed(() => {
  if (!selectedConstituencyId.value) return '';
  const constituency = constituencies.value.find((c) => c.id === selectedConstituencyId.value);
  return constituency?.name || '';
});

// 6. Configuration des Onglets (Architecture scalable)
// Note: Must match the filtering logic in ElectoralDashboardTabs.vue
const allTabs = [
  {
    id: 'candidats',
    icon: 'i-heroicons-user-group',
  },
  { id: 'carte', label: 'Carte', icon: 'i-heroicons-map' },
  { id: 'resultats', label: 'Résultats', icon: 'i-heroicons-chart-bar' },
  { id: 'documents', label: 'Documents', icon: 'i-heroicons-document-duplicate' },
  { id: 'statistiques', label: 'Stats', icon: 'i-heroicons-presentation-chart-line', hidden: true },
  { id: 'guide', label: 'Guide', icon: 'i-heroicons-play-circle' },
];

const tabs = computed(() => {
  const visibleTypes: Record<string, string[]> = {
    legislative: ['statistiques'],
  };

  return allTabs
    .filter((tab) => !tab.hidden || visibleTypes[selectedType.value ?? '']?.includes(tab.id))
    .map((tab) => ({
      ...tab,
      label:
        tab.id === 'candidats'
          ? selectedType.value === 'presidential'
            ? 'Candidats'
            : selectedType.value === 'locale'
              ? 'Circonscriptions'
              : 'Coalitions'
          : tab.label,
    }));
});

const currentTabIndex = computed({
  get: () => {
    const idx = tabs.value.findIndex((t) => t.id === activeTab.value);
    return idx === -1 ? 0 : idx;
  },
  set: (index) => {
    activeTab.value = tabs.value[index].id;
  },
});

// 4. SEO Dynamique avec le nom de l'élection
useSeoMeta({
  title: () =>
    currentElection.value?.name
      ? `${currentElection.value.name} - Dashboard | Vie-Publique SN`
      : `Dashboard Élections ${selectedYear.value} | Vie-Publique SN`,
  description: () =>
    currentElection.value?.name
      ? `Découvrez les candidats, coalitions, résultats et statistiques pour ${currentElection.value.name}.`
      : 'Découvrez les listes, candidats et statistiques des élections au Sénégal.',
  ogTitle: () => currentElection.value?.name || `Dashboard Élections ${selectedYear.value}`,
  ogDescription: () =>
    currentElection.value?.name
      ? `Tableau de bord complet pour ${currentElection.value.name} : candidats, coalitions, carte électorale et résultats.`
      : 'Découvrez les listes, candidats et statistiques des élections au Sénégal.',
});

useHead({
  meta: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
    },
  ],
});

// 5. Visibilité UI Mobile
const isViewingDetails = computed(
  () => !!selectedCoalitionId.value || !!selectedConstituencyId.value,
);

// 6. Vérifier si l'élection a des statistiques KPI à afficher
const hasElectionStats = computed(() => {
  const e = currentElection.value;
  if (!e) return false;
  return !!(
    e.registered_voters ||
    e.voters_count ||
    e.null_ballots ||
    e.valid_votes ||
    e.participation_rate ||
    (e.absolute_majority && e.type === 'presidential') ||
    (e.national_quotient && e.type === 'legislative')
  );
});

// --- MAP CONFIGURATION ---
const optionMap = 'Vue Carte';
const optionList = 'Vue Liste';
const selectedMapOption = ref(optionMap);
const resultViewType = ref('list');

const mapListOptions = [
  {
    label: optionMap,
    icon: 'i-heroicons-map-solid',
  },
  {
    label: optionList,
    icon: 'i-heroicons-list-bullet-solid',
  },
];

const mapTabs = [
  {
    label: 'Nationale',
    icon: 'i-heroicons-map',
    slot: 'nationale',
  },
  {
    label: 'Diaspora',
    icon: 'i-heroicons-globe-europe-africa',
    slot: 'diaspora',
  },
  {
    label: 'Résumé',
    icon: 'i-heroicons-chart-bar',
    slot: 'resume',
  },
];

// --- NAVIGATION HANDLERS ---
const navigateToElection = (type: string, year: number) => {
  const targetElection = config.value?.elections?.find(
    (e: any) => e.type === type && e.year === year,
  );

  // Custom rule requested: "tab 'resultats' si c'est une election terminee"
  // "tab 'candidats' si le status de l'election et autre que 'completed'"
  let targetTab = 'candidats'; // Default tab
  if (targetElection && targetElection.status === 'completed') {
    targetTab = 'resultats';
  } else {
    targetTab = 'candidats';
  }

  // Preserve existing query params except tab (which we override)
  const query: any = { ...route.query, tab: targetTab };

  // Clear selection-specific params when navigating to a new election
  delete query.coalition;
  delete query.constituency;
  delete query.q;

  router.push({
    path: `/elections-senegal/dashboard/${type}/${year}`,
    query,
  });
};

const onYearChange = (year: number) => {
  // Navigation only - State clearing handled by watcher
  navigateToElection(selectedType.value, year);
};

const onTypeChange = (type: string) => {
  let targetYear = selectedYear.value;

  // Navigation only - State clearing handled by watcher

  const electionsOfType = config.value?.elections?.filter((e: any) => e.type === type) || [];

  // Check if current selectedYear exists for the new type
  const exists = electionsOfType.some((e: any) => e.year === targetYear);

  if (!exists && electionsOfType.length > 0) {
    // Fallback logic specific rule:
    // "basculer le selecteur d'annee automatique vers la derniere election locale (avec status=completed)"

    // Try to find the latest COMPLETED election first
    const latestCompleted = electionsOfType
      .filter((e: any) => e.status === 'completed')
      .sort((a: any, b: any) => b.year - a.year)[0];

    if (latestCompleted) {
      targetYear = latestCompleted.year;
    } else {
      // Fallback to absolute latest if no completed one found (e.g. only scheduled)
      // Typically sort descending by year
      const latest = electionsOfType.sort((a: any, b: any) => b.year - a.year)[0];
      targetYear = latest.year;
    }
  }

  navigateToElection(type, targetYear);
};

const handleMapReady = (map: unknown) => {
  console.log('Carte chargée et prête');
};

// --- États pour gérer l'absence de données des cartes ---
const mapCarteHasNoData = ref(false);
const mapResultHasNoData = ref(false);

const handleMapCarteError = () => {
  mapCarteHasNoData.value = true;
};

const handleMapResultError = () => {
  mapResultHasNoData.value = true;
};

// --- RÉSULTAT LOCALE : Panel département ---
const resultDeptPanelOpen = ref(false);
const resultDeptPanelData = ref<any>(null);
const resultCommunesByDept = ref<TableResultItem[]>([]);

// Charger les résultats communes pour les élections locales (vue carte résultat)
const { getTableDataResult } = useElectionMapDataResult();

// Charger les données résultats quand on passe en vue carte résultats locale
const loadLocaleResultsData = async () => {
  if (resultCommunesByDept.value.length > 0) return; // déjà chargé
  const data = await getTableDataResult(selectedType.value, selectedYear.value);
  resultCommunesByDept.value = data;
};

// Auto-charger quand la vue résultat carte locale est affichée
watch(
  [activeTab, resultViewType, isLocalElection],
  async ([tab, view, isLocale]) => {
    if (tab === 'resultats' && view === 'map' && isLocale) {
      await loadLocaleResultsData();
    }
  },
  { immediate: true },
);

// Reset au changement d'élection
watch([selectedType, selectedYear], () => {
  resultCommunesByDept.value = [];
  resultDeptPanelOpen.value = false;
  resultDeptPanelData.value = null;
  // Reset des états d'absence de données
  mapCarteHasNoData.value = false;
  mapResultHasNoData.value = false;
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

// Communes filtrées pour le département sélectionné
// Utilise les données directement passées par le composant carte ou filtre depuis les données globales
const resultCommunesForDept = computed(() => {
  if (!resultDeptPanelData.value) return [];

  // Si le composant carte passe directement les communes
  if (resultDeptPanelData.value.communes?.length > 0) {
    return resultDeptPanelData.value.communes;
  }

  // Fallback: filtrer depuis les données globales
  if (!resultCommunesByDept.value.length) return [];
  const deptKey = resultDeptPanelData.value.departement.trim().toLowerCase();
  return resultCommunesByDept.value.filter(
    (r) => r.departement && r.departement.trim().toLowerCase() === deptKey,
  );
});
</script>

<template>
  <div class="min-h-screen pb-16 text-gray-900 transition-colors duration-300 dark:text-gray-100">
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
      <template #breadcrumb>
        <AppBreadcrumb
          v-if="currentElection"
          class="mb-3 text-xs"
          :items="[{ label: 'Élections', to: '/elections-senegal' }, { label: 'Dashboard' }]"
        />
      </template>
      <template #tabs>
        <ElectionsDashboardElectoralDashboardTabs
          v-model="currentTabIndex"
          :selected-type="selectedType"
        />
      </template>
    </ElectionsDashboardElectoralDashboardHeader>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
      <!-- State: Invalid Election (404-like) -->
      <div
        v-if="!loadingConfig && !currentElection"
        class="animate-in fade-in zoom-in-95 flex flex-col items-center justify-center py-32 text-center duration-500"
      >
        <div class="bg-primary-50 dark:bg-primary-900/10 mb-6 rounded-full p-6">
          <UIcon name="i-heroicons-face-frown" class="text-primary-500 h-20 w-20" />
        </div>
        <h1 class="mb-4 text-4xl font-black tracking-tight text-gray-900 dark:text-white">
          Oups ! Élection introuvable
        </h1>
        <p class="mx-auto mb-8 max-w-lg text-lg text-gray-500">
          Il semble qu'il n'y ait aucune élection
          <span class="font-bold text-gray-900 dark:text-white">{{ selectedType }}</span>
          enregistrée pour l'année
          <span class="font-bold text-gray-900 dark:text-white">{{ selectedYear }}</span
          >.
        </p>

        <div class="flex gap-4">
          <UButton
            to="/elections-senegal"
            size="xl"
            color="gray"
            variant="solid"
            icon="i-heroicons-arrow-left"
          >
            Retour aux élections
          </UButton>
        </div>
      </div>

      <div v-else>
        <!-- Section: Détails de l'élection -->
        <transition name="fade">
          <ElectionsDashboardElectoralDetailsCard
            v-if="
              currentElection &&
              !selectedCoalitionId &&
              !selectedConstituencyId &&
              (currentElection.status !== 'completed' || activeTab === 'candidats')
            "
            :election="currentElection"
            :coalitions="coalitions"
            :constituencies="constituencies"
            class="animate-in fade-in slide-in-from-top-4 mb-6 duration-700"
          />
        </transition>

        <!-- Section: Statistiques KPI de l'élection (visible si election terminée ET données disponibles) -->
        <transition name="fade">
          <ElectionsDashboardElectionStatsKPI
            v-if="
              currentElection?.status === 'completed' &&
              hasElectionStats &&
              !selectedCoalitionId &&
              !selectedConstituencyId &&
              activeTab === 'candidats'
            "
            :election="currentElection"
            class="animate-in fade-in slide-in-from-top-4 mb-8 duration-500"
          />
        </transition>

        <!-- State: Loading Configuration -->
        <div v-if="loadingConfig" class="flex flex-col items-center justify-center space-y-4 py-32">
          <div class="relative h-16 w-16">
            <div
              class="border-primary-200 dark:border-primary-900 absolute inset-0 rounded-full border-4"
            ></div>
            <div
              class="border-primary-600 absolute inset-0 animate-spin rounded-full border-4 border-t-transparent"
            ></div>
          </div>
          <p class="animate-pulse text-sm font-bold text-gray-400">
            Synchronisation des données...
          </p>
        </div>

        <div v-else class="mx-auto max-w-7xl">
          <!-- Dashboard Section: Candidats/Coalitions/Circonscriptions (Tab ID: candidats) -->
          <section v-if="activeTab === 'candidats'" class="space-y-8">
            <!-- NIVEAU 3: Detail Coalition (pour tous les types) -->
            <div v-if="selectedCoalitionId" class="animate-in fade-in zoom-in-95 duration-500">
              <ElectionsDashboardCoalitionDetails
                :coalition-id="selectedCoalitionId"
                :coalition-name="coalitions.find((c) => c.id === selectedCoalitionId)?.name"
                :year="selectedYear"
                :type="selectedType"
                :constituency-id="dashboard.selectedFilterConstituencyId.value"
                @close="clearCoalition"
              />
            </div>

            <!-- NIVEAU 2: Coalitions d'une circonscription (élections locales seulement) -->
            <div
              v-else-if="isLocalElection && selectedConstituencyId"
              class="animate-in fade-in zoom-in-95 duration-500"
            >
              <ElectionsDashboardConstituencyCoalitions
                :constituency-id="selectedConstituencyId"
                :constituency-name="selectedConstituencyName"
                :year="selectedYear"
                :type="selectedType"
                @close="clearConstituency"
                @select-coalition="
                  (payload: any) => {
                    if (typeof payload === 'object') {
                      selectCoalition(payload.coalitionId);
                      dashboard.selectedFilterConstituencyId.value = payload.constituencyId;
                    } else {
                      selectCoalition(payload);
                    }
                  }
                "
              />
            </div>

            <!-- NIVEAU 1: Grille principale -->
            <div v-else class="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
              <!-- Header avec titre, recherche et badge alignés -->
              <div class="flex flex-col gap-4">
                <!-- Ligne titre -->
                <div>
                  <h2 class="text-2xl font-black uppercase tracking-tighter sm:text-3xl">
                    {{
                      isLocalElection
                        ? 'Les Circonscriptions'
                        : selectedType === 'presidential'
                          ? 'Les Candidats'
                          : 'Les Coalitions'
                    }}
                  </h2>
                  <p class="text-sm text-gray-500">
                    {{
                      isLocalElection
                        ? 'Sélectionnez une circonscription pour voir les coalitions en lice.'
                        : selectedType === 'presidential'
                          ? 'Sélectionnez un candidat pour voir son programme et ses informations.'
                          : 'Sélectionnez une plateforme pour voir ses listes et candidats.'
                    }}
                  </p>
                </div>

                <!-- Ligne recherche + badge alignés -->
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <!-- Search Bar compact (hidden for presidential) -->
                  <div v-if="selectedType !== 'presidential'" class="max-w-md flex-1">
                    <UInput
                      v-model="searchQuery"
                      icon="i-heroicons-magnifying-glass"
                      :placeholder="
                        selectedType === 'locale' ? 'Rechercher...' : 'Rechercher une coalition...'
                      "
                      size="md"
                      class="transition-all duration-300"
                      :ui="{
                        rounded: 'rounded-xl',
                        wrapper: 'relative rounded-xl shadow-sm',
                        base: 'h-10 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-primary-500 text-sm px-4 transition-all ring-0 focus:ring-2 focus:ring-primary-500/20',
                        icon: {
                          leading: { wrapper: 'left-3' },
                          trailing: { pointer: 'pointer-events-auto' },
                        },
                      }"
                    >
                      <template v-if="searchQuery" #trailing>
                        <UButton
                          color="gray"
                          variant="ghost"
                          icon="i-heroicons-x-mark"
                          size="xs"
                          class="rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                          @click="searchQuery = ''"
                        />
                      </template>
                    </UInput>
                  </div>

                  <!-- Badge count -->
                  <UBadge
                    size="md"
                    color="white"
                    class="shrink-0 self-start border shadow-sm dark:border-gray-800 sm:self-center"
                  >
                    <span class="text-primary-600 mr-1 font-black">{{
                      isLocalElection ? constituencies.length : coalitions.length
                    }}</span>
                    {{
                      isLocalElection
                        ? 'circonscriptions'
                        : selectedType === 'presidential'
                          ? 'candidats'
                          : 'plateformes engagées'
                    }}
                  </UBadge>
                </div>
              </div>

              <!-- Legislative View Switcher -->
              <div
                v-if="selectedType === 'legislative'"
                class="mx-auto grid w-full grid-cols-3 items-center justify-center gap-1.5 rounded-2xl border bg-gray-100/50 p-1.5 dark:border-gray-700 dark:bg-gray-800/50 md:flex md:w-fit"
              >
                <UButton
                  v-for="view in [
                    { id: 'list', label: 'LISTE', icon: 'i-heroicons-list-bullet' },
                    { id: 'head', label: 'TÊTES DE LISTE', icon: 'i-heroicons-user' },
                    { id: 'ballot', label: 'BULLETINS', icon: 'i-heroicons-document-duplicate' },
                  ]"
                  :key="view.id"
                  :color="legislativeViewType === view.id ? 'primary' : 'gray'"
                  :variant="legislativeViewType === view.id ? 'solid' : 'ghost'"
                  size="xs"
                  class="flex justify-center rounded-xl px-2 py-2 text-[9px] font-bold uppercase tracking-widest transition-all duration-300 md:px-4 md:text-[10px]"
                  @click="legislativeViewType = view.id"
                >
                  <template #leading>
                    <UIcon :name="view.icon" class="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </template>
                  <span class="truncate">{{ view.label }}</span>
                </UButton>
              </div>

              <!-- ÉLECTIONS LOCALES: Grille des circonscriptions -->
              <template v-if="isLocalElection">
                <!-- Loading -->
                <ElectionsDashboardCoalitionGridLoadingState v-if="loadingConstituencies" />

                <!-- Grille circonscriptions -->
                <div
                  v-else-if="constituencies.length > 0"
                  class="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                >
                  <ElectionsDashboardCardsConstituencyCard
                    v-for="constituency in constituencies"
                    :key="constituency.id"
                    :constituency="constituency"
                    @select="selectConstituency"
                  />
                </div>

                <!-- Empty State -->
                <ElectionsDashboardEmptyStateCoalitions v-else />
              </template>

              <!-- ÉLECTIONS PRÉSIDENTIELLES & LÉGISLATIVES: Grille des coalitions -->
              <template v-else>
                <!-- Loading -->
                <ElectionsDashboardCoalitionGridLoadingState v-if="loadingCoalitions" />

                <!-- Grille PRÉSIDENTIELLE : Candidat en avant -->
                <div
                  v-else-if="coalitions.length > 0 && selectedType === 'presidential'"
                  class="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                >
                  <ElectionsDashboardCardsLegislativeCoalitionHeadCard
                    v-for="coalition in coalitions"
                    :key="coalition.id"
                    :coalition="coalition"
                    @select="selectCoalition"
                  />
                </div>

                <!-- Grille LÉGISLATIVES : Vues multiples -->
                <div
                  v-else-if="coalitions.length > 0"
                  :class="[
                    legislativeViewType === 'list'
                      ? 'grid grid-cols-1 gap-2 md:grid-cols-2'
                      : 'grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
                  ]"
                >
                  <template v-if="legislativeViewType === 'list'">
                    <ElectionsDashboardCardsLegislativeCoalitionListCard
                      v-for="coalition in coalitions"
                      :key="coalition.id"
                      :coalition="coalition"
                      @select="selectCoalition"
                    />
                  </template>

                  <template v-else-if="legislativeViewType === 'head'">
                    <ElectionsDashboardCardsLegislativeCoalitionHeadCard
                      v-for="coalition in coalitions"
                      :key="coalition.id"
                      :coalition="coalition"
                      @select="selectCoalition"
                    />
                  </template>

                  <template v-else-if="legislativeViewType === 'ballot'">
                    <ElectionsDashboardCardsLegislativeCoalitionBallotCard
                      v-for="coalition in coalitions"
                      :key="coalition.id"
                      :coalition="coalition"
                      @select="selectCoalition"
                    />
                  </template>
                </div>

                <!-- Empty State -->
                <ElectionsDashboardEmptyStateCoalitions v-else />
              </template>
            </div>
          </section>

          <!-- Dashboard Section: Carte (Tab ID: carte) -->
          <section v-else-if="activeTab === 'carte'" class="animate-in fade-in duration-700">
            <div class="overflow-hidden">
              <div
                class="flex items-center justify-between border-b bg-gray-50/50 p-6 dark:border-gray-800 dark:bg-gray-800/30"
              >
                <div>
                  <h2 class="text-2xl font-black uppercase tracking-tighter">Carte Électorale</h2>
                  <p class="text-sm text-gray-500">Visualisation géographique par département.</p>
                </div>
              </div>

              <div class="p-4">
                <!-- Empty state when no election data or no map data -->
                <div
                  v-if="!currentElection?.id || mapCarteHasNoData"
                  class="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div class="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
                    <UIcon
                      name="i-heroicons-map"
                      class="h-16 w-16 text-gray-300 dark:text-gray-600"
                    />
                  </div>
                  <h3 class="mb-2 text-lg font-bold text-gray-500 dark:text-gray-400">
                    Carte non disponible
                  </h3>
                  <p class="max-w-md text-sm text-gray-400 dark:text-gray-500">
                    Les données cartographiques pour cette élection ne sont pas encore disponibles.
                  </p>
                </div>
                <ClientOnly v-else>
                  <UTabs :items="mapTabs" class="w-full">
                    <!-- NATIONALE -->
                    <template #nationale>
                      <div class="w-full pt-4">
                        <!-- View Toggle -->
                        <div class="mb-4 flex w-full justify-center">
                          <div class="flex gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                            <UButton
                              v-for="option in mapListOptions"
                              :key="option.label"
                              :color="selectedMapOption === option.label ? 'white' : 'gray'"
                              :variant="selectedMapOption === option.label ? 'solid' : 'ghost'"
                              size="sm"
                              class="rounded-lg transition-all"
                              @click="selectedMapOption = option.label"
                            >
                              <UIcon :name="option.icon" class="mr-1 h-4 w-4" />
                              {{ option.label }}
                            </UButton>
                          </div>
                        </div>

                        <!-- CARTE -->
                        <div v-if="selectedMapOption == optionMap" class="relative min-h-[600px]">
                          <ElectionMapComponent4
                            :election-id="currentElection?.id"
                            :is-local-election="isLocalElection"
                            @map-ready="handleMapReady"
                            @map-error="handleMapCarteError"
                          />
                        </div>

                        <!-- LISTE -->
                        <div v-else-if="selectedMapOption == optionList" class="w-full">
                          <ElectionMapNationalDepartment :election-id="currentElection?.id" />
                        </div>
                      </div>
                    </template>

                    <!-- DIASPORA -->
                    <template #diaspora>
                      <div class="w-full pt-4">
                        <ElectionMapDiasporaCountries :election-id="currentElection?.id" />
                      </div>
                    </template>

                    <!-- Résumé -->
                    <template #resume>
                      <div class="w-full pt-4">
                        <ElectionMapSummary :election-id="currentElection?.id" />
                      </div>
                    </template>
                  </UTabs>
                  <template #fallback>
                    <div class="flex items-center justify-center py-16">
                      <div
                        class="border-t-primary-600 h-12 w-12 animate-spin rounded-full border-4 border-gray-300"
                      ></div>
                    </div>
                  </template>
                </ClientOnly>
              </div>
            </div>
          </section>

          <!-- Dashboard Section: Résultats (Tab ID: resultats) -->
          <section v-else-if="activeTab === 'resultats'" class="animate-in fade-in duration-700">
            <div class="space-y-3">
              <!-- Header + Toggle inline -->
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-black uppercase tracking-tighter sm:text-2xl">
                  Résultats Globaux
                </h2>

                <!-- VIEW TOGGLE -->
                <div class="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
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

              <!-- Content -->
              <div class="min-h-[400px]">
                <div v-if="resultViewType === 'list'">
                  <div v-if="selectedType === 'locale'">
                    <ElectionsDashboardStatsElectionResultatsLocalesTable
                      :election-type="selectedType"
                      :election-year="selectedYear"
                    />
                  </div>
                  <template v-else>
                    <!-- Loading state -->
                    <div v-if="loadingCoalitions" class="space-y-3">
                      <USkeleton v-for="i in 6" :key="i" class="h-16 w-full rounded-xl" />
                    </div>
                    <!-- Empty state -->
                    <div
                      v-else-if="!coalitions || coalitions.length === 0"
                      class="flex h-64 flex-col items-center justify-center px-4 text-center"
                    >
                      <UIcon
                        name="i-heroicons-chart-bar"
                        class="mb-4 h-12 w-12 text-gray-200 dark:text-gray-800 sm:h-16 sm:w-16"
                      />
                      <h3 class="text-base font-bold text-gray-400 sm:text-lg">
                        Aucun résultat disponible
                      </h3>
                      <p class="text-xs text-gray-500 sm:text-sm">
                        Les résultats ne sont pas encore publiés.
                      </p>
                    </div>
                    <div v-else>
                      <!-- GRAPHIQUE DES RÉSULTATS (Présidentielle & Législatives) -->
                      <ElectionsDashboardResultChart
                        v-if="['presidential', 'legislative'].includes(selectedType)"
                        :results="coalitions"
                        :type="selectedType"
                        class="mb-6"
                      />

                      <!-- Composant pour les résultats -->
                      <ElectionsDashboardResultClassement
                        :coalitions="coalitions"
                        :loading="loadingCoalitions"
                        :type="selectedType"
                      />
                    </div>
                  </template>
                </div>

                <div
                  v-else-if="resultViewType === 'map'"
                  class="h-full min-h-[400px] w-full sm:min-h-[500px]"
                >
                  <!-- Empty state when no election data or no result map data -->
                  <div
                    v-if="!currentElection?.id || mapResultHasNoData"
                    class="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div class="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
                      <UIcon
                        name="i-heroicons-map"
                        class="h-16 w-16 text-gray-300 dark:text-gray-600"
                      />
                    </div>
                    <h3 class="mb-2 text-lg font-bold text-gray-500 dark:text-gray-400">
                      Carte des résultats non disponible
                    </h3>
                    <p class="max-w-md text-sm text-gray-400 dark:text-gray-500">
                      Les données cartographiques des résultats pour cette élection ne sont pas
                      encore disponibles.
                    </p>
                  </div>
                  <ClientOnly v-else>
                    <!-- Élections locales : carte résultats par département -->
                    <template v-if="isLocalElection">
                      <ElectionMapComponentResultLocale
                        :key="`result-map-locale-${selectedYear}`"
                        :election-type="selectedType"
                        :election-year="selectedYear"
                        @map-ready="handleMapReady"
                        @department-selected="handleResultDeptSelected"
                        @map-error="handleMapResultError"
                      />
                    </template>
                    <!-- Autres types : carte résultats classique -->
                    <ElectionMapComponentResult
                      v-else
                      :election-type="selectedType"
                      :election-year="selectedYear"
                      @map-error="handleMapResultError"
                    />
                    <template #fallback>
                      <div class="flex h-[500px] w-full items-center justify-center">
                        <div
                          class="border-t-primary-600 h-10 w-10 animate-spin rounded-full border-4 border-gray-300"
                        ></div>
                      </div>
                    </template>
                  </ClientOnly>
                </div>
              </div>
            </div>
          </section>

          <!-- Dashboard Section: Statistiques (Tab ID: statistiques) -->
          <section v-else-if="activeTab === 'statistiques'" class="animate-in fade-in duration-700">
            <div class="space-y-6">
              <div
                class="sticky top-[132px] z-30 flex flex-col justify-between gap-4 border-b border-gray-200/50 bg-[#f8fafc]/90 py-4 backdrop-blur-md dark:border-gray-800/50 dark:bg-gray-950/90 md:flex-row md:items-center"
              >
                <div>
                  <h2 class="text-2xl font-black uppercase tracking-tighter">Statistiques</h2>
                  <p class="text-gray-500">Analyses démographiques et socioprofessionnelles.</p>
                </div>
                <USelect
                  v-model="statsType"
                  :options="statsTypes"
                  placeholder="Choisir une statistique"
                  class="w-full md:w-72"
                />
              </div>

              <div class="min-h-[400px] p-6">
                <!-- Loading States -->
                <div v-if="loadingProfessions" class="flex h-64 items-center justify-center">
                  <div class="flex flex-col items-center space-y-2">
                    <UIcon
                      name="i-heroicons-arrow-path"
                      class="text-primary-500 h-8 w-8 animate-spin"
                    />
                    <span class="text-sm text-gray-400">Chargement des données...</span>
                  </div>
                </div>

                <!-- Errors -->
                <UAlert v-else-if="errorProfessions" type="danger" title="Erreur de chargement">
                  {{ errorProfessions }}
                </UAlert>

                <!-- Content -->
                <div v-else>
                  <ElectionCandidatProfessionDeputies v-if="statsType == 'professionDeputy'" />

                  <ElectionCandidatProfessionChart
                    v-if="
                      statsType == 'professionCandidat' && professions && professions?.length > 0
                    "
                    :professions="professions"
                  />

                  <ElectionsDashboardStatsDepartmentalPresence
                    v-if="statsType == 'departmental'"
                    :stats-departmental="statsDepartmental || []"
                    :coalitions="coalitions"
                    :loading="loadingDepertmental"
                  />

                  <ElectionGenderDistributionChart v-if="statsType == 'genderDistribution'" />
                  <ElectionAgeDistributionChart v-if="statsType == 'ageDistribution'" />
                </div>
              </div>
            </div>
          </section>

          <!-- Dashboard Section: Guide de vote (Tab ID: guide) -->
          <section v-else-if="activeTab === 'guide'" class="animate-in fade-in duration-700">
            <ElectionsDashboardGuideElectoralVideos :type-election="selectedType" />
          </section>

          <!-- Dashboard Section: Documents (Tab ID: documents) -->
          <section v-else-if="activeTab === 'documents'" class="animate-in fade-in duration-700">
            <div class="space-y-4">
              <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 class="text-xl font-black uppercase tracking-tighter sm:text-2xl">
                    Documents Officiels
                  </h2>
                  <p class="text-sm text-gray-500">
                    Retrouvez les textes et documents liés à ce scrutin.
                  </p>
                </div>
                <UButton
                  to="/elections-senegal/legislation"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-arrow-top-right-on-square"
                  class="shrink-0 self-start sm:self-auto"
                >
                  Voir toute la législation
                </UButton>
              </div>

              <div class="min-h-[300px]">
                <!-- Documents rattachés à l'élection actuelle -->
                <ElectionsDashboardDocumentsTab
                  :documents="currentElectionDocuments"
                  :election-name="currentElection?.name"
                  :loading="loadingConfig"
                />
              </div>
            </div>
          </section>

          <!-- Placeholder for other tabs -->
          <section
            v-else
            class="rounded-3xl border-2 border-dashed border-gray-100 bg-white py-32 text-center dark:border-gray-800 dark:bg-gray-900"
          >
            <UIcon
              name="i-heroicons-puzzle-piece"
              class="text-primary-200 dark:text-primary-900 mx-auto mb-6 h-20 w-20 opacity-50"
            />
            <h3
              class="text-2xl font-black uppercase italic tracking-tighter text-gray-300 dark:text-gray-700"
            >
              Innovation en cours
            </h3>
            <p class="mx-auto mt-4 max-w-sm px-6 italic text-gray-400">
              Le module "{{ activeTab }}" est en phase finale d'intégration. Restez connectés pour
              les résultats détaillés.
            </p>
            <UButton class="mt-8 rounded-full px-8" variant="soft" @click="activeTab = 'candidats'"
              >Voir les candidats</UButton
            >
          </section>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="mt-20 border-t bg-white py-12 dark:border-gray-800 dark:bg-gray-950">
      <div class="container mx-auto px-4">
        <div class="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          <div>
            <h5 class="text-lg font-black uppercase italic text-gray-400">Plateforme Électorale</h5>
            <p class="mt-2 max-w-md text-xs text-gray-500">
              Source officielle des listes électorales validées par la Direction Générale des
              Élections (DGE) du Sénégal. Cette plateforme assure la transparence et l'accessibilité
              à l'information publique.
            </p>
          </div>
        </div>
      </div>
    </footer>
  </div>

  <!-- Panel résultats département (élections locales, vue carte résultat) -->
  <ElectionMapResultDepartmentPanel
    :department="resultDeptPanelData"
    :is-open="resultDeptPanelOpen"
    :all-results="resultCommunesForDept"
    @close="closeResultDeptPanel"
  />
</template>

<style>
.container {
  max-width: 1400px;
}

/* Animations transitions smooth */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
