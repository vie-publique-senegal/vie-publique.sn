/**
 * Composable pour gérer les données de la diaspora par pays
 * Suit le pattern: component -> composable -> server -> Directus
 */

export interface DiasporaLocation {
  id: number;
  diplomatic_representation: string;
  country: string;
  locality: string;
  polling_place: string;
  office_number: number;
  voters: string;
}

export interface CountryStats {
  country: string;
  count: {
    office_number: number;
    polling_place: number;
  };
  sum: {
    voters: number;
  };
  countDistinct: {
    locality: number;
    polling_place: number;
  };
}

interface DiasporaCountryOptions {
  country: string;
  search?: Ref<string>;
  page?: Ref<number>;
  limit?: number;
  electionId?: Ref<string | undefined> | string | undefined;
  /** Fichier électoral diaspora explicite (prioritaire sur electionId côté API) */
  electoralFileId?: Ref<string | number | null> | string | number | null;
}

/**
 * Composable pour récupérer les données d'un pays de la diaspora
 *
 * @example
 * ```vue
 * const { stats, locations, pending, totalPages } = useDiasporaCountry({
 *   country: 'France',
 *   search: searchQuery,
 *   page: currentPage,
 *   electionId: electionIdRef,
 * });
 * ```
 */
export const useDiasporaCountry = (options: DiasporaCountryOptions) => {
  const { country, search, page, limit = 1000, electionId, electoralFileId } = options;

  // Computed pour obtenir la valeur de l'election ID
  const currentElectionId = computed(() => {
    if (!electionId) return undefined;
    const value = isRef(electionId) ? electionId.value : electionId;
    return value || undefined;
  });

  const currentElectoralFileId = computed(() => {
    if (!electoralFileId) return undefined;
    const value = isRef(electoralFileId) ? electoralFileId.value : electoralFileId;
    return value ? String(value) : undefined;
  });

  const sourceKeySuffix = computed(
    () => currentElectoralFileId.value ? `file-${currentElectoralFileId.value}` : currentElectionId.value || 'all',
  );

  // Query params pour les statistiques
  const statsQueryParams = computed(() => {
    const params: Record<string, string> = {};
    if (currentElectoralFileId.value) {
      params.electoral_file = currentElectoralFileId.value;
    } else if (currentElectionId.value) {
      params.election = currentElectionId.value;
    }
    return params;
  });

  // Query params pour les détails
  const detailsQueryParams = computed(() => {
    const params: Record<string, string | number> = {
      search: search?.value || "",
      page: page?.value || 1,
      limit,
    };
    if (currentElectoralFileId.value) {
      params.electoral_file = currentElectoralFileId.value;
    } else if (currentElectionId.value) {
      params.election = currentElectionId.value;
    }
    return params;
  });

  // ✅ Récupération des statistiques du pays via l'endpoint serveur
  const {
    data: statsData,
    pending: statsPending,
    error: statsError,
    refresh: refreshStats,
  } = useFetch<{ data: CountryStats }>(
    `/api/elections/diaspora/country-stats/${encodeURIComponent(country)}`,
    {
      key: computed(() => `diaspora-stats-${country}-${sourceKeySuffix.value}`),
      query: statsQueryParams,
      server: true,
      watch: [currentElectionId, currentElectoralFileId],
    },
  );

  // ✅ Récupération des détails (bureaux de vote) via l'endpoint serveur
  const {
    data: locationsData,
    pending: locationsPending,
    error: locationsError,
    refresh: refreshLocations,
  } = useFetch<{
    data: DiasporaLocation[];
    meta: { total_count: number; page: number; limit: number; total_pages: number };
  }>(`/api/elections/diaspora/country-details/${encodeURIComponent(country)}`, {
    key: computed(() => `diaspora-details-${country}-${sourceKeySuffix.value}`),
    query: detailsQueryParams,
    server: true,
    watch: search && page
      ? [search, page, currentElectionId, currentElectoralFileId]
      : [currentElectionId, currentElectoralFileId],
  });

  // Computed pour les stats formatées
  const stats = computed(() => {
    const data = statsData.value?.data;
    return data
      ? {
          localities: data.countDistinct.locality,
          pollingPlaces: data.countDistinct.polling_place,
          offices: data.count.office_number,
          voters: data.sum.voters,
        }
      : null;
  });

  // Computed pour les locations
  const locations = computed(() => locationsData.value?.data || []);

  // Computed pour le nombre total de pages
  const totalPages = computed(
    () => locationsData.value?.meta?.total_pages || 0,
  );

  // Computed pour le total d'électeurs
  const totalCount = computed(
    () => locationsData.value?.meta?.total_count || 0,
  );

  // État de chargement global
  const pending = computed(
    () => statsPending.value || locationsPending.value,
  );

  // Erreurs
  const error = computed(() => statsError.value || locationsError.value);

  // Fonction pour rafraîchir toutes les données
  const refresh = async () => {
    await Promise.all([refreshStats(), refreshLocations()]);
  };

  return {
    // Données
    stats,
    locations,
    totalPages,
    totalCount,

    // États
    pending,
    error,

    // Méthodes
    refresh,
  };
};
