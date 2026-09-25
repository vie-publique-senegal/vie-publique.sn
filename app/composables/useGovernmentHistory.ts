import type {
  GovernmentWithStats,
  GovernmentHistoryResponse,
  PersonRef,
  PresidentSummary,
} from '~~/types/government';

export type PresidencyGroup = {
  president: PersonRef;
  presidentSlug: string;
  governments: GovernmentWithStats[];
  startDate: string;
  endDate: string | null;
};

/**
 * Composable pour récupérer l'historique des gouvernements du Sénégal.
 * Les filtres (`q`, `president`) transitent par les query params de l'URL,
 * pour des URLs partageables, navigables et rendues côté SSR.
 */
export const useGovernmentHistory = () => {
  const route = useRoute();
  const router = useRouter();

  // État synchronisé avec l'URL : ?q=&president=
  const q = computed(() => (route.query.q as string) ?? '');
  const president = computed(() => (route.query.president as string) ?? '');

  const { data, pending, error, refresh } = useFetch<GovernmentHistoryResponse>(
    '/api/government/history',
    {
      key: 'government-history',
      default: () => ({ governments: [], presidents: [] }),
    },
  );

  /** Normalise (sans accents, minuscule) pour une recherche tolérante. */
  const normalize = (value: string): string =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const allGovernments = computed<GovernmentWithStats[]>(
    () => data.value?.governments ?? [],
  );

  // Filtrage 100% côté client (instantané)
  const governments = computed<GovernmentWithStats[]>(() => {
    let list = allGovernments.value;
    if (president.value) {
      list = list.filter((g) => g.president?.slug === president.value);
    }
    const term = normalize(q.value);
    if (term) {
      list = list.filter((g) =>
        normalize(
          `${g.name} ${g.president?.full_name ?? ''} ${g.prime_minister?.full_name ?? ''}`,
        ).includes(term),
      );
    }
    return list;
  });

  // Présidences dérivées dynamiquement côté serveur (jamais codées en dur).
  const presidents = computed<PresidentSummary[]>(
    () => data.value?.presidents ?? [],
  );

  const currentGovernment = computed<GovernmentWithStats | null>(
    () => governments.value.find((g) => g.end_date === null) ?? null,
  );

  // Regrouper par présidence (via president.slug), en conservant l'ordre récent → ancien
  const byPresidency = computed<PresidencyGroup[]>(() => {
    const groups: PresidencyGroup[] = [];
    const indexBySlug = new Map<string, number>();

    for (const gov of governments.value) {
      const key = gov.president?.slug || `president-${gov.president?.id ?? 'unknown'}`;

      if (!indexBySlug.has(key)) {
        indexBySlug.set(key, groups.length);
        groups.push({
          president: gov.president,
          presidentSlug: key,
          governments: [],
          startDate: gov.start_date,
          endDate: gov.end_date,
        });
      }

      const group = groups[indexBySlug.get(key)!];
      group.governments.push(gov);
      // start le plus ancien, end le plus récent du groupe
      if (gov.start_date < group.startDate) group.startDate = gov.start_date;
      if (group.endDate !== null) {
        if (gov.end_date === null) group.endDate = null;
        else if (gov.end_date > group.endDate) group.endDate = gov.end_date;
      }
    }

    return groups;
  });

  /** Met à jour un ou plusieurs query params (valeur vide = suppression). */
  const updateFilters = (
    next: Partial<{ q: string; president: string }>,
    mode: 'replace' | 'push' = 'replace',
  ) => {
    const query: Record<string, string> = { ...(route.query as Record<string, string>) };
    for (const [k, v] of Object.entries(next)) {
      if (v) query[k] = v;
      else delete query[k];
    }
    router[mode]({ query });
  };

  return {
    governments,
    allGovernments,
    presidents,
    byPresidency,
    currentGovernment,
    q,
    president,
    updateFilters,
    loading: pending,
    error,
    refresh,
  };
};
