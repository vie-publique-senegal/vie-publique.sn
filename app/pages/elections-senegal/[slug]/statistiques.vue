<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useElectoralProfessions } from '~/composables/elections/dashboard/useElectoralProfessions';
import { useElectoralStatsList } from '~/composables/elections/dashboard/useElectoralStatsList';
import { useElectoralGenderStats } from '~/composables/elections/dashboard/useElectoralGenderStats';
import { useElectoralCoalitions } from '~/composables/elections/dashboard/useElectoralCoalitions';

const route = useRoute();
const router = useRouter();

const { selectedYear, selectedType, currentElection } = useElectoralDashboard();

/**
 * Registre des statistiques du dashboard.
 * - `enabled` : interrupteur d'affichage du type de stat (false = pas proposé,
 *   quel que soit le scrutin — à activer le moment venu quand la donnée existe).
 * - `types` : restreint aux types de scrutin où la stat a du sens (absent = tous).
 * Une stat activée mais SANS données pour l'élection courante n'apparaît pas
 * dans le sélecteur ; s'il reste au plus une stat, le sélecteur est masqué.
 */
interface StatDefinition {
  value: string;
  label: string;
  enabled: boolean;
  types?: string[];
}

const STATS_REGISTRY: StatDefinition[] = [
  { value: 'professionCandidat', label: 'Profession des candidats', enabled: true },
  { value: 'genderDistribution', label: 'Répartition des candidats par sexe', enabled: true },
  { value: 'professionElus', label: 'Profession des élus', enabled: true, types: ['legislative'] },
  {
    value: 'listsPresence',
    label: 'Présence des listes par circonscription',
    enabled: true,
    types: ['legislative'],
  },
  // Désactivée : les dates de naissance des candidats ne sont pas renseignées.
  { value: 'ageDistribution', label: 'Répartition par âge', enabled: false },
];

const {
  data: professions,
  pending: loadingProfessions,
  error: errorProfessions,
} = useElectoralProfessions({
  year: selectedYear,
  type: selectedType,
});

const {
  data: electedProfessions,
  pending: loadingElectedProfessions,
  error: errorElectedProfessions,
} = useElectoralProfessions({
  year: selectedYear,
  type: selectedType,
  elected: true,
});

const {
  data: genderStats,
  pending: loadingGenders,
  error: errorGenders,
} = useElectoralGenderStats({
  year: selectedYear,
  type: selectedType,
});

const {
  data: statsLists,
  pending: loadingLists,
  error: errorLists,
} = useElectoralStatsList({
  year: selectedYear,
  type: selectedType,
});

const { coalitions, loading: loadingCoalitions } = useElectoralCoalitions({
  year: selectedYear,
  type: selectedType,
});

// État de chargement / présence de données par stat (erreur = pas de données)
const statDataState = computed<Record<string, { loading: boolean; hasData: boolean }>>(() => ({
  professionCandidat: {
    loading: loadingProfessions.value,
    hasData: !errorProfessions.value && !!professions.value?.length,
  },
  genderDistribution: {
    loading: loadingGenders.value,
    hasData: !errorGenders.value && !!genderStats.value?.length,
  },
  professionElus: {
    loading: loadingElectedProfessions.value,
    hasData: !errorElectedProfessions.value && !!electedProfessions.value?.length,
  },
  listsPresence: {
    loading: loadingLists.value || loadingCoalitions.value,
    hasData: !errorLists.value && !!statsLists.value?.length && coalitions.value.length > 0,
  },
}));

const enabledStats = computed(() =>
  STATS_REGISTRY.filter(
    (stat) =>
      stat.enabled &&
      (!stat.types ||
        !currentElection.value?.type ||
        stat.types.includes(currentElection.value.type)),
  ),
);

// Seules les stats qui ont réellement des données pour ce scrutin sont proposées
const availableStats = computed(() =>
  enabledStats.value.filter((stat) => statDataState.value[stat.value]?.hasData),
);

const statsLoading = computed(() =>
  enabledStats.value.some((stat) => statDataState.value[stat.value]?.loading),
);

