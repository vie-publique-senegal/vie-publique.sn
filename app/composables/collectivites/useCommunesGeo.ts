import type { CommuneGeo } from '~~/types/collectivite';

interface CommunesGeoResponse {
  communes: CommuneGeo[];
  regions: string[];
  departements: string[];
  total: number;
  completude: { avecPopulation: number; avecMaire: number; avecContact: number };
}

const EMPTY_COMPLETUDE = { avecPopulation: 0, avecMaire: 0, avecContact: 0 };

/**
 * Référentiel géo réel des collectivités (remplace `#shared/communes` pour tout
 * ce qui est identité territoriale : nom, rattachement, population, maire).
 *
 * Les blocs encore générés du module (budget, conseil, projets…) restent dans
 * `shared/communes.ts` : ils n'ont pas d'équivalent en base.
 */
export const useCommunesGeo = () => {
  const { data, pending, error } = useAsyncData<CommunesGeoResponse>(
    'collectivites-communes',
    () => $fetch('/api/collectivites/communes'),
    {
      // Réutilise le payload du rendu serveur au lieu de refaire la requête à
      // l'hydratation (558 lignes) : pas de liste qui se vide un instant.
      getCachedData: (cacheKey, nuxtApp) =>
        nuxtApp.payload.data[cacheKey] ?? nuxtApp.static.data[cacheKey],
    },
  );

  return {
    communes: computed(() => data.value?.communes ?? []),
    regions: computed(() => data.value?.regions ?? []),
    departements: computed(() => data.value?.departements ?? []),
    total: computed(() => data.value?.total ?? 0),
    completude: computed(() => data.value?.completude ?? EMPTY_COMPLETUDE),
    loading: pending,
    error,
  };
};

/**
 * Fiche géo d'une commune ; `null` si le slug n'existe pas au référentiel.
 * À `await` en setup : la page doit connaître l'existence de la commune
 * pendant le rendu serveur pour décider d'un 404 (pas après hydratation).
 */
export const useCommuneGeo = async (slug: MaybeRefOrGetter<string>) => {
  const key = computed(() => `collectivites-commune-${toValue(slug)}`);

  const { data, pending, error } = await useAsyncData<{ commune: CommuneGeo }>(
    key,
    () => $fetch<{ commune: CommuneGeo }>(`/api/collectivites/communes/${toValue(slug)}`),
    {
      // La fiche est montée DEUX fois pour une même URL : par la page parente
      // (hero, onglets) et par la route d'onglet (contenu, SEO). Sans
      // `getCachedData`, la seconde inscription relance la requête à
      // l'hydratation : le contenu rendu par le serveur s'affiche, puis
      // disparaît le temps du re-fetch — l'effet « flash ». On sert le payload
      // déjà présent, aucune requête client n'est émise.
      getCachedData: (cacheKey, nuxtApp) =>
        nuxtApp.payload.data[cacheKey] ?? nuxtApp.static.data[cacheKey],
    },
  );

  // Pas de `.catch(() => null)` ici : avaler l'erreur transformait une panne
  // réseau passagère en fiche vide et silencieuse. Une commune absente fait
  // échouer la requête, et l'appelant décide (404).

  return {
    commune: computed(() => data.value?.commune ?? null),
    loading: pending,
    error,
  };
};
