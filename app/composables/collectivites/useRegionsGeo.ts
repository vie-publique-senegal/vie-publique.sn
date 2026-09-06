import type { CommuneGeo, DepartementGeo, RegionGeo } from '~~/types/collectivite';

interface RegionsGeoResponse {
  regions: RegionGeo[];
  total: number;
  totalCollectivites: number;
  totalDepartements: number;
}

interface RegionGeoResponse {
  region: RegionGeo;
  departements: DepartementGeo[];
  communes: CommuneGeo[];
  autresRegions: RegionGeo[];
}

/** Hub des 14 régions (page `/collectivites-territoriales/regions`). */
export const useRegionsGeo = () => {
  const { data, pending, error } = useAsyncData<RegionsGeoResponse>(
    'collectivites-regions',
    () => $fetch('/api/collectivites/regions'),
    {
      getCachedData: (cacheKey, nuxtApp) =>
        nuxtApp.payload.data[cacheKey] ?? nuxtApp.static.data[cacheKey],
    },
  );

  return {
    regions: computed(() => data.value?.regions ?? []),
    total: computed(() => data.value?.total ?? 0),
    totalCollectivites: computed(() => data.value?.totalCollectivites ?? 0),
    totalDepartements: computed(() => data.value?.totalDepartements ?? 0),
    loading: pending,
    error,
  };
};

/**
 * Page d'une région : l'agrégat, ses départements, ses communes.
 * À `await` en setup — la page doit décider d'un 404 pendant le rendu serveur.
 */
export const useRegionGeo = async (slug: MaybeRefOrGetter<string>) => {
  const key = computed(() => `collectivites-region-${toValue(slug)}`);

  const { data, pending, error } = await useAsyncData<RegionGeoResponse>(
    key,
    () => $fetch<RegionGeoResponse>(`/api/collectivites/regions/${toValue(slug)}`),
    {
      getCachedData: (cacheKey, nuxtApp) =>
        nuxtApp.payload.data[cacheKey] ?? nuxtApp.static.data[cacheKey],
    },
  );

  return {
    region: computed(() => data.value?.region ?? null),
    departements: computed(() => data.value?.departements ?? []),
    communes: computed(() => data.value?.communes ?? []),
    autresRegions: computed(() => data.value?.autresRegions ?? []),
    loading: pending,
    error,
  };
};
