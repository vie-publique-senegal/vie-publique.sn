export interface ElectionConfig {
  years: { label: string; value: number }[];
  types: { label: string; value: string }[];
  elections: any[];
  election_ids_with_documents: number[];
}

const STATIC_ELECTION_PATHS = ['guide-electoral', 'legislation', 'carte-electorale', 'dashboard']
const VALID_TABS = new Set(['candidats', 'carte', 'resultats', 'pvs', 'documents', 'statistiques', 'guide'])

export const useElectoralDashboard = () => {
  const route = useRoute();

  const isElectionSlugPage = computed(() => {
    const segments = route.path.split('/').filter(Boolean)
    return (
      segments[0] === 'elections-senegal'
      && segments.length >= 2
      && !STATIC_ELECTION_PATHS.includes(segments[1])
    )
  })

  const isCandidateProfilePage = computed(() =>
    /^\/elections-senegal\/[^/]+\/candidats\/[^/]+$/.test(route.path)
  )

  const getActiveTabFromRoute = () => {
    const segments = route.path.split('/').filter(Boolean)
    const last = segments[segments.length - 1]
    if (last && VALID_TABS.has(last)) return last
    return 'candidats'
  }

  const selectedYear = useState<number>('election-selected-year', () => 0);
  const selectedType = useState<string>('election-selected-type', () => '');
  const activeTab = useState<string>('election-active-tab', getActiveTabFromRoute);
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
      if (!selectedYear.value || !selectedType.value) {
        const completedElections = newConfig.elections.filter(e => e.status === 'completed');
        const defaultElection = completedElections.length > 0
          ? completedElections[0]
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
    searchQuery.value = '';
  };

  const clearConstituency = () => {
    selectedConstituencyId.value = null;
    selectedCoalitionId.value = null;
    selectedFilterConstituencyId.value = null;
  };

  const selectCoalition = (id: number) => {
    selectedCoalitionId.value = id;
    searchQuery.value = '';
  };

  const clearCoalition = () => {
    selectedCoalitionId.value = null;
  };

  const currentElection = computed(() => {
    if (!config.value?.elections) return null;
    return config.value.elections.find(e => e.year === selectedYear.value && e.type === selectedType.value) || null;
  });

  const currentElectionDocuments = computed(() => {
    return currentElection.value?.documents || [];
  });

  if (process.client) {
    const router = useRouter();

    let isSyncingFromRoute = false;

    const syncFromRoute = () => {
      if (!isElectionSlugPage.value) return;

      isSyncingFromRoute = true;

      if (isCandidateProfilePage.value) {
        activeTab.value = 'candidats';
      } else {
        const tabFromRoute = getActiveTabFromRoute();
        if (tabFromRoute) activeTab.value = tabFromRoute;
      }

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

      nextTick(() => {
        isSyncingFromRoute = false;
      });
    };

    watch(() => route.fullPath, syncFromRoute, { immediate: true });

    const buildDashboardQuery = (tab: string, search: string, coal: number | null, consti: number | null, view: string) => {
      const query: any = { ...route.query };
      const isCandidatesTab = tab === 'candidats';
      const isStatistiquesTab = tab === 'statistiques';

      delete query.tab;

      const isLegislativeMainListView = selectedType.value === 'legislative'
        && tab === 'candidats'
        && (coal === null || coal === undefined)
        && (consti === null || consti === undefined);
      if (view && isLegislativeMainListView) query.view = view;
      else delete query.view;

      if (!isStatistiquesTab) {
        delete query.stats_type;
      }

      if (isCandidatesTab && coal !== null && coal !== undefined) query.coalition = String(coal);
      else delete query.coalition;

      if (isCandidatesTab && consti !== null && consti !== undefined) query.constituency = String(consti);
      else delete query.constituency;

      if (search) query.q = search;
      else delete query.q;

      return query;
    };

    watch(activeTab, (tab) => {
      if (isSyncingFromRoute) return;
      if (!isElectionSlugPage.value) return;
      if (isCandidateProfilePage.value) return;
      if (!currentElection.value?.slug) return;

      const electionSlug = currentElection.value.slug;
      const currentTab = tab || 'candidats';
      const query = buildDashboardQuery(currentTab, searchQuery.value || '', selectedCoalitionId.value, selectedConstituencyId.value, legislativeViewType.value || '');

      const targetPath = `/elections-senegal/${electionSlug}/${currentTab}`;
      const pathChanged = route.path !== targetPath;
      const isDifferent = JSON.stringify(route.query) !== JSON.stringify(query);

      if (isDifferent || pathChanged) {
        router.replace({ path: targetPath, query });
      }
    });

    watch([searchQuery, selectedCoalitionId, selectedConstituencyId, legislativeViewType], ([search, coal, consti, view]) => {
      if (isSyncingFromRoute) return;
      if (!isElectionSlugPage.value) return;
      if (isCandidateProfilePage.value) return;
      if (!currentElection.value?.slug) return;

      const currentTab = activeTab.value || 'candidats';
      const query = buildDashboardQuery(currentTab, search || '', coal, consti, view || '');
      const isDifferent = JSON.stringify(route.query) !== JSON.stringify(query);

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
