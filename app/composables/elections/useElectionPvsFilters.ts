/**
 * Composable pour gérer les filtres disponibles des PVs
 */
export const useElectionPvsFilters = (electionId?: number | undefined) => {
  const { data, pending, error, refresh } = useFetch('/api/elections/pvs-upload/filters', {
    query: computed(() => ({
      election: electionId,
    })),
    watch: [() => electionId],
  });

  const availableFilters = computed(() => ({
    sources: (data.value as any)?.data?.sources || [],
    tours: (data.value as any)?.data?.tours || [],
    national: {
      regions: (data.value as any)?.data?.national?.regions || [],
      departments: (data.value as any)?.data?.national?.departments || [],
      municipalities: (data.value as any)?.data?.national?.municipalities || [],
    },
    diaspora: {
      countries: (data.value as any)?.data?.diaspora?.countries || [],
      diplomaticRepresentations:
        (data.value as any)?.data?.diaspora?.diplomaticRepresentations || [],
      localities: (data.value as any)?.data?.diaspora?.localities || [],
    },
  }));

  return {
    availableFilters,
    loading: pending,
    error,
    refresh,
  };
};
