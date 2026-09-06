/**
 * Composable pour récupérer l'élection active pour l'upload de PVs
 */
export const useActiveElection = () => {
  const { data, pending, error, refresh } = useFetch('/api/elections/pvs-upload/active-election');

  const activeElection = computed(() => (data.value as any)?.data ?? null);

  return {
    activeElection,
    loading: pending,
    error,
    refresh,
  };
};
