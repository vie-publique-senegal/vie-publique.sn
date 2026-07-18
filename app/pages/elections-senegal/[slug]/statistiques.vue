<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useElectoralProfessions } from '~/composables/elections/dashboard/useElectoralProfessions';
import { useElectoralStatsList } from '~/composables/elections/dashboard/useElectoralStatsList';

const route = useRoute();
const router = useRouter();

const { selectedYear, selectedType, currentElection } = useElectoralDashboard();

const statsTypes = [
  { label: 'Profession des candidats', value: 'professionCandidat' },
  { label: 'Répartition par sexe', value: 'genderDistribution' },
  { label: 'Répartition par âge', value: 'ageDistribution' },
];

const statsType = ref('professionCandidat');

if (process.client && route.query.stats_type) {
  const found = statsTypes.find(t => t.value === route.query.stats_type);
  if (found) statsType.value = found.value;
}

watch(statsType, (newType) => {
  if (process.client) {
    router.replace({ query: { ...route.query, stats_type: newType } });
  }
});

const { data: professions, pending: loadingProfessions, error: errorProfessions } = useElectoralProfessions({
  year: selectedYear,
  type: selectedType,
});

const { data: statsDepartmental } = useElectoralStatsList({
  year: selectedYear,
  type: selectedType,
});

useSeoMeta({
  title: () => currentElection.value?.name
    ? `Statistiques · ${currentElection.value.name} | Vie-Publique SN`
    : 'Statistiques | Élections Sénégal',
  description: () => currentElection.value?.name
    ? `Analyses démographiques et socioprofessionnelles pour ${currentElection.value.name}.`
    : 'Statistiques des élections au Sénégal.',
  ogTitle: () => currentElection.value?.name
    ? `Statistiques · ${currentElection.value.name}`
    : 'Statistiques des Élections au Sénégal',
  ogDescription: () => currentElection.value?.name
    ? `Analyses démographiques et socioprofessionnelles des candidats pour ${currentElection.value.name}.`
    : 'Statistiques des élections au Sénégal.',
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
      <div>
        <h2 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Statistiques</h2>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Analyses démographiques et socioprofessionnelles.</p>
      </div>
      <USelect v-model="statsType" :options="statsTypes" placeholder="Choisir une statistique" class="w-full md:w-72" />
    </div>

    <div class="min-h-[400px]">
      <div v-if="loadingProfessions" class="flex justify-center items-center h-64">
        <div class="flex flex-col items-center space-y-2">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
          <span class="text-sm text-gray-400">Chargement des données...</span>
        </div>
      </div>

      <div v-else-if="errorProfessions" class="flex flex-col items-center justify-center py-20 text-center">
        <UIcon name="i-heroicons-chart-bar" class="h-16 w-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
        <h4 class="text-lg font-bold text-gray-400 mb-1">Données indisponibles</h4>
        <p class="text-sm text-gray-500 max-w-sm">Les statistiques pour cette élection ne sont pas encore disponibles.</p>
      </div>

      <div v-else>
        <template v-if="statsType === 'professionCandidat'">
          <ElectionCandidatProfessionChart v-if="professions && professions.length > 0" :professions="professions" />
          <div v-else class="flex flex-col items-center justify-center py-20 text-center">
            <UIcon name="i-heroicons-briefcase" class="h-16 w-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
            <h4 class="text-lg font-bold text-gray-400 mb-1">Aucune donnée de profession</h4>
            <p class="text-sm text-gray-500 max-w-sm">Les informations sur les professions des candidats ne sont pas encore disponibles pour cette élection.</p>
          </div>
        </template>
        <ElectionGenderDistributionChart v-else-if="statsType === 'genderDistribution'" />
        <ElectionAgeDistributionChart v-else-if="statsType === 'ageDistribution'" />
      </div>
    </div>
  </div>
</template>
