<template>
  <div class="space-y-6">
    <!-- Header avec actions -->
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">
          Procès-Verbaux
          <span v-if="total" class="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            ({{ total }})
          </span>
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          PVs soumis par nos observateurs électoraux
        </p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Bouton Upload (si authentifié et élection active) -->
        <template v-if="isAuthenticated">
          <UButton
            v-if="activeElection"
            size="sm"
            color="primary"
            icon="i-heroicons-arrow-up-tray"
            class="font-bold"
            @click="showUploadModal = true"
          >
            <span class="hidden sm:inline">Uploader un PV</span>
            <span class="sm:hidden">Upload</span>
          </UButton>
          <UButton
            size="sm"
            color="gray"
            variant="ghost"
            icon="i-heroicons-arrow-right-on-rectangle"
            @click="handleLogout"
          >
            <span class="max-w-[100px] truncate text-xs">{{ displayName }}</span>
          </UButton>
        </template>

        <!-- Bouton Connexion (si non authentifié) -->
        <UButton
          v-else
          size="sm"
          color="gray"
          variant="soft"
          icon="i-heroicons-lock-closed"
          class="font-bold"
          @click="showLoginModal = true"
        >
          Connexion
        </UButton>
      </div>
    </div>

    <!-- Filtres -->
    <div class="flex flex-wrap gap-3">
      <!-- Source -->
      <div v-if="availableFilters.sources.length > 0" class="relative min-w-[140px]">
        <select
          :value="filters.source || ''"
          class="focus:ring-primary/40 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          @change="handleSourceChange"
        >
          <option value="">Toutes les sources</option>
          <option v-for="source in availableFilters.sources" :key="source" :value="source">
            {{ source === 'national' ? 'National' : 'Diaspora' }}
          </option>
        </select>
        <UIcon
          name="i-heroicons-chevron-down"
          class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
        />
      </div>

      <!-- Tour -->
      <div v-if="availableFilters.tours.length > 0" class="relative min-w-[120px]">
        <select
          :value="filters.tour || ''"
          class="focus:ring-primary/40 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          @change="(e) => setFilter('tour', (e.target as HTMLSelectElement).value || undefined)"
        >
          <option value="">Tous les tours</option>
          <option v-for="tour in availableFilters.tours" :key="tour" :value="tour">
            {{ tour === '1' ? '1er tour' : '2ème tour' }}
          </option>
        </select>
        <UIcon
          name="i-heroicons-chevron-down"
          class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
        />
      </div>

      <!-- Filtres conditionnels National -->
      <template v-if="filters.source === 'national'">
        <!-- Région -->
        <div v-if="availableFilters.national.regions.length > 0" class="relative min-w-[140px]">
          <select
            :value="filters.region || ''"
            class="focus:ring-primary/40 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            @change="(e) => setFilter('region', (e.target as HTMLSelectElement).value || undefined)"
          >
            <option value="">Toutes les régions</option>
            <option v-for="region in availableFilters.national.regions" :key="region" :value="region">
              {{ region }}
            </option>
          </select>
          <UIcon
            name="i-heroicons-chevron-down"
            class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
          />
        </div>

        <!-- Département -->
        <div v-if="availableFilters.national.departments.length > 0" class="relative min-w-[140px]">
          <select
            :value="filters.department || ''"
            class="focus:ring-primary/40 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            @change="(e) => setFilter('department', (e.target as HTMLSelectElement).value || undefined)"
          >
            <option value="">Tous les départements</option>
            <option v-for="dept in availableFilters.national.departments" :key="dept" :value="dept">
              {{ dept }}
            </option>
          </select>
          <UIcon
            name="i-heroicons-chevron-down"
            class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
          />
        </div>

        <!-- Commune -->
        <div v-if="availableFilters.national.municipalities.length > 0" class="relative min-w-[140px]">
          <select
            :value="filters.municipality || ''"
            class="focus:ring-primary/40 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            @change="(e) => setFilter('municipality', (e.target as HTMLSelectElement).value || undefined)"
          >
            <option value="">Toutes les communes</option>
            <option v-for="mun in availableFilters.national.municipalities" :key="mun" :value="mun">
              {{ mun }}
            </option>
          </select>
          <UIcon
            name="i-heroicons-chevron-down"
            class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
          />
        </div>
      </template>

      <!-- Filtres conditionnels Diaspora -->
      <template v-if="filters.source === 'diaspora'">
        <!-- Pays -->
        <div v-if="availableFilters.diaspora.countries.length > 0" class="relative min-w-[140px]">
          <select
            :value="filters.country || ''"
            class="focus:ring-primary/40 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            @change="(e) => setFilter('country', (e.target as HTMLSelectElement).value || undefined)"
          >
            <option value="">Tous les pays</option>
            <option v-for="country in availableFilters.diaspora.countries" :key="country" :value="country">
              {{ country }}
            </option>
          </select>
          <UIcon
            name="i-heroicons-chevron-down"
            class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
          />
        </div>

        <!-- Représentation diplomatique -->
        <div v-if="availableFilters.diaspora.diplomaticRepresentations.length > 0" class="relative min-w-[180px]">
          <select
            :value="filters.diplomatic_representation || ''"
            class="focus:ring-primary/40 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            @change="(e) => setFilter('diplomatic_representation', (e.target as HTMLSelectElement).value || undefined)"
          >
            <option value="">Toutes les représentations</option>
            <option v-for="rep in availableFilters.diaspora.diplomaticRepresentations" :key="rep" :value="rep">
              {{ rep }}
            </option>
          </select>
          <UIcon
            name="i-heroicons-chevron-down"
            class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
          />
        </div>
      </template>

      <!-- Reset filtres -->
      <UButton
        v-if="hasActiveFilters"
        size="sm"
        color="gray"
        variant="ghost"
        icon="i-heroicons-x-mark"
        @click="handleClearFilters"
      >
        Réinitialiser
      </UButton>
    </div>

    <!-- État de chargement -->
    <div
      v-if="loading && pvs.length === 0"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <USkeleton v-for="i in 6" :key="i" class="h-64" />
    </div>

    <!-- État vide -->
    <div
      v-else-if="!loading && pvs.length === 0"
      class="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-800/50"
    >
      <UIcon
        name="i-heroicons-document-magnifying-glass"
        class="mx-auto mb-4 h-12 w-12 text-gray-300"
      />
      <p class="font-bold text-gray-500 dark:text-gray-400">
        {{
          hasActiveFilters ? 'Aucun PV ne correspond aux filtres' : "Aucun PV n'a encore été publié"
        }}
      </p>
      <p v-if="!hasActiveFilters" class="mt-2 text-xs text-gray-400">
        Les PVs soumis apparaîtront ici après validation par notre équipe
      </p>
    </div>

    <!-- Grille de PVs -->
    <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="pv in pvs"
        :key="pv.id"
        class="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
        @click="openPvModal(pv)"
      >
        <!-- Image -->
        <div class="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-700">
          <CmsImage
            v-if="pv.image?.id"
            :src="pv.image.id"
            :alt="`PV ${pv.bureau}`"
            :quality="60"
            :width="400"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div
            v-else
            class="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700"
          >
            <UIcon
              name="i-heroicons-document-text"
              class="h-12 w-12 text-gray-300 dark:text-gray-500"
            />
          </div>

          <!-- Badge source -->
          <div class="absolute right-2 top-2">
            <span
              class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-lg backdrop-blur-sm"
              :class="
                pv.source === 'diaspora'
                  ? 'bg-emerald-500 text-white dark:bg-emerald-600'
                  : 'bg-blue-600 text-white dark:bg-blue-500'
              "
            >
              <UIcon
                :name="
                  pv.source === 'diaspora' ? 'i-heroicons-globe-europe-africa' : 'i-heroicons-map'
                "
                class="h-3.5 w-3.5"
              />
              {{ pv.source === 'diaspora' ? 'Diaspora' : 'National' }}
            </span>
          </div>
        </div>

        <!-- Infos -->
        <div class="p-4">
          <div class="mb-2 flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <!-- National -->
              <template v-if="pv.source === 'national'">
                <h4 class="truncate font-bold text-gray-900 dark:text-white">
                  {{ pv.department }}
                </h4>
                <p class="truncate text-sm text-gray-600 dark:text-gray-400">
                  {{ pv.municipality }}
                </p>
                <p class="truncate text-xs text-gray-500 dark:text-gray-500">{{ pv.region }}</p>
              </template>
              <!-- Diaspora -->
              <template v-else>
                <h4 class="truncate font-bold text-gray-900 dark:text-white">{{ pv.country }}</h4>
                <p class="truncate text-wrap text-sm text-gray-600 dark:text-gray-400">
                  {{ pv.diplomatic_representation }}
                </p>
                <p v-if="pv.locality" class="truncate text-xs text-gray-500 dark:text-gray-500">
                  {{ pv.locality }}
                </p>
              </template>
            </div>

            <!-- Badge Tour -->
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold shadow-sm"
              :class="
                pv.tour === '2'
                  ? 'bg-amber-500 text-white dark:bg-amber-600'
                  : 'bg-slate-600 text-white dark:bg-slate-500'
              "
            >
              Tour {{ pv.tour }}
            </span>
          </div>

          <!-- Bureau -->
          <div class="mt-3 flex items-center gap-2 text-sm">
            <UIcon name="i-heroicons-building-office-2" class="h-4 w-4 text-gray-400" />
            <span class="font-medium text-gray-700 dark:text-gray-300">{{ pv.bureau }}</span>
          </div>

          <!-- Date -->
          <div class="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <UIcon name="i-heroicons-calendar" class="h-3.5 w-3.5" />
            <time :datetime="pv.date_created">
              {{
                new Date(pv.date_created).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              }}
            </time>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-8 flex justify-center">
      <UPagination
        v-model="currentPage"
        :total="total"
        :page-count="12"
        size="sm"
        :ui="{
          wrapper: 'flex items-center gap-1',
          rounded: 'rounded-lg',
        }"
      />
    </div>

    <!-- Modaux -->
    <ElectionsDashboardModalsPvLoginModal v-model="showLoginModal" @success="onLoginSuccess" />
    <ElectionsDashboardModalsPvUploadModal v-model="showUploadModal" @success="onUploadSuccess" />

    <!-- Modal lightbox PV -->
    <UModal v-model="showPvModal" :ui="{ width: 'sm:max-w-4xl' }">
      <div v-if="selectedPv" class="p-6">
        <div class="mb-4 flex items-start justify-between">
          <div class="flex-1">
            <div class="mb-2 flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-md"
                :class="
                  selectedPv.source === 'diaspora'
                    ? 'bg-emerald-500 text-white dark:bg-emerald-600'
                    : 'bg-blue-600 text-white dark:bg-blue-500'
                "
              >
                <UIcon
                  :name="
                    selectedPv.source === 'diaspora'
                      ? 'i-heroicons-globe-europe-africa'
                      : 'i-heroicons-map'
                  "
                  class="h-3.5 w-3.5"
                />
                {{ selectedPv.source === 'diaspora' ? 'Diaspora' : 'National' }}
              </span>
              <span
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold shadow-sm"
                :class="
                  selectedPv.tour === '2'
                    ? 'bg-amber-500 text-white dark:bg-amber-600'
                    : 'bg-slate-600 text-white dark:bg-slate-500'
                "
              >
                {{ selectedPv.tour }}{{ selectedPv.tour === '1' ? 'er' : 'ème' }} tour
              </span>
            </div>

            <!-- National -->
            <template v-if="selectedPv.source === 'national'">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ selectedPv.department }} › {{ selectedPv.municipality }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ selectedPv.region }}</p>
            </template>
            <!-- Diaspora -->
            <template v-else>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ selectedPv.country }}
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ selectedPv.diplomatic_representation }}
              </p>
              <p v-if="selectedPv.locality" class="text-sm text-gray-500 dark:text-gray-400">
                {{ selectedPv.locality }}
              </p>
            </template>

            <p class="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Bureau: {{ selectedPv.bureau }}
            </p>
          </div>

          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-x-mark"
            square
            @click="showPvModal = false"
          />
        </div>

        <!-- Image -->
        <div class="relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          <!-- Spinner de chargement -->
          <div
            v-if="imageLoading"
            class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800"
          >
            <div class="flex flex-col items-center gap-3">
              <svg
                class="h-12 w-12 animate-spin text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p class="text-sm text-gray-500 dark:text-gray-400">Chargement de l'image...</p>
            </div>
          </div>

          <!-- Image -->
          <CmsImage
            v-if="selectedPv.image?.id"
            :src="selectedPv.image.id"
            :alt="`PV ${selectedPv.bureau}`"
            :class="[
              'h-auto w-full transition-opacity duration-300',
              imageLoading ? 'opacity-0' : 'opacity-100',
            ]"
            loading="eager"
            @load="imageLoading = false"
            @error="imageLoading = false"
          />
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useElectionAuth } from '~/composables/elections/useElectionAuth';
import { useElectionPvsUpload } from '~/composables/elections/useElectionPvsUpload';
import { useElectionPvsFilters } from '~/composables/elections/useElectionPvsFilters';
import { useActiveElection } from '~/composables/elections/useActiveElection';
import type { ElectionPv } from '~/composables/elections/useElectionPvsUpload';

