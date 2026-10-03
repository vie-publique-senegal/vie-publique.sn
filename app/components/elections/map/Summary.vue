<script setup lang="ts">
interface Props {
  electionId?: string | number | null;
}

const props = withDefaults(defineProps<Props>(), {
  electionId: null,
});

interface SummaryResponse {
  total: {
    voters: number;
    offices: number;
    places: number;
    departments: number;
  };
  national: {
    voters: number;
    offices: number;
    places: number;
    departments: number;
    municipalities: number;
  };
  diaspora: {
    voters: number;
    offices: number;
    places: number;
    countries: number;
    localities: number;
    diplomaticRepresentations: number;
  };
}

interface ZonesResponse {
  zones: { id: number }[];
}

// Convertir electionId en computed pour la réactivité
const electionIdRef = computed(() => props.electionId);

// Construire les paramètres de requête avec l'ID d'élection
const queryParams = computed(() => {
  const params: Record<string, string> = {};
  if (electionIdRef.value) {
    params.election = String(electionIdRef.value);
  }
  return params;
});

// Récupérer les données du résumé
const { data: summaryData, pending } = await useFetch<SummaryResponse>(
  '/api/elections/map/summary',
  {
    key: computed(() => `election-summary-${electionIdRef.value || 'all'}`),
    query: queryParams,
    watch: [electionIdRef],
  },
);

// Nombre de circonscriptions de la diaspora (zones électorales officielles),
// non exposé par /map/summary : réutilise le même endpoint que DiasporaZones.vue.
const { data: diasporaZonesData } = await useFetch<ZonesResponse>('/api/elections/diaspora/zones', {
  key: computed(() => `diaspora-zones-count-${electionIdRef.value || 'all'}`),
  query: queryParams,
  watch: [electionIdRef],
  default: () => ({ zones: [] }),
});
const diasporaConstituencies = computed(() => diasporaZonesData.value?.zones.length || 0);

// Formater les nombres
const formatNumber = (value: number | undefined) => {
  if (value === undefined || value === null) return '0';
  return value.toLocaleString('fr-FR');
};

// Sections de statistiques calculées dynamiquement
const statSections = computed(() => {
  const data = summaryData.value;
  if (!data) return [];

  return [
    {
      title: 'Total',
      icon: 'i-heroicons-globe-alt',
      stats: [
        {
          label: 'Électeurs',
          value: formatNumber(data.total.voters),
          icon: 'i-heroicons-users',
        },
        {
          label: 'Lieux de vote',
          value: formatNumber(data.total.places),
          icon: 'i-heroicons-map-pin',
        },
        {
          label: 'Bureaux de vote',
          value: formatNumber(data.total.offices),
          icon: 'i-heroicons-building-office',
        },
        {
          label: 'Circonscriptions',
          value: formatNumber(data.national.departments + diasporaConstituencies.value),
          icon: 'i-heroicons-map',
        },
      ],
    },
    {
      title: 'Diaspora',
      icon: 'i-heroicons-globe-americas',
      stats: [
        {
          label: 'Électeurs',
          value: formatNumber(data.diaspora.voters),
          icon: 'i-heroicons-users',
        },
        {
          label: 'Bureaux de vote',
          value: formatNumber(data.diaspora.offices),
          icon: 'i-heroicons-building-office',
        },
        {
          label: 'Lieux de vote',
          value: formatNumber(data.diaspora.places),
          icon: 'i-heroicons-map-pin',
        },
        {
          label: 'Circonscriptions',
          value: formatNumber(diasporaConstituencies.value),
          icon: 'i-heroicons-map',
        },
        {
          label: 'Pays',
          value: formatNumber(data.diaspora.countries),
          icon: 'i-heroicons-flag',
        },
        {
          label: 'Représentations diplomatiques',
          value: formatNumber(data.diaspora.diplomaticRepresentations),
          icon: 'i-heroicons-home-modern',
        },
        {
          label: 'Localités',
          value: formatNumber(data.diaspora.localities),
          icon: 'i-heroicons-map',
        },
      ],
    },
    {
      title: 'Nationale',
      icon: 'i-heroicons-building-library',
      stats: [
        {
          label: 'Électeurs',
          value: formatNumber(data.national.voters),
          icon: 'i-heroicons-users',
        },
        {
          label: 'Lieux de vote',
          value: formatNumber(data.national.places),
          icon: 'i-heroicons-map-pin',
        },
        {
          label: 'Bureaux de vote',
          value: formatNumber(data.national.offices),
          icon: 'i-heroicons-building-office',
        },
        {
          label: 'Circonscriptions',
          value: formatNumber(data.national.departments),
          icon: 'i-heroicons-map',
        },
      ],
    },
  ];
});
</script>

<template>
  <!-- État de chargement -->
  <div v-if="pending" class="flex justify-center py-8">
    <UIcon name="i-heroicons-arrow-path" class="text-primary-500 h-8 w-8 animate-spin" />
  </div>

  <template v-else>
    <!-- En-tête -->
    <h2 class="mb-4 text-center text-2xl font-bold text-gray-800 dark:text-white">
      Résumé du fichier électoral
    </h2>

    <!-- Sections -->
    <div v-for="section in statSections" :key="section.title" class="mb-4 mt-2 space-y-2">
      <!-- Titre de section avec barres -->
      <div class="flex items-center justify-center gap-4 px-4">
        <div class="h-[1px] w-full bg-gray-300 dark:bg-gray-700"></div>
        <h3 class="flex items-center gap-2 text-lg font-bold text-gray-700 dark:text-white">
          <UIcon :name="section.icon" class="h-5 w-5" />
          {{ section.title }}
        </h3>
        <div class="h-[1px] w-full bg-gray-300 dark:bg-gray-700"></div>
      </div>

      <!-- Grille de stats -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
        <div
          v-for="stat in section.stats"
          :key="stat.label"
          class="rounded-2xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 md:p-4"
        >
          <p
            class="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            <UIcon :name="stat.icon" class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate">{{ stat.label }}</span>
          </p>
          <p
            class="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white sm:text-xl md:text-2xl"
          >
            {{ stat.value }}
          </p>
        </div>
      </div>
    </div>
  </template>
</template>
