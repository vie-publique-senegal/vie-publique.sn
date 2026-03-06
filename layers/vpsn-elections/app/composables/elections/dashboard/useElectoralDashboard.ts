export interface ElectionConfig {
  years: { label: string; value: number }[];
  types: { label: string; value: string }[];
  elections: any[];
  election_ids_with_documents: number[];
}

export const useElectoralDashboard = () => {
  const appConfig = useAppConfig();
  const enabledTypes: string[] = appConfig.vpsnElections?.features?.enabledTypes ?? ['presidential', 'legislative', 'locale'];
  const showTypeFilter = !(appConfig.vpsnElections?.features?.hideTypeFilter ?? false);

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

  // Types et élections filtrés selon enabledTypes
  const filteredTypes = computed(() =>
    (config.value?.types ?? []).filter(t => enabledTypes.includes(t.value))
  );

  const filteredElections = computed(() =>
    (config.value?.elections ?? []).filter(e => enabledTypes.includes(e.type))
  );

  // Config filtrée — même structure que config mais avec types/elections restreints aux enabledTypes
  const filteredConfig = computed(() => {
    if (!config.value) return null;
    const electionsFiltered = filteredElections.value;
    const enabledYears = new Set(electionsFiltered.map(e => e.year));
    return {
      ...config.value,
      types: filteredTypes.value,
      elections: electionsFiltered,
      years: (config.value.years ?? []).filter(y => enabledYears.has(y.value)),
    };
  });

  // Initialiser avec la dernière élection "completed" par défaut SEULEMENT si pas déjà défini
  watch(config, (newConfig) => {
    if (newConfig && newConfig.elections && newConfig.elections.length > 0) {
      // Si pas encore de sélection, prendre la dernière élection "completed" parmi les types actifs
      if (!selectedYear.value || !selectedType.value) {
        const completedElections = filteredElections.value.filter(e => e.status === 'completed');
        const defaultElection = completedElections.length > 0
          ? completedElections[0] // Déjà trié par année desc dans config.get.ts
          : filteredElections.value[0];

        if (defaultElection) {
          selectedYear.value = defaultElection.year;
          selectedType.value = defaultElection.type;
        }
      }
    }
  }, { immediate: true });

  const selectConstituency = (id: number) => {
    selectedConstituencyId.value = id;
  };

  const clearConstituency = () => {
    selectedConstituencyId.value = null;
    selectedCoalitionId.value = null;
    selectedFilterConstituencyId.value = null;
  };

  const selectCoalition = (id: number) => {
    selectedCoalitionId.value = id;
  };

  const clearCoalition = () => {
    selectedCoalitionId.value = null;
  };

  const currentElection = computed(() => {
    if (!filteredElections.value.length) return null;
    return filteredElections.value.find(e => e.year === selectedYear.value && e.type === selectedType.value) || null;
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

    // Initialiser depuis les query params si on est sur le dashboard
    // Note: year and type are in the route path, not query params
    watch(isDashboardPage, (isDashboard) => {
      if (isDashboard) {
        if (route.query.tab) activeTab.value = route.query.tab as string;
        if (route.query.coalition) {
          const coalitionId = parseInt(route.query.coalition as string);
          if (!isNaN(coalitionId)) selectedCoalitionId.value = coalitionId;
        }
        if (route.query.constituency) {
          const constituencyId = parseInt(route.query.constituency as string);
          if (!isNaN(constituencyId)) selectedConstituencyId.value = constituencyId;
        }
        if (route.query.q) searchQuery.value = route.query.q as string;
        if (route.query.view) legislativeViewType.value = route.query.view as string;
      }
    }, { immediate: true });

    // Mettre à jour l'URL quand les filtres changent (uniquement sur le dashboard)
    // Note: year et type sont dans le path, pas dans les query params
    watch([activeTab, searchQuery, selectedCoalitionId, selectedConstituencyId, legislativeViewType], ([tab, search, coal, consti, view]) => {
      if (!isDashboardPage.value) return;

      const currentQuery = route.query;
      const query: any = { ...currentQuery };

      // Update logic
      if (tab) query.tab = tab;

      if (view && selectedType.value === 'legislative') query.view = view;
      else delete query.view;

      if (coal !== null && coal !== undefined) query.coalition = String(coal);
      else delete query.coalition;

      if (consti !== null && consti !== undefined) query.constituency = String(consti);
      else delete query.constituency;

      if (search) {
        query.q = search;
      } else {
        delete query.q;
      }

      // Ensure we don't trigger redundant navigation
      const isDifferent = JSON.stringify(currentQuery) !== JSON.stringify(query);

      const targetPath = `/elections-senegal/dashboard/${selectedType.value}/${selectedYear.value}`;
      const pathChanged = route.path !== targetPath;

      if (isDifferent || pathChanged) {
          router.replace({
              path: targetPath,
              query
          });
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
    filteredConfig,
    filteredTypes,
    filteredElections,
    currentElection,
    currentElectionDocuments,
    loadingConfig,
    configError,
    showTypeFilter,
    selectConstituency,
    clearConstituency,
    selectCoalition,
    clearCoalition
  };
};