const props = defineProps<{
  election?: { id: number; name: string; year: number; type: string };
}>();

// Auth
const { isAuthenticated, displayName, logout, checkAuth } = useElectionAuth();

// Active election
const { activeElection } = useActiveElection();

// Filtres disponibles (chargés dynamiquement)
const { availableFilters } = useElectionPvsFilters(props.election?.id);

// PVs
const {
  pvs,
  loading,
  total,
  totalPages,
  currentPage,
  filters,
  setFilter,
  clearFilters,
  hasActiveFilters,
  refresh,
} = useElectionPvsUpload({
  election: props.election?.id,
  autoFetch: true,
});

// Modals
const showLoginModal = ref(false);
const showUploadModal = ref(false);
const showPvModal = ref(false);
const selectedPv = ref<ElectionPv | null>(null);

const onLoginSuccess = () => {
  showLoginModal.value = false;
  showUploadModal.value = true;
};

const onUploadSuccess = () => {
  refresh();
};

const handleLogout = async () => {
  await logout();
};

const imageLoading = ref(false);

const openPvModal = (pv: ElectionPv) => {
  selectedPv.value = pv;
  imageLoading.value = true;
  showPvModal.value = true;
};

// Handler pour changement de source (réinitialiser les filtres géographiques)
const handleSourceChange = (e: Event) => {
  const value = (e.target as HTMLSelectElement).value || undefined;
  // Réinitialiser les filtres géographiques
  setFilter('region', undefined);
  setFilter('department', undefined);
  setFilter('municipality', undefined);
  setFilter('country', undefined);
  setFilter('diplomatic_representation', undefined);
  // Appliquer le nouveau filtre de source
  setFilter('source', value);
};

// Handler pour réinitialiser tous les filtres
const handleClearFilters = () => {
  clearFilters();
};

// Check auth on mount
onMounted(() => {
  checkAuth();
});
</script>
