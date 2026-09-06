export interface ElectionConfig {
  years: { label: string; value: number }[];
  types: { label: string; value: string }[];
  elections: any[];
  election_ids_with_documents: number[];
}

const STATIC_ELECTION_PATHS = [
  'guide-electoral',
  'legislation',
  'carte-electorale',
  'dashboard',
  'scrutins',
];
const VALID_TABS = new Set([
  'candidats',
  'carte',
  'resultats',
  'pvs',
  'documents',
  'statistiques',
  'guide',
]);

export const useElectoralDashboard = () => {
  const route = useRoute();

  const isElectionSlugPage = computed(() => {
    const segments = route.path.split('/').filter(Boolean);
    return (
      segments[0] === 'elections-senegal' &&
      segments.length >= 2 &&
      !STATIC_ELECTION_PATHS.includes(segments[1])
    );
  });

  const isCandidateProfilePage = computed(() =>
    /^\/elections-senegal\/[^/]+\/candidats\/[^/]+$/.test(route.path),
  );

  const getActiveTabFromRoute = () => {
    // segments[0]=elections-senegal, [1]=slug d'élection, [2]=onglet : toujours
    // vrai quelle que soit la profondeur ensuite (ex. candidats/coalition/[slug]).
    const segments = route.path.split('/').filter(Boolean);
    const tab = segments[2];
    if (tab && VALID_TABS.has(tab)) return tab;
    return 'candidats';
  };

  const VALID_LEGISLATIVE_VIEWS = new Set(['list', 'head', 'ballot']);

  const selectedYear = useState<number>('election-selected-year', () => 0);
  const selectedType = useState<string>('election-selected-type', () => '');
  const activeTab = useState<string>('election-active-tab', getActiveTabFromRoute);
  // Les états pilotés par l'URL sont initialisés depuis la query dès le premier rendu (serveur compris) :
  // le SSR doit produire la même vue que le client, sinon mismatch d'hydratation au refresh (ex. ?view=head).
  // Coalition/circonscription ne sont plus pilotées par query (?coalition=/?constituency=) mais par
  // des routes dédiées (candidats/coalition/[slug], candidats/circonscription/[slug]) : chaque page
  // résout elle-même son id depuis le slug, sans état partagé ici.
  const searchQuery = useState<string>('election-search-query', () =>
    route.query.q ? String(route.query.q) : '',
  );
  const legislativeViewType = useState<string>('election-legislative-view-type', () =>
    VALID_LEGISLATIVE_VIEWS.has(String(route.query.view)) ? String(route.query.view) : 'list',
  );

  const {
    data: config,
    pending: loadingConfig,
    error: configError,
  } = useFetch<ElectionConfig>('/api/elections/dashboard/config', {
    key: 'election-dashboard-config',
    server: true,
  });

  // Initialiser avec la dernière élection "completed" par défaut
  // SEULEMENT si pas déjà défini ET si on n'est PAS sur une page élection par slug
  // (sur les pages [slug], l'élection est définie depuis le slug lui-même)
  watch(
    config,
    (newConfig) => {
      if (newConfig && newConfig.elections && newConfig.elections.length > 0) {
        // Ne pas définir de valeur par défaut si on est sur une page élection avec slug
        // Ces pages gèrent leur propre sync depuis le slug
        if (isElectionSlugPage.value) return;

        if (!selectedYear.value || !selectedType.value) {
          const completedElections = newConfig.elections.filter((e) => e.status === 'completed');
          const defaultElection =
            completedElections.length > 0 ? completedElections[0] : newConfig.elections[0];

          if (defaultElection) {
            selectedYear.value = defaultElection.year;
            selectedType.value = defaultElection.type;
          }
        }
      }
    },
    { immediate: true },
  );

  const currentElection = computed(() => {
    if (!config.value?.elections) return null;
    return (
      config.value.elections.find(
        (e) => e.year === selectedYear.value && e.type === selectedType.value,
      ) || null
    );
  });

  const currentElectionDocuments = computed(() => {
    return currentElection.value?.documents || [];
  });

  if (import.meta.client) {
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

      searchQuery.value = route.query.q ? String(route.query.q) : '';

      if (route.query.view && VALID_LEGISLATIVE_VIEWS.has(String(route.query.view))) {
        legislativeViewType.value = String(route.query.view);
      }

      nextTick(() => {
        isSyncingFromRoute = false;
      });
    };

    watch(() => route.fullPath, syncFromRoute, { immediate: true });

    // Coalition/circonscription/commune ne sont plus des query params ici (routes
    // dédiées) ; seuls la recherche (q) et le mode d'affichage législatives (view)
    // restent en query.
    const buildDashboardQuery = (tab: string, search: string, view: string) => {
      const query: any = { ...route.query };
      const isStatistiquesTab = tab === 'statistiques';

      delete query.tab;
      delete query.coalition;
      delete query.constituency;
      delete query.commune_id;

      const isLegislativeMainListView = selectedType.value === 'legislative' && tab === 'candidats';
      if (view && isLegislativeMainListView) query.view = view;
      else delete query.view;

      if (!isStatistiquesTab) {
        delete query.stats_type;
      }

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
      const query = buildDashboardQuery(
        currentTab,
        searchQuery.value || '',
        legislativeViewType.value || '',
      );

      const targetPath = `/elections-senegal/${electionSlug}/${currentTab}`;
      const pathChanged = route.path !== targetPath;
      const isDifferent = JSON.stringify(route.query) !== JSON.stringify(query);

      if (isDifferent || pathChanged) {
        router.replace({ path: targetPath, query });
      }
    });

    watch([searchQuery, legislativeViewType], ([search, view]) => {
      if (isSyncingFromRoute) return;
      if (!isElectionSlugPage.value) return;
      if (isCandidateProfilePage.value) return;
      if (!currentElection.value?.slug) return;

      const currentTab = activeTab.value || 'candidats';
      const query = buildDashboardQuery(currentTab, search || '', view || '');
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
    searchQuery,
    legislativeViewType,
    config,
    currentElection,
    currentElectionDocuments,
    loadingConfig,
    configError,
  };
};
