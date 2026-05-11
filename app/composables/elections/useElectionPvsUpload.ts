export interface ElectionPv {
  id: string | number;
  date_created: string;
  source: "national" | "diaspora";
  tour: "1" | "2";
  // National
  region?: string;
  department?: string;
  municipality?: string;
  // Diaspora
  country?: string;
  diplomatic_representation?: string;
  locality?: string;
  // Commun
  bureau: string;
  image?: { id: string } | null;
  election?: { id: number; name: string; year: number } | null;
}

export interface PvFilters {
  source?: "national" | "diaspora";
  election?: number;
  // National
  department?: string;
  municipality?: string;
  // Diaspora
  country?: string;
  diplomatic_representation?: string;
}

export interface PvOptions {
  limit?: number;
  election?: number;
  autoFetch?: boolean;
}

/**
 * Composable pour gérer les PVs (liste, filtres, pagination)
 */
export const useElectionPvsUpload = (options: PvOptions = {}) => {
  const filters = reactive<PvFilters>({
    source: undefined,
    election: undefined,
    department: undefined,
    municipality: undefined,
    country: undefined,
    diplomatic_representation: undefined,
  });
  const currentPage = ref(1);
  const itemsPerPage = options.limit || 12;

  const query = computed(() => {
    const params: Record<string, any> = {
      limit: itemsPerPage,
      page: currentPage.value,
    };

    if (options.election) params.election = options.election;
    if (filters.source) params.source = filters.source;
    if (filters.election) params.election = filters.election;

    // National
    if (filters.department) params.department = filters.department;
    if (filters.municipality) params.municipality = filters.municipality;

    // Diaspora
    if (filters.country) params.country = filters.country;
    if (filters.diplomatic_representation) {
      params.diplomatic_representation = filters.diplomatic_representation;
    }

    return params;
  });

  const { data, pending, error, refresh } = useFetch("/api/elections/pvs-upload", {
    query,
    watch: [query],
    immediate: options.autoFetch !== false,
  });

  const pvs = computed<ElectionPv[]>(() => (data.value as any)?.data || []);
  const total = computed<number>(() => (data.value as any)?.meta?.total || 0);
  const totalPages = computed<number>(() => (data.value as any)?.meta?.pages || 1);

  const setFilter = (key: keyof PvFilters, value: any) => {
    filters[key] = value;
    currentPage.value = 1;
  };

  const clearFilters = () => {
    filters.source = undefined;
    filters.election = undefined;
    filters.department = undefined;
    filters.municipality = undefined;
    filters.country = undefined;
    filters.diplomatic_representation = undefined;
    currentPage.value = 1;
  };

  const hasActiveFilters = computed(() => {
    return Object.keys(filters).some((key) => !!filters[key as keyof PvFilters]);
  });

  const setPage = (page: number) => {
    currentPage.value = page;
  };

  return {
    pvs,
    loading: computed(() => pending.value),
    error,
    refresh,
    total,
    totalPages,
    currentPage,
    setPage,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
  };
};
