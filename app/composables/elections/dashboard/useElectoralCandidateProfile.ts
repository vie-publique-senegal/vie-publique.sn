import type { Candidate } from '~~/types/candidate';

interface CandidateProfilePayload {
  election: { id: number; name?: string; status?: string; type?: string; year?: number };
  candidate: Candidate;
  coalition: { id?: string | number; name?: string; color?: string; logo?: string | null } | null;
  list: {
    id?: string | number;
    name?: string;
    type?: string;
    is_substitute?: boolean;
    constituency?: { id?: string | number; name?: string } | null;
  };
}

export const useElectoralCandidateProfile = (options: {
  slug: Ref<string> | string;
  year: Ref<number> | number;
  type: Ref<string> | string;
}) => {
  const slug = isRef(options.slug) ? options.slug : ref(options.slug);
  const year = isRef(options.year) ? options.year : ref(options.year);
  const type = isRef(options.type) ? options.type : ref(options.type);

  const { data, pending, error, refresh } = useFetch<{ data: CandidateProfilePayload | null }>(
    () => `/api/elections/dashboard/candidates/${unref(slug)}`,
    {
      query: {
        year,
        type,
      },
      key: computed(() => `dashboard-candidate-profile-${unref(type)}-${unref(year)}-${unref(slug)}`),
      watch: [slug, year, type],
      server: true,
      immediate: true,
    }
  );

  const candidateData = computed(() => data.value?.data || null);
  const candidate = computed(() => candidateData.value?.candidate || null);
  const coalition = computed(() => candidateData.value?.coalition || null);

  return {
    candidateData,
    candidate,
    coalition,
    pending,
    error,
    refresh,
  };
};
