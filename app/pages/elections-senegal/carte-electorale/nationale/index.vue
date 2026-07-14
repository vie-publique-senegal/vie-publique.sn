<script setup lang="ts">
/**
 * Carte électorale - vue nationale (carte des départements + vue liste).
 * Route dédiée (SEO) ; contexte de révision partagé avec les autres pages
 * carte-electorale via useElectoralRevision.
 */

const { siteName, siteUrl, keywords, themeColor } = useSiteMetadata();

const {
  currentRevision: selectedRevision,
  nationalFileId,
  contextQuery,
  pending: loadingRevision,
} = useElectoralRevision({ syncUrl: true });

const title = computed(() =>
  selectedRevision.value?.year
    ? `Carte Électorale Nationale ${selectedRevision.value.year} | Élections Sénégal`
    : 'Carte Électorale Nationale | Élections Sénégal');
const description = 'Carte électorale nationale du Sénégal : électeurs, bureaux et lieux de vote par département.';
const url = `${siteUrl}/elections-senegal/carte-electorale/nationale`;

useSeoMeta({
  title,
  description,
  ogTitle: () =>
    selectedRevision.value?.year
      ? `Carte Électorale Nationale ${selectedRevision.value.year}`
      : 'Carte Électorale Nationale',
  ogDescription: 'Explorez la répartition des électeurs et des bureaux de vote par département au Sénégal.',
  ogUrl: url,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  keywords: [...keywords, 'carte électorale nationale sénégal', 'bureaux de vote par département'].join(', '),
});

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Élections', item: `${siteUrl}/elections-senegal` },
    { '@type': 'ListItem', position: 3, name: 'Carte électorale', item: `${siteUrl}/elections-senegal/carte-electorale` },
    { '@type': 'ListItem', position: 4, name: 'Nationale', item: url },
  ],
};

useHead({
  link: [{ rel: 'canonical', href: url }],
  meta: [
    { name: 'theme-color', content: themeColor },
    { name: 'author', content: siteName },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
    { name: 'robots', content: 'index, follow' },
    { name: 'geo.region', content: 'SN' },
  ],
  script: [{ type: 'application/ld+json', children: JSON.stringify(breadcrumbSchema) }],
});

const optionMap = 'Vue Carte';
const optionList = 'Vue Liste';
const selectedOptions = ref(optionMap);

const listViewTypes = [
  { label: optionMap, icon: 'i-heroicons-map-solid' },
  { label: optionList, icon: 'i-heroicons-list-bullet-solid' },
];

const mapDataAvailable = ref(true);
const listDataAvailable = ref(true);
const mapIsReady = ref(false);

const handleMapReady = () => {
  mapDataAvailable.value = true;
  mapIsReady.value = true;
};
const handleMapError = () => {
  mapDataAvailable.value = false;
};
const handleListEmpty = () => {
  listDataAvailable.value = false;
};
const handleListReady = () => {
  listDataAvailable.value = true;
};

watch(selectedOptions, (newVal) => {
  if (newVal === optionMap) mapIsReady.value = false;
});

// Panel département
const selectedDepartmentData = ref<Record<string, unknown> | null>(null);
const isDepartmentPanelOpen = ref(false);

const handleDepartmentSelected = (dept: Record<string, unknown>) => {
  selectedDepartmentData.value = dept;
  isDepartmentPanelOpen.value = true;
};

const closeDepartmentPanel = () => {
  isDepartmentPanelOpen.value = false;
  setTimeout(() => {
    selectedDepartmentData.value = null;
  }, 300);
};

