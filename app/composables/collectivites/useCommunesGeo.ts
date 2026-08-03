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
  const { data, pending, error } = useAsyncData<CommunesGeoResponse>('collectivites-communes', () =>
    $fetch('/api/collectivites/communes'),
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
  const { data, pending, error } = await useAsyncData<{ commune: CommuneGeo } | null>(
    () => `collectivites-commune-${toValue(slug)}`,
    () =>
      $fetch(`/api/collectivites/communes/${toValue(slug)}`).catch(() => null) as Promise<{
        commune: CommuneGeo;
      } | null>,
    { watch: [() => toValue(slug)] },
  );

  return {
    commune: computed(() => data.value?.commune ?? null),
    loading: pending,
    error,
  };
};
