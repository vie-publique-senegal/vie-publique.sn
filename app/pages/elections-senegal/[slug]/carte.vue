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
  title: () =>
    currentElection.value?.name
      ? `Carte · ${currentElection.value.name} | Vie-Publique SN`
      : 'Carte Électorale | Élections Sénégal',
  description: () =>
    currentElection.value?.name
      ? `Carte électorale interactive pour ${currentElection.value.name} - répartition par département et diaspora.`
      : 'Carte électorale des élections au Sénégal.',
  ogTitle: () =>
    currentElection.value?.name
      ? `Carte Électorale · ${currentElection.value.name}`
      : 'Carte Électorale - Élections Sénégal',
  ogDescription: () =>
    currentElection.value?.name
      ? `Carte électorale interactive pour ${currentElection.value.name} - répartition géographique par département et diaspora.`
      : 'Carte électorale interactive des élections au Sénégal.',
});
</script>

<template>
  <div class="animate-in fade-in mx-auto max-w-7xl duration-700">
    <div class="overflow-hidden">
      <div class="mb-4">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white sm:text-2xl">
          Carte électorale
        </h2>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
          Répartition des électeurs, lieux et bureaux de vote - territoire national et diaspora.
        </p>
      </div>

      <div>
        <div
          v-if="!currentElection?.id || mapCarteHasNoData"
          class="flex flex-col items-center justify-center py-20 text-center"
        >
          <div class="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
            <UIcon name="i-heroicons-map" class="h-16 w-16 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 class="mb-2 text-lg font-bold text-gray-500 dark:text-gray-400">
            Carte non disponible
          </h3>
          <p class="max-w-md text-sm text-gray-400 dark:text-gray-500">
            Les données cartographiques pour cette élection ne sont pas encore disponibles.
          </p>
        </div>

        <ClientOnly v-else>
          <UTabs :items="mapTabs" class="w-full">
            <template #nationale>
              <div class="w-full pt-4">
                <div class="mb-4 flex w-full justify-center">
                  <div class="flex gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                    <UButton
                      v-for="option in mapListOptions"
                      :key="option.label"
                      :color="selectedMapOption === option.label ? 'white' : 'gray'"
                      :variant="selectedMapOption === option.label ? 'solid' : 'ghost'"
                      size="sm"
                      class="rounded-lg transition-all"
                      @click="selectedMapOption = option.label"
                    >
                      <UIcon :name="option.icon" class="mr-1 h-4 w-4" />
                      {{ option.label }}
                    </UButton>
                  </div>
                </div>

                <div v-if="selectedMapOption === optionMap" class="relative min-h-[600px]">
                  <div
                    v-if="!mapIsReady"
                    class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
                  >
                    <div class="relative h-12 w-12">
                      <div
                        class="border-primary-100 dark:border-primary-900 absolute inset-0 rounded-full border-4"
                      ></div>
                      <div
                        class="border-primary-600 absolute inset-0 animate-spin rounded-full border-4 border-t-transparent"
                      ></div>
                    </div>
                    <p class="animate-pulse text-sm font-medium text-gray-400">
                      Chargement de la carte...
                    </p>
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
                  <div
                    class="border-primary-100 dark:border-primary-900 absolute inset-0 rounded-full border-4"
                  ></div>
                  <div
                    class="border-primary-600 absolute inset-0 animate-spin rounded-full border-4 border-t-transparent"
                  ></div>
                </div>
                <p class="animate-pulse text-sm font-medium text-gray-400">
                  Chargement de la carte...
                </p>
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
