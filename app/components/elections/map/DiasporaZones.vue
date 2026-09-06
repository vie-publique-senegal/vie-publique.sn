<script setup lang="ts">
/**
 * Diaspora structurée par les 8 zones électorales officielles (circonscriptions
 * de l'étranger du référentiel), avec drill-down zone → pays → page pays.
 * Remplace la liste plate des pays sur la page carte électorale.
 */
interface Props {
  electionId?: string | number | null;
  electoralFileId?: string | number | null;
}

const props = withDefaults(defineProps<Props>(), {
  electionId: null,
  electoralFileId: null,
});

interface ZoneStat {
  id: number;
  name: string | null;
  slug: string | null;
  seats: number | null;
  voters: number;
  offices: number;
  places: number;
  countries: number;
  localities: number;
}

interface CountryStat {
  country: string;
  count?: Record<string, string>;
  sum?: Record<string, string>;
  countDistinct?: Record<string, string>;
}

const sourceParams = computed(() => {
  const params: Record<string, string> = {};
  if (props.electoralFileId) params.electoral_file = String(props.electoralFileId);
  else if (props.electionId) params.election = String(props.electionId);
  return params;
});

const {
  data: zonesData,
  status: zonesStatus,
  error: zonesError,
} = useAsyncData(
  computed(() => `diaspora-zones-${props.electoralFileId ?? props.electionId ?? 'all'}`),
  () =>
    $fetch<{ zones: ZoneStat[] }>('/api/elections/diaspora/zones', { params: sourceParams.value }),
  { watch: [sourceParams], default: () => ({ zones: [] }) },
);

const zones = computed(() => zonesData.value?.zones || []);

// Zone sélectionnée (null = tous les pays)
const selectedZone = ref<ZoneStat | null>(null);

const countryParams = computed(() => ({
  ...sourceParams.value,
  ...(selectedZone.value?.slug ? { zone: selectedZone.value.slug } : {}),
}));

const { data: countriesData, status: countriesStatus } = useAsyncData(
  computed(
    () =>
      `diaspora-zone-countries-${props.electoralFileId ?? props.electionId ?? 'all'}-${selectedZone.value?.slug ?? 'all'}`,
  ),
  () =>
    $fetch<{ countries: CountryStat[] }>('/api/elections/diaspora/countries', {
      params: countryParams.value,
    }),
  { watch: [countryParams], default: () => ({ countries: [] }) },
);

const searchQuery = ref('');

const countryRows = computed(() => {
  let rows = (countriesData.value?.countries || []).map((c) => ({
    country: c.country,
    voters: parseInt(c.sum?.voters || '0'),
    offices: parseInt(c.count?.office_number || '0'),
    places: parseInt(c.countDistinct?.polling_place || '0'),
  }));
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    rows = rows.filter((r) => r.country.toLowerCase().includes(q));
  }
  return rows.sort((a, b) => b.voters - a.voters);
});

const columns = [
  { key: 'country', label: 'Pays', sortable: true },
  { key: 'voters', label: 'Électeurs', sortable: true },
  { key: 'offices', label: 'Bureaux de vote', sortable: true },
  { key: 'places', label: 'Lieux de vote', sortable: true },
];

const router = useRouter();
const route = useRoute();

const handleCountryClick = (row: { country: string }) => {
  // Contexte de navigation : la révision consultée, sinon l'élection
  const query: Record<string, string> = {};
  if (route.query.revision) query.revision = String(route.query.revision);
  else if (props.electionId) query.election = String(props.electionId);
  router.push({
    path: `/elections-senegal/carte-electorale/diaspora/${row.country}`,
    query,
  });
};

const selectZone = (zone: ZoneStat) => {
  selectedZone.value = selectedZone.value?.id === zone.id ? null : zone;
};

const formatNumber = (value?: number | null) => {
  if (value === undefined || value === null) return 'N/A';
  return value.toLocaleString('fr-FR');
};
</script>

<template>
  <div class="space-y-6">
    <!-- Grille des zones officielles -->
    <div v-if="zones.length > 0">
      <h2 class="mb-3 text-lg font-bold dark:text-white">
        Les {{ zones.length }} circonscriptions de l'étranger
      </h2>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button
          v-for="zone in zones"
          :key="zone.id"
          type="button"
          class="rounded-xl border p-4 text-left transition-all"
          :class="
            selectedZone?.id === zone.id
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 ring-primary-500 ring-1'
              : 'hover:border-primary-300 border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
          "
          @click="selectZone(zone)"
        >
          <div class="mb-2 text-sm font-bold dark:text-white">{{ zone.name }}</div>
          <div class="space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
            <div>
              Électeurs :
              <span class="font-semibold text-gray-800 dark:text-gray-200">{{
                formatNumber(zone.voters)
              }}</span>
            </div>
            <div>
              Bureaux :
              <span class="font-semibold text-gray-800 dark:text-gray-200">{{
                formatNumber(zone.offices)
              }}</span>
              · Pays :
              <span class="font-semibold text-gray-800 dark:text-gray-200">{{
                zone.countries
              }}</span>
            </div>
            <div v-if="zone.seats">
              Sièges :
              <span class="font-semibold text-gray-800 dark:text-gray-200">{{ zone.seats }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>
    <div
      v-else-if="zonesStatus === 'pending' || zonesStatus === 'idle'"
      class="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      <USkeleton v-for="i in 8" :key="i" class="h-28 w-full rounded-xl" />
    </div>
    <div
      v-else-if="zonesStatus === 'error'"
      class="flex flex-col items-center justify-center py-8 text-center"
    >
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="mb-2 h-10 w-10 text-gray-300 dark:text-gray-600"
      />
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Les zones de la diaspora n'ont pas pu être chargées.
        <span class="mt-1 block text-xs text-gray-400 dark:text-gray-500">{{
          zonesError?.message
        }}</span>
      </p>
    </div>
    <div v-else class="py-2 text-sm text-gray-500 dark:text-gray-400">
      Aucune donnée de zone disponible pour cette révision.
    </div>

    <!-- Tableau des pays (zone sélectionnée ou toutes) -->
    <UCard>
      <template #header>
        <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 class="text-xl font-bold">
            {{ selectedZone ? `Pays - ${selectedZone.name}` : 'Tous les pays de la diaspora' }}
            <UButton
              v-if="selectedZone"
              size="2xs"
              color="gray"
              variant="soft"
              class="ml-2 align-middle"
              icon="i-heroicons-x-mark"
              @click="selectedZone = null"
            >
              Réinitialiser
            </UButton>
          </h2>
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Rechercher un pays..."
            class="sm:max-w-sm"
          />
        </div>
      </template>

      <div class="overflow-x-auto">
        <UTable
          :rows="countryRows"
          :columns="columns"
          :loading="countriesStatus === 'pending' || countriesStatus === 'idle'"
          :empty-state="{
            icon: 'i-heroicons-globe-europe-africa',
            label: 'Aucun pays trouvé',
          }"
          class="cursor-pointer"
          @select="handleCountryClick"
        >
          <template #voters-data="{ row }">
            {{ formatNumber(row.voters) }}
          </template>
        </UTable>
      </div>
    </UCard>
  </div>
</template>
