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
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-[132px] z-30 bg-[#f8fafc]/90 dark:bg-gray-950/90 backdrop-blur-md py-4 border-b border-gray-200/50 dark:border-gray-800/50">
      <div>
        <h2 class="text-2xl font-black uppercase tracking-tighter">Statistiques</h2>
        <p class="text-gray-500">Analyses démographiques et socioprofessionnelles.</p>
      </div>
      <USelect v-model="statsType" :options="statsTypes" placeholder="Choisir une statistique" class="w-full md:w-72" />
    </div>

    <div class="p-6 min-h-[400px]">
      <div v-if="loadingProfessions" class="flex justify-center items-center h-64">
        <div class="flex flex-col items-center space-y-2">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
          <span class="text-sm text-gray-400">Chargement des données...</span>
        </div>
      </div>

      <UAlert v-else-if="errorProfessions" type="danger" title="Erreur de chargement">{{ errorProfessions }}</UAlert>

      <div v-else>
        <ElectionCandidatProfessionChart v-if="statsType === 'professionCandidat' && professions && professions.length > 0" :professions="professions" />
        <ElectionGenderDistributionChart v-if="statsType === 'genderDistribution'" />
        <ElectionAgeDistributionChart v-if="statsType === 'ageDistribution'" />
      </div>
    </div>
  </div>
</template>
