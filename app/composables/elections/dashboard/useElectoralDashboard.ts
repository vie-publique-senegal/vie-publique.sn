export interface ElectionConfig {
  years: { label: string; value: number }[];
  types: { label: string; value: string }[];
  elections: any[];
  election_ids_with_documents: number[];
}

export const useElectoralDashboard = () => {
  const selectedYear = useState<number>('election-selected-year');
  const selectedType = useState<string>('election-selected-type');
  const activeTab = useState<string>('election-active-tab', () => 'candidats');
  const selectedConstituencyId = useState<number | null>('election-selected-constituency-id', () => null);
  const selectedCoalitionId = useState<number | null>('election-selected-coalition-id', () => null);
  const selectedFilterConstituencyId = useState<number | null>('election-selected-filter-constituency-id', () => null);
  const searchQuery = useState<string>('election-search-query', () => '');
  const legislativeViewType = useState<string>('election-legislative-view-type', () => 'list');

  const { data: config, pending: loadingConfig, error: configError } = useFetch<ElectionConfig>('/api/elections/dashboard/config', {
      key: 'election-dashboard-config',
      server: true
  });

  // Initialiser avec la dernière élection "completed" par défaut SEULEMENT si pas déjà défini
  watch(config, (newConfig) => {
    if (newConfig && newConfig.elections && newConfig.elections.length > 0) {
      // Si pas encore de sélection, prendre la dernière élection "completed"
      if (!selectedYear.value || !selectedType.value) {
        const completedElections = newConfig.elections.filter(e => e.status === 'completed');
        const defaultElection = completedElections.length > 0
          ? completedElections[0] // Déjà trié par année desc dans config.get.ts
          : newConfig.elections[0];

        if (defaultElection) {
          selectedYear.value = defaultElection.year;
          selectedType.value = defaultElection.type;
        }
      }
    }
  }, { immediate: true });

  const selectConstituency = (id: number) => {
    selectedConstituencyId.value = id;
    // Clear search when selecting a constituency
    searchQuery.value = '';
  };

  const clearConstituency = () => {
    selectedConstituencyId.value = null;
    selectedCoalitionId.value = null;
    selectedFilterConstituencyId.value = null;
  };

  const selectCoalition = (id: number) => {
    selectedCoalitionId.value = id;
    // Clear search when selecting a coalition
    searchQuery.value = '';
  };

  const clearCoalition = () => {
    selectedCoalitionId.value = null;
  };

  const currentElection = computed(() => {
    if (!config.value?.elections) return null;
    return config.value.elections.find(e => e.year === selectedYear.value && e.type === selectedType.value) || null;
  });

  // Documents de l'élection actuelle
  const currentElectionDocuments = computed(() => {
    return currentElection.value?.documents || [];
  });

  // Sync avec les query params (uniquement sur la page dashboard)
  if (process.client) {
    const route = useRoute();
    const router = useRouter();
    const isDashboardPage = computed(() => route.path.includes('/elections-senegal/dashboard'));
    const isCandidateProfilePage = computed(() => /^\/elections-senegal\/dashboard\/[^/]+\/[^/]+\/candidats\/[^/]+$/.test(route.path));
    // Flag pour éviter les boucles de synchronisation route <-> state
    let isSyncingFromRoute = false;

    const getRouteTab = () => {
      const routeTab = route.params.tab;
      if (typeof routeTab === 'string' && routeTab) return routeTab;
      if (route.query.tab) return String(route.query.tab);
      return null;
    };

    // Initialiser depuis l'URL si on est sur le dashboard
    // Note: year and type are in the route path, not query params
    const syncFromRoute = () => {
      if (!isDashboardPage.value) return;

      isSyncingFromRoute = true;

      if (isCandidateProfilePage.value) {
        activeTab.value = 'candidats';
      }

      const currentTab = getRouteTab();
      if (currentTab) activeTab.value = currentTab;

      if (route.query.coalition) {
        const coalitionId = parseInt(route.query.coalition as string);
        selectedCoalitionId.value = Number.isNaN(coalitionId) ? null : coalitionId;
      } else {
        selectedCoalitionId.value = null;
      }

      if (route.query.constituency) {
        const constituencyId = parseInt(route.query.constituency as string);
        selectedConstituencyId.value = Number.isNaN(constituencyId) ? null : constituencyId;
      } else {
        selectedConstituencyId.value = null;
      }

      searchQuery.value = route.query.q ? String(route.query.q) : '';

      if (route.query.view) {
        legislativeViewType.value = String(route.query.view);
      }

      // Reset flag après le prochain tick pour permettre aux watchers de s'ignorer
      nextTick(() => {
        isSyncingFromRoute = false;
      });
    };

    watch(() => route.fullPath, syncFromRoute, { immediate: true });

    const buildDashboardQuery = (tab: string, search: string, coal: number | null, consti: number | null, view: string) => {
      const currentQuery = route.query;
      const query: any = { ...currentQuery };
      const isCandidatesTab = tab === 'candidats';
      const isStatistiquesTab = tab === 'statistiques';

      // Legacy cleanup: tab is now part of the path
      delete query.tab;

      const isLegislativeMainListView = selectedType.value === 'legislative'
        && tab === 'candidats'
        && (coal === null || coal === undefined)
        && (consti === null || consti === undefined);
      if (view && isLegislativeMainListView) query.view = view;
      else delete query.view;

      // Nettoyer stats_type quand on quitte l'onglet statistiques
      if (!isStatistiquesTab) {
        delete query.stats_type;
      }

      if (isCandidatesTab && coal !== null && coal !== undefined) query.coalition = String(coal);
      else delete query.coalition;

      if (isCandidatesTab && consti !== null && consti !== undefined) query.constituency = String(consti);
      else delete query.constituency;

      if (search) {
        query.q = search;
      } else {
        delete query.q;
      }

      return query;
    };

    // Sync du path uniquement quand l'onglet actif change.
    watch(activeTab, (tab) => {
      // Ignorer si on est en train de synchroniser depuis l'URL (évite les boucles)
      if (isSyncingFromRoute) return;
      if (!isDashboardPage.value) return;
      if (isCandidateProfilePage.value) return;
      if (!selectedType.value || !selectedYear.value) return;

      const currentTab = tab || 'candidats';
      const currentSearch = searchQuery.value || '';
      const currentCoalition = selectedCoalitionId.value;
      const currentConstituency = selectedConstituencyId.value;
      const currentView = legislativeViewType.value || '';
      const query = buildDashboardQuery(currentTab, currentSearch, currentCoalition, currentConstituency, currentView);

      // Ensure we don't trigger redundant navigation
      const currentQuery = route.query;
      const isDifferent = JSON.stringify(currentQuery) !== JSON.stringify(query);
      const targetPath = `/elections-senegal/dashboard/${selectedType.value}/${selectedYear.value}/${currentTab}`;
      const pathChanged = route.path !== targetPath;

      if (isDifferent || pathChanged) {
          router.replace({
              path: targetPath,
              query
          });
      }
    });

    // Sync des filtres uniquement dans la query pour éviter les redirections de path intempestives.
    watch([searchQuery, selectedCoalitionId, selectedConstituencyId, legislativeViewType], ([search, coal, consti, view]) => {
      // Ignorer si on est en train de synchroniser depuis l'URL (évite les boucles)
      if (isSyncingFromRoute) return;
      if (!isDashboardPage.value) return;
      if (isCandidateProfilePage.value) return;
      if (!selectedType.value || !selectedYear.value) return;

      const currentTab = activeTab.value || 'candidats';
      const query = buildDashboardQuery(currentTab, search || '', coal, consti, view || '');
      const currentQuery = route.query;
      const isDifferent = JSON.stringify(currentQuery) !== JSON.stringify(query);

      if (isDifferent) {
        router.replace({ query });
      }
    });
  }

  return {
    selectedYear,
    selectedType,
    activeTab,
    selectedConstituencyId,
    selectedCoalitionId,
    selectedFilterConstituencyId,
    searchQuery,
    legislativeViewType,
    config,
    currentElection,
    currentElectionDocuments,
    loadingConfig,
    configError,
    selectConstituency,
    clearConstituency,
    selectCoalition,
    clearCoalition
  };
};
