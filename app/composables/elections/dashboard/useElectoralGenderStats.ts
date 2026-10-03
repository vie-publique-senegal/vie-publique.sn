import type { ElectionStatsGender } from '~~/types/election-stats-profession';

interface UseGenderStatsOptions {
  year?: number | Ref<number>;
  type?: string | Ref<string>;
}

/**
 * Composable pour récupérer la répartition par sexe des candidats pour le Dashboard
 * Architecture SSR : les appels passent par le serveur Nuxt
 */
export const useElectoralGenderStats = (options: UseGenderStatsOptions = {}) => {
  const year = isRef(options.year) ? options.year : ref(options.year);
  const type = isRef(options.type) ? options.type : ref(options.type);

  const query = computed(() => {
    const params: Record<string, string | number> = {};
    if (year.value) params.year = year.value;
    if (type.value) params.type = type.value;
    return params;
  });

  return useAsyncData(
    `useElectoralGenderStats-${year.value || 'all'}-${type.value || 'all'}`,
    () =>
      $fetch<{ data: ElectionStatsGender[] }>('/api/elections/dashboard/stats/genders', {
        query: query.value,
      }),
    {
      transform: (response) => response.data,
      server: true,
      lazy: false,
      watch: [year, type],
    },
  );
};
