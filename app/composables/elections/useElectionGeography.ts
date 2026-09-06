/**
 * Composable pour gérer les données géographiques pour l'upload de PVs
 */

export const useElectionGeography = () => {
  // ============================================
  // DONNÉES NATIONALES
  // ============================================

  // Régions
  const { data: regionsData, pending: loadingRegions } = useFetch(
    "/api/elections/pvs-upload/regions"
  );
  const regions = computed<string[]>(() => (regionsData.value as any)?.data || []);

  // Départements (chargés dynamiquement)
  const departments = ref<string[]>([]);
  const loadingDepartments = ref(false);

  const loadDepartments = async (region: string) => {
    if (!region) {
      departments.value = [];
      return;
    }

    loadingDepartments.value = true;
    try {
      const res = await $fetch<any>(`/api/elections/pvs-upload/departments?region=${region}`);
      departments.value = res?.data || [];
    } catch (error) {
      console.error("[Geography] Erreur chargement départements:", error);
      departments.value = [];
    } finally {
      loadingDepartments.value = false;
    }
  };

  // Communes (chargées dynamiquement)
  const municipalities = ref<string[]>([]);
  const loadingMunicipalities = ref(false);

  const loadMunicipalities = async (department: string) => {
    if (!department) {
      municipalities.value = [];
      return;
    }

    loadingMunicipalities.value = true;
    try {
      const res = await $fetch<any>(
        `/api/elections/pvs-upload/municipalities?department=${department}`
      );
      municipalities.value = res?.data || [];
    } catch (error) {
      console.error("[Geography] Erreur chargement communes:", error);
      municipalities.value = [];
    } finally {
      loadingMunicipalities.value = false;
    }
  };

  // Lieux de vote (chargés dynamiquement)
  const pollingPlaces = ref<string[]>([]);
  const loadingPollingPlaces = ref(false);

  const loadPollingPlaces = async (municipality: string) => {
    if (!municipality) {
      pollingPlaces.value = [];
      return;
    }

    loadingPollingPlaces.value = true;
    try {
      const res = await $fetch<any>(
        `/api/elections/pvs-upload/polling-places?municipality=${municipality}`
      );
      pollingPlaces.value = res?.data || [];
    } catch (error) {
      console.error("[Geography] Erreur chargement lieux de vote:", error);
      pollingPlaces.value = [];
    } finally {
      loadingPollingPlaces.value = false;
    }
  };

  // ============================================
  // DONNÉES DIASPORA
  // ============================================

  // Pays
  const { data: countriesData, pending: loadingCountries } = useFetch(
    "/api/elections/pvs-upload/countries"
  );
  const countries = computed<string[]>(() => (countriesData.value as any)?.data || []);

  // Représentations diplomatiques (chargées dynamiquement)
  const diplomaticRepresentations = ref<string[]>([]);
  const loadingRepresentations = ref(false);

  const loadDiplomaticRepresentations = async (country: string) => {
    if (!country) {
      diplomaticRepresentations.value = [];
      return;
    }

    loadingRepresentations.value = true;
    try {
      const res = await $fetch<any>(
        `/api/elections/pvs-upload/diplomatic-representations?country=${country}`
      );
      diplomaticRepresentations.value = res?.data || [];
    } catch (error) {
      console.error("[Geography] Erreur chargement représentations:", error);
      diplomaticRepresentations.value = [];
    } finally {
      loadingRepresentations.value = false;
    }
  };

  // ============================================
  // RESET FUNCTIONS
  // ============================================

  const resetNationalData = () => {
    departments.value = [];
    municipalities.value = [];
    pollingPlaces.value = [];
  };

  const resetDiasporaData = () => {
    diplomaticRepresentations.value = [];
  };

  const resetAll = () => {
    resetNationalData();
    resetDiasporaData();
  };

  return {
    // National
    regions,
    loadingRegions,
    departments,
    loadingDepartments,
    loadDepartments,
    municipalities,
    loadingMunicipalities,
    loadMunicipalities,
    pollingPlaces,
    loadingPollingPlaces,
    loadPollingPlaces,
    resetNationalData,

    // Diaspora
    countries,
    loadingCountries,
    diplomaticRepresentations,
    loadingRepresentations,
    loadDiplomaticRepresentations,
    resetDiasporaData,

    // Global
    resetAll,
  };
};
