import type { CommuneGeo, DepartementAvecCommunes, DepartementGeo } from '~~/types/collectivite';

interface DepartementsGeoResponse {
  departements: DepartementAvecCommunes[];
  regions: string[];
  total: number;
  totalCollectivites: number;
}

interface DepartementGeoResponse {
  departement: DepartementGeo;
  communes: CommuneGeo[];
  voisins: DepartementGeo[];
}

/** Hub des 46 départements (page `/collectivites-territoriales/departements`). */
export const useDepartementsGeo = () => {
  const { data, pending, error } = useAsyncData<DepartementsGeoResponse>(
    'collectivites-departements',
    () => $fetch('/api/collectivites/departements'),
    {
      getCachedData: (cacheKey, nuxtApp) =>
        nuxtApp.payload.data[cacheKey] ?? nuxtApp.static.data[cacheKey],
    },
  );

  return {
    departements: computed(() => data.value?.departements ?? []),
    regions: computed(() => data.value?.regions ?? []),
    total: computed(() => data.value?.total ?? 0),
    totalCollectivites: computed(() => data.value?.totalCollectivites ?? 0),
    loading: pending,
    error,
  };
};

/**
 * Page d'un département : l'agrégat, ses communes, ses voisins de région.
 * À `await` en setup — la page doit décider d'un 404 pendant le rendu serveur,
 * pas après hydratation (même règle que `useCommuneGeo`).
 */
export const useDepartementGeo = async (slug: MaybeRefOrGetter<string>) => {
  const key = computed(() => `collectivites-departement-${toValue(slug)}`);

  const { data, pending, error } = await useAsyncData<DepartementGeoResponse>(
    key,
    () => $fetch<DepartementGeoResponse>(`/api/collectivites/departements/${toValue(slug)}`),
    {
      getCachedData: (cacheKey, nuxtApp) =>
        nuxtApp.payload.data[cacheKey] ?? nuxtApp.static.data[cacheKey],
    },
  );

  // Pas de `.catch(() => null)` : un département absent fait échouer la requête
  // et l'appelant décide (404). Avaler l'erreur transformerait une panne réseau
  // passagère en page vide et silencieuse.

  return {
    departement: computed(() => data.value?.departement ?? null),
    communes: computed(() => data.value?.communes ?? []),
    voisins: computed(() => data.value?.voisins ?? []),
    loading: pending,
    error,
  };
};
