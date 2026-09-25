import type {
  PrimeMinistersResponse,
  PrimeMinisterDetailResponse,
} from '~~/types/leader-history';

/** Liste de tous les mandats de Premiers ministres (fetch unique, clé stable). */
export const usePrimeMinisters = () => {
  const { data, pending, error } = useFetch<PrimeMinistersResponse>(
    '/api/leader/prime-ministers',
    {
      key: 'pm-list',
      default: () => ({ terms: [], total: 0, gaps: [] }),
    },
  );

  const terms = computed(() => data.value?.terms ?? []);
  const gaps = computed(() => data.value?.gaps ?? []);
  const total = computed(() => data.value?.total ?? 0);
  const current = computed(() => terms.value.find((t) => t.end_date === null) ?? null);

  return { terms, gaps, total, current, loading: pending, error };
};

/** Détail d'un mandat de Premier ministre par slug. */
export const usePrimeMinisterDetail = (slug: string | Ref<string>) => {
  const { data, pending, error } = useFetch<PrimeMinisterDetailResponse>(
    () => `/api/leader/prime-ministers/${toValue(slug)}`,
    { key: () => `pm-${toValue(slug)}` },
  );

  return {
    term: computed(() => data.value?.term ?? null),
    profile: computed(() => data.value?.profile ?? null),
    appointment: computed(() => data.value?.appointment ?? null),
    prev: computed(() => data.value?.prev ?? null),
    next: computed(() => data.value?.next ?? null),
    loading: pending,
    error,
  };
};
