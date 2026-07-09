<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';

const { selectedYear, selectedType, currentElection } = useElectoralDashboard();

const isLocalElection = computed(() => selectedType.value === 'locale');

const optionMap = 'Vue Carte';
const optionList = 'Vue Liste';
const selectedMapOption = ref(optionMap);
const mapCarteHasNoData = ref(false);

const mapListOptions = [
  { label: optionMap, icon: 'i-heroicons-map-solid' },
  { label: optionList, icon: 'i-heroicons-list-bullet-solid' },
];

const mapTabs = [
  { label: 'Nationale', icon: 'i-heroicons-map', slot: 'nationale' },
  { label: 'Diaspora', icon: 'i-heroicons-globe-europe-africa', slot: 'diaspora' },
  { label: 'Résumé', icon: 'i-heroicons-chart-bar', slot: 'resume' },
];

const mapIsReady = ref(false);

// Panel département (carte unifiée et carte locale legacy)
const selectedDepartmentData = ref<any>(null);
const isDepartmentPanelOpen = ref(false);

const handleDepartmentSelected = (dept: any) => {
  selectedDepartmentData.value = dept;
  isDepartmentPanelOpen.value = true;
};

const closeDepartmentPanel = () => {
  isDepartmentPanelOpen.value = false;
  setTimeout(() => {
    selectedDepartmentData.value = null;
  }, 300);
};

watch([selectedMapOption, selectedType, selectedYear], () => {
  mapIsReady.value = false;
});

watch([selectedType, selectedYear], () => {
  mapCarteHasNoData.value = false;
  selectedMapOption.value = optionMap;
  isDepartmentPanelOpen.value = false;
  selectedDepartmentData.value = null;
});

useSeoMeta({
  title: () => currentElection.value?.name
    ? `Carte · ${currentElection.value.name} | Vie-Publique SN`
    : 'Carte Électorale | Élections Sénégal',
  description: () => currentElection.value?.name
    ? `Carte électorale interactive pour ${currentElection.value.name} — répartition par département et diaspora.`
    : 'Carte électorale des élections au Sénégal.',
  ogTitle: () => currentElection.value?.name
    ? `Carte Électorale · ${currentElection.value.name}`
    : 'Carte Électorale — Élections Sénégal',
  ogDescription: () => currentElection.value?.name
    ? `Carte électorale interactive pour ${currentElection.value.name} — répartition géographique par département et diaspora.`
    : 'Carte électorale interactive des élections au Sénégal.',
});
</script>

<template>
  <div class="max-w-7xl mx-auto animate-in fade-in duration-700">
    <div class="overflow-hidden">
      <div class="p-6 border-b dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
        <div>
          <h2 class="text-2xl font-black uppercase tracking-tighter">Carte Électorale</h2>
          <p class="text-sm text-gray-500">Visualisation géographique par département.</p>
        </div>
      </div>

      <div class="p-4">
        <div v-if="!currentElection?.id || mapCarteHasNoData" class="flex flex-col items-center justify-center py-20 text-center">
          <div class="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-6">
            <UIcon name="i-heroicons-map" class="h-16 w-16 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 class="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">Carte non disponible</h3>
          <p class="text-sm text-gray-400 dark:text-gray-500 max-w-md">Les données cartographiques pour cette élection ne sont pas encore disponibles.</p>
        </div>

        <ClientOnly v-else>
          <UTabs :items="mapTabs" class="w-full">
            <template #nationale>
              <div class="w-full pt-4">
                <div class="mb-4 w-full flex justify-center">
                  <div class="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <UButton
                      v-for="option in mapListOptions"
                      :key="option.label"
                      :color="selectedMapOption === option.label ? 'white' : 'gray'"
                      :variant="selectedMapOption === option.label ? 'solid' : 'ghost'"
                      size="sm"
                      class="rounded-lg transition-all"
                      @click="selectedMapOption = option.label"
                    >
                      <UIcon :name="option.icon" class="w-4 h-4 mr-1" />
                      {{ option.label }}
                    </UButton>
                  </div>
                </div>

                <div v-if="selectedMapOption === optionMap" class="relative min-h-[600px]">
                  <div v-if="!mapIsReady" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
                    <div class="relative h-12 w-12">
                      <div class="absolute inset-0 border-4 border-primary-100 dark:border-primary-900 rounded-full"></div>
                      <div class="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p class="text-sm font-medium text-gray-400 animate-pulse">Chargement de la carte...</p>
                  </div>
                  <!-- Les élections locales gardent la carte legacy (bureaux rattachés au département,
                       pas de choroplèthe communale en mode bureaux) -->
                  <ElectionMapComponent4
                    v-if="isLocalElection"
                    :election-id="currentElection?.id"
                    :is-local-election="true"
                    @map-error="mapCarteHasNoData = true"
                    @map-ready="mapIsReady = true"
                    @department-selected="handleDepartmentSelected"
                  />
                  <ElectionUnifiedMap
                    v-else
                    mode="offices"
                    :election-id="currentElection?.id"
                    height="600px"
                    @map-error="mapCarteHasNoData = true"
                    @map-ready="mapIsReady = true"
                    @department-selected="handleDepartmentSelected"
                  />
                </div>
                <div v-else class="w-full">
                  <ElectionMapNationalDepartment :election-id="currentElection?.id" />
                </div>
              </div>
            </template>

            <template #diaspora>
              <div class="w-full pt-4">
                <ElectionMapDiasporaCountries :election-id="currentElection?.id" />
              </div>
            </template>

            <template #resume>
              <div class="w-full pt-4">
                <ElectionMapSummary :election-id="currentElection?.id" />
              </div>
            </template>
          </UTabs>

          <template #fallback>
            <div class="flex h-[500px] w-full items-center justify-center">
              <div class="flex flex-col items-center gap-3">
                <div class="relative h-12 w-12">
                  <div class="absolute inset-0 border-4 border-primary-100 dark:border-primary-900 rounded-full"></div>
                  <div class="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p class="text-sm font-medium text-gray-400 animate-pulse">Chargement de la carte...</p>
              </div>
            </div>
          </template>
        </ClientOnly>
      </div>
    </div>

    <ElectionMapDepartmentPanel
      :department="selectedDepartmentData"
      :is-open="isDepartmentPanelOpen"
      :election-id="currentElection?.id"
      @close="closeDepartmentPanel"
    />
  </div>
</template>
