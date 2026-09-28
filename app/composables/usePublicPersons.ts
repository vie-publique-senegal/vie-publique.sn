import { isMandateFilter, type MandateFilter, type PublicPerson } from '~~/types/public-person';

export interface PublicPersonsOptions {
  sort?: string;
  limit?: number;
  syncUrl?: boolean;
}

/**
 * Composable pour gérer la liste des personnalités publiques
 * Utilise useCmsCollection pour le fetch et useCollectionState pour l'état UI
 *
 * @example
 * const { persons, loading, searchQuery, filterCategory, filterGender, filterMandate } = usePublicPersons();
 */
export const usePublicPersons = (options: PublicPersonsOptions = {}) => {
  const route = useRoute();

  // Filtres spécifiques — lus depuis l'URL DE FAÇON SYNCHRONE (SSR + client, cf. CLAUDE.md)
  const filterCategory = ref<string>((route.query.category as string) || 'all');
  const filterGender = ref<string>((route.query.gender as string) || 'all');
  // Facette élu / nommé (`?mandat=elected|appointed|unclassified`), portée par la catégorie (G19)
  const filterMandate = ref<MandateFilter>(
    isMandateFilter(route.query.mandat) ? route.query.mandat : 'all',
  );

  // État UI avec sync URL
  const state = useCollectionState({
    defaultSort: options.sort || '-current_appointment.appointment_date',
    defaultItemsPerPage: options.limit || 25,
    defaultFilter: 'all',
    syncUrl: options.syncUrl !== false,
    urlParamsMapping: {
      search: 'q',
      filter: 'category',
      page: 'page',
      sort: 'sort',
    },
    additionalFilters: {
      gender: filterGender,
      mandat: filterMandate,
    },
  });

  // Sync filtre catégorie avec URL
  watch(filterCategory, () => {
    const query: any = { ...route.query };
    if (filterCategory.value !== 'all') {
      query.category = filterCategory.value;
    } else {
      delete query.category;
    }
    useRouter().replace({ query });
  });

  // Construction des filtres pour l'API
  const filters = computed(() => {
    const f: Record<string, any> = {};
    if (filterCategory.value && filterCategory.value !== 'all') {
      f.filterCategory = filterCategory.value;
    }
    if (filterGender.value && filterGender.value !== 'all') {
      f.filterGender = filterGender.value;
    }
    if (filterMandate.value !== 'all') {
      f.filterMandate = filterMandate.value;
    }
    return f;
  });

  // Fetch via composable générique
  const collection = useCmsCollection<PublicPerson>({
    collection: 'public-persons',
    filters,
    sort: state.sortBy,
    limit: state.itemsPerPage,
    page: state.currentPage,
    search: state.apiSearchQuery,
  });

  const totalItems = computed(() => collection.pagination.value?.total || 0);
  const totalPages = computed(() => collection.pagination.value?.totalPages || 1);

  const setFilterCategory = (category: string) => {
    filterCategory.value = category;
    state.currentPage.value = 1;
  };

  const setFilterGender = (gender: string) => {
    filterGender.value = gender;
    state.currentPage.value = 1;
  };

  const setFilterMandate = (mandate: MandateFilter) => {
    filterMandate.value = mandate;
    state.currentPage.value = 1;
  };

  // Stats globales
  const { data: stats } = useFetch('/api/public-persons/stats', {
    key: 'public-persons-stats',
  });

  const totalsByCategory = computed(() => {
    return stats.value?.totalsByCategory || {};
  });

  const totalsByGender = computed(() => {
    return stats.value?.totalsByGender || { maleCount: 0, femaleCount: 0 };
  });

  // Élus / nommés / non classés — les non classés restent comptés (G19)
  const totalsByMandate = computed(() => {
    return stats.value?.totalsByMandate || { elected: 0, appointed: 0, unclassified: 0 };
  });

  // Total global (toutes personnes, genre renseigné ou non — ex. maires sans `sexe`)
  const totalPersons = computed(() => stats.value?.total || 0);

  return {
    // Données
    persons: collection.items,
    loading: collection.loading,
    pagination: collection.pagination,
    error: collection.error,
    refresh: collection.refresh,

    // États
    currentPage: state.currentPage,
    searchQuery: state.searchQuery,
    sortBy: state.sortBy,
    itemsPerPage: state.itemsPerPage,
    filterCategory,
    filterGender,
    filterMandate,

    // Méthodes
    setCurrentPage: state.setCurrentPage,
    setSearchQuery: state.setSearchQuery,
    setSortBy: state.setSortBy,
    setItemsPerPage: state.setItemsPerPage,
    setFilterCategory,
    setFilterGender,
    setFilterMandate,
    resetFilters: () => {
      state.resetFilters();
      filterCategory.value = 'all';
      filterGender.value = 'all';
      filterMandate.value = 'all';
    },

    // Computed
    totalItems,
    totalPages,
    totalsByCategory,
    totalsByGender,
    totalsByMandate,
    totalPersons,
    hasActiveFilters: computed(
      () =>
        state.hasActiveFilters.value ||
        filterCategory.value !== 'all' ||
        filterGender.value !== 'all' ||
        filterMandate.value !== 'all',
    ),
  };
};
