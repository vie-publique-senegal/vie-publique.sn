import type { PresidentsResponse, PresidentDetailResponse } from '~~/types/leader-history';

/** Liste de tous les mandats présidentiels (fetch unique, clé stable). */
export const usePresidents = () => {
  const { data, pending, error } = useFetch<PresidentsResponse>('/api/leader/presidents', {
    key: 'presidents-list',
    default: () => ({ terms: [], total: 0 }),
  });

  const terms = computed(() => data.value?.terms ?? []);
  const total = computed(() => data.value?.total ?? 0);
  const current = computed(() => terms.value.find((t) => t.end_date === null) ?? null);

  return { terms, total, current, loading: pending, error };
};

/** Détail d'une présidence par slug. */
export const usePresidentDetail = async (slug: string | Ref<string>) => {
  // `await` volontaire : sans lui, `error` n'est pas encore peuplée quand la page décide du
  // statut HTTP, et un slug inconnu partirait en 200.
  const { data, pending, error } = await useFetch<PresidentDetailResponse>(
    () => `/api/leader/presidents/${toValue(slug)}`,
    { key: () => `president-${toValue(slug)}` },
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