// Lu depuis la query dès le setup (SSR compris) — jamais dans onMounted.
const queryStat = String(route.query.stats_type || '');
const statsType = ref(
  STATS_REGISTRY.some((stat) => stat.enabled && stat.value === queryStat)
    ? queryStat
    : 'professionCandidat',
);

// Stat effectivement affichée : recalage sur la première stat disposant de
// données si le choix courant n'en a pas pour ce scrutin (ex. ?stats_type=
// professionElus sur une élection sans élus renseignés). Computed (et non
// watch) : évalué au rendu, donc identique en SSR et à l'hydratation —
// un watch ne rejoue pas côté serveur après la résolution des données.
const activeStat = computed(() => {
  if (availableStats.value.some((stat) => stat.value === statsType.value)) {
    return statsType.value;
  }
  return availableStats.value[0]?.value ?? null;
});

const onStatChange = (newType: string) => {
  statsType.value = newType;
  router.replace({ query: { ...route.query, stats_type: newType } });
};

useSeoMeta({
  title: () =>
    currentElection.value?.name
      ? `Statistiques · ${currentElection.value.name}`
      : 'Statistiques | Élections Sénégal',
  description: () =>
    currentElection.value?.name
      ? `Analyses démographiques et socioprofessionnelles pour ${currentElection.value.name}.`
      : 'Statistiques des élections au Sénégal.',
  ogTitle: () =>
    currentElection.value?.name
      ? `Statistiques · ${currentElection.value.name}`
      : 'Statistiques des Élections au Sénégal',
  ogDescription: () =>
    currentElection.value?.name
      ? `Analyses démographiques et socioprofessionnelles des candidats pour ${currentElection.value.name}.`
      : 'Statistiques des élections au Sénégal.',
});
</script>

<template>
  <div class="animate-in fade-in mx-auto max-w-7xl space-y-6 duration-700">
    <div
      class="flex flex-col justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-800 md:flex-row md:items-center"
    >
      <div>
        <h2 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Statistiques</h2>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Analyses démographiques et socioprofessionnelles.
        </p>
      </div>
      <USelect
        v-if="availableStats.length > 1"
        :model-value="activeStat"
        :options="availableStats"
        placeholder="Choisir une statistique"
        class="w-full md:w-72"
        @update:model-value="onStatChange"
      />
    </div>

    <div class="min-h-[400px]">
      <!-- Chargement initial : aucune stat encore disponible -->
      <div
        v-if="availableStats.length === 0 && statsLoading"
        class="flex h-64 items-center justify-center"
      >
        <div class="flex flex-col items-center space-y-2">
          <UIcon name="i-heroicons-arrow-path" class="text-primary-500 h-8 w-8 animate-spin" />
          <span class="text-sm text-gray-400">Chargement des données...</span>
        </div>
      </div>

      <!-- Aucune stat avec des données pour ce scrutin -->
      <div
        v-else-if="availableStats.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <UIcon
          name="i-heroicons-chart-bar"
          class="mx-auto mb-4 h-16 w-16 text-gray-200 dark:text-gray-700"
        />
        <h4 class="mb-1 text-lg font-bold text-gray-400">Données indisponibles</h4>
        <p class="max-w-sm text-sm text-gray-500">
          Les statistiques pour cette élection ne sont pas encore disponibles.
        </p>
      </div>

      <template v-else>
        <ElectionsDashboardStatsProfessionsRanking
          v-if="activeStat === 'professionCandidat' && professions"
          :professions="professions"
        />
        <ElectionsDashboardStatsCandidatesGenderStats
          v-else-if="activeStat === 'genderDistribution' && genderStats"
          :data="genderStats"
        />
        <ElectionsDashboardStatsProfessionsRanking
          v-else-if="activeStat === 'professionElus' && electedProfessions"
          :professions="electedProfessions"
          unit-label="élus"
        />
        <ElectionsDashboardStatsCoalitionListsPresence
          v-else-if="activeStat === 'listsPresence' && statsLists"
          :stats="statsLists"
          :coalitions="coalitions"
        />
      </template>
    </div>
  </div>
</template>
