import type { Ref } from 'vue';
import type {
  PollingStation,
  DepartmentStats,
} from "~~/types/election-map-national";

interface UseElectionDataOptions {
  electionId?: Ref<string | number | null> | string | number | null;
  /** Fichier électoral national explicite (prioritaire sur electionId côté API) */
  electoralFileId?: Ref<string | number | null> | string | number | null;
}

/**
 * Composable pour gérer les données de la carte électorale nationale
 * Architecture SSR : les appels passent par le serveur Nuxt
 *
 * @param options - Options du composable incluant l'ID de l'élection
 * @example
 * const { fetchDepartmentsStats, fetchDepartmentDetails, getDepartmentStats } = useElectionData({ electionId: ref(1) });
 */
export function useElectionData(options: UseElectionDataOptions = {}) {
  const { electionId, electoralFileId } = options;

  // Computed pour obtenir la valeur de l'election ID
  const currentElectionId = computed(() => {
    if (!electionId) return null;
    const value = isRef(electionId) ? electionId.value : electionId;
    if (value === null || value === undefined) return null;
    return typeof value === 'string' ? value : String(value);
  });

  const currentElectoralFileId = computed(() => {
    if (!electoralFileId) return null;
    const value = isRef(electoralFileId) ? electoralFileId.value : electoralFileId;
    if (value === null || value === undefined) return null;
    return typeof value === 'string' ? value : String(value);
  });

  // Contexte de source commun aux requêtes (fichier électoral prioritaire)
  const applySourceParams = (params: Record<string, string>) => {
    if (currentElectoralFileId.value) {
      params.electoral_file = currentElectoralFileId.value;
    } else if (currentElectionId.value) {
      params.election = currentElectionId.value;
    }
    return params;
  };

  const sourceKeySuffix = computed(
    () => `${currentElectoralFileId.value ? `file-${currentElectoralFileId.value}` : currentElectionId.value || 'all'}`,
  );

  // Récupération de la liste des départements avec statistiques
  const fetchDepartmentsStats = () => {
    const queryParams = computed(() => applySourceParams({ groupBy: "department" }));

    return useFetch<DepartmentStats[]>("/api/elections/map/national", {
      key: computed(() => `departments-stats-${sourceKeySuffix.value}`),
      query: queryParams,
      transform: (response: any) => response.data,
      watch: [currentElectionId, currentElectoralFileId],
    });
  };

  // Récupération des détails d'un département spécifique
  const fetchDepartmentDetails = (department: string) => {
    const queryParams = computed(() => applySourceParams({ department }));

    return useFetch<PollingStation[]>("/api/elections/map/national", {
      key: computed(() => `department-${department}-${sourceKeySuffix.value}`),
      query: queryParams,
      transform: (response: any) => response.data,
      watch: [currentElectionId, currentElectoralFileId],
    });
  };

  // Stats en temps réel pour un département
  const getDepartmentStats = (department: string) => {
    const queryParams = computed(() => applySourceParams({ department, groupBy: "department" }));

    return useFetch<DepartmentStats>("/api/elections/map/national", {
      key: computed(() => `department-stats-${department}-${sourceKeySuffix.value}`),
      query: queryParams,
      transform: (response: any) => response.data[0],
      watch: [currentElectionId, currentElectoralFileId],
    });
  };

  return {
    fetchDepartmentsStats,
    fetchDepartmentDetails,
    getDepartmentStats,
  };
}