const representativeElectionId = computed(() => {
  const elections = selectedRevision.value?.elections || [];
  return elections.length > 0 ? String(elections[0].id) : null;
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-8 pb-16">
    <div class="mb-4 w-full max-w-7xl">
      <AppBreadcrumb
        class="mb-6"
        :items="[
          { label: 'Élections', to: '/elections-senegal' },
          {
            label: 'Carte électorale',
            to: { path: '/elections-senegal/carte-electorale', query: contextQuery },
          },
          { label: 'Nationale' },
        ]"
      />

      <h1 class="text-xl font-bold text-gray-900 dark:text-white md:text-3xl">Carte Électorale - Nationale</h1>
      <p class="mt-0.5 max-w-3xl text-xs text-gray-500 dark:text-gray-400 md:mt-1 md:text-sm">
        Sélectionnez un département pour des informations détaillées.
      </p>

      <ElectionRevisionCard class="mt-6" />

      <ElectionMapTabs active="nationale" :query="contextQuery" />
    </div>

    <div class="w-full max-w-7xl">
      <ClientOnly>
        <div v-if="loadingRevision" class="flex h-[500px] w-full items-center justify-center">
          <div
            class="border-t-primary-600 h-10 w-10 animate-spin rounded-full border-4 border-gray-200"
          />
        </div>
        <template v-else>
          <!-- View Toggle -->
          <div class="mb-4 flex w-full justify-center">
            <div class="flex gap-2">
              <UButton
                v-for="option in listViewTypes"
                :key="option.label"
                :color="selectedOptions === option.label ? 'white' : 'gray'"
                :variant="selectedOptions === option.label ? 'solid' : 'ghost'"
                size="md"
                class="shadow-sm"
                @click="selectedOptions = option.label"
              >
                <UIcon :name="option.icon" class="mr-1 h-5 w-5" />
                {{ option.label }}
              </UButton>
            </div>
          </div>

          <!-- CARTE -->
          <div v-if="selectedOptions == optionMap">
            <div
              v-if="!mapDataAvailable"
              class="flex flex-col items-center justify-center py-16 text-center"
            >
              <UIcon
                name="i-heroicons-map"
                class="mb-4 h-16 w-16 text-gray-300 dark:text-gray-600"
              />
              <h3 class="mb-2 text-lg font-bold text-gray-600 dark:text-gray-400">
                Données cartographiques non disponibles
              </h3>
              <p class="max-w-md text-sm text-gray-500 dark:text-gray-500">
                Les données de la carte électorale pour cette révision ne sont pas encore
                disponibles.
              </p>
            </div>
            <div v-else class="relative min-h-[600px]">
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
              <ElectionUnifiedMap
                mode="offices"
                :electoral-file-id="nationalFileId"
                :election-id="representativeElectionId"
                height="600px"
                @map-ready="handleMapReady"
                @map-error="handleMapError"
                @department-selected="handleDepartmentSelected"
              />
            </div>
          </div>

          <!-- LISTE -->
          <div v-else class="w-full">
            <div
              v-if="!listDataAvailable"
              class="flex flex-col items-center justify-center py-16 text-center"
            >
              <UIcon
                name="i-heroicons-list-bullet"
                class="mb-4 h-16 w-16 text-gray-300 dark:text-gray-600"
              />
              <h3 class="mb-2 text-lg font-bold text-gray-600 dark:text-gray-400">
                Données non disponibles
              </h3>
              <p class="max-w-md text-sm text-gray-500 dark:text-gray-500">
                Les données départementales pour cette révision ne sont pas encore disponibles.
              </p>
            </div>
            <ElectionMapNationalDepartment
              v-else
              :election-id="representativeElectionId"
              @list-empty="handleListEmpty"
              @list-ready="handleListReady"
            />
          </div>
        </template>
        <template #fallback>
          <div class="flex h-[500px] w-full items-center justify-center">
            <div
              class="border-t-primary-600 h-10 w-10 animate-spin rounded-full border-4 border-gray-200"
            />
          </div>
        </template>
      </ClientOnly>
    </div>

    <ElectionMapDepartmentPanel
      :department="selectedDepartmentData"
      :is-open="isDepartmentPanelOpen"
      :election-id="representativeElectionId"
      @close="closeDepartmentPanel"
    />
  </div>
</template>
