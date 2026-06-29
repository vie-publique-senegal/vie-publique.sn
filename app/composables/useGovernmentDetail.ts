import type { GovernmentDetailResponse, GovernmentRoleGroup } from '~~/types/government';

/**
 * Composable pour récupérer le détail d'un gouvernement par son slug.
 * Tout est récupéré en un seul fetch (clé stable) puis filtré côté client
 * (`q`, `role`) → résultats instantanés, sans skeleton ni perte de focus.
 * Les filtres restent reflétés dans l'URL pour des liens partageables.
 */
export const useGovernmentDetail = (slug: string | Ref<string>) => {
  const route = useRoute();
  const router = useRouter();

  const q = computed(() => (route.query.q as string) ?? '');
  const role = computed(() => (route.query.role as string) ?? '');

  const { data, pending, error, refresh } = useFetch<GovernmentDetailResponse>(
    () => `/api/government/${toValue(slug)}`,
    {
      key: () => `government-detail-${toValue(slug)}`,
    },
  );

  /** Normalise (sans accents, minuscule) pour une recherche tolérante. */
  const normalize = (value: string): string =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const government = computed(() => data.value?.government ?? null);
  const roles = computed(() => data.value?.roles ?? []);
  const stats = computed(() => data.value?.stats ?? null);
  const allGroups = computed<GovernmentRoleGroup[]>(() => data.value?.groups ?? []);

  // Filtrage 100% côté client (instantané)
  const groups = computed<GovernmentRoleGroup[]>(() => {
    let list = allGroups.value;
    if (role.value) {
      list = list.filter((grp) => grp.slug === role.value);
    }
    const term = normalize(q.value);
    if (term) {
      list = list
        .map((grp) => ({
          ...grp,
          members: grp.members.filter((m) =>
            normalize(`${m.person.full_name} ${m.position_title}`).includes(term),
          ),
        }))
        .filter((grp) => grp.members.length > 0);
    }
    return list;
  });

  /** Met à jour un ou plusieurs query params (valeur vide = suppression). */
  const updateFilters = (
    next: Partial<{ q: string; role: string }>,
    mode: 'replace' | 'push' = 'replace',
  ) => {
    const query: Record<string, string> = { ...(route.query as Record<string, string>) };
    for (const [k, v] of Object.entries(next)) {
      if (v !== '' && v !== undefined && v !== null) {
        query[k] = String(v);
      } else {
        delete query[k];
      }
    }
    router[mode]({ query });
  };

  return {
    government,
    groups,
    roles,
    stats,
    q,
    role,
    updateFilters,
    loading: pending,
    error,
    refresh,
  };
};
