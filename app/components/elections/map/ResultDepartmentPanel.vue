<script setup lang="ts">
import type { TableResultItem } from '~/composables/useElectionMapJsonResult';

interface DepartmentInfo {
  departement: string;
  region: string;
  municipalityCount: number;
  totalVoters: number;
  communes?: TableResultItem[]; // Communes passées directement
}

interface Props {
  department: DepartmentInfo | null;
  isOpen: boolean;
  /** Résultats de toutes les communes (pré-chargés par le parent) */
  allResults: TableResultItem[];
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

// Normaliser un nom de département (retirer accents, lowercase, trim)
function normalizeDeptName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Retirer les accents
    .toLowerCase()
    .trim();
}

// Détection responsive
const isMobile = ref(false);

onMounted(() => {
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 1024;
  };
  checkMobile();
  window.addEventListener('resize', checkMobile);
  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile);
  });
});

// Recherche
const searchQuery = ref('');

watch(
  () => props.department,
  () => {
    searchQuery.value = '';
  },
);

// Communes de ce département filtrées
const departmentResults = computed(() => {
  if (!props.department) return [];

  // 1. Si les communes sont passées directement via department.communes
  if (props.department.communes?.length) {
    return props.department.communes;
  }

  // 2. Fallback: filtrer allResults par département (avec normalisation)
  if (!props.allResults?.length) return [];

  const deptKey = normalizeDeptName(props.department.departement);

  // Les résultats ont un champ `departement` — filtrer par département
  const byDept = props.allResults.filter(
    (r) => r.departement && normalizeDeptName(r.departement) === deptKey,
  );

  return byDept;
});

const filteredResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return departmentResults.value;
  return departmentResults.value.filter(
    (r) =>
      r.commune.toLowerCase().includes(q) ||
      r.coalition.toLowerCase().includes(q) ||
      r.headOfList.toLowerCase().includes(q),
  );
});

// Top 3 communes par votes
const topCommunes = computed(() => {
  return [...departmentResults.value].sort((a, b) => b.votes - a.votes).slice(0, 3);
});

const formatNumber = (value?: number) => {
  if (value === undefined || value === null) return 'N/A';
  return value.toLocaleString('fr-FR');
};

const medalEmoji = (index: number) => ['🥇', '🥈', '🥉'][index] || '';
</script>

<template>
  <!-- Backdrop mobile -->
  <Transition name="fade">
    <div
      v-if="isOpen && isMobile"
      class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      @click="emit('close')"
    />
  </Transition>

  <!-- Panel -->
  <Transition :name="isMobile ? 'slide-up' : 'slide-right'">
    <aside
      v-if="isOpen && department"
      :class="[
        isMobile
          ? 'fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] rounded-t-2xl'
          : 'fixed right-4 z-50 w-[400px] rounded-2xl',
        'flex flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-900',
        'border border-gray-200 dark:border-gray-700',
      ]"
      :style="!isMobile ? { top: '80px', bottom: '16px' } : {}"
    >
      <!-- Drag handle mobile -->
      <div v-if="isMobile" class="flex shrink-0 justify-center pb-1 pt-2">
        <div class="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      <!-- Header -->
      <div
        class="shrink-0 border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
      >
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">
              {{ department.departement }}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Région {{ department.region }} · Résultats
            </p>
          </div>
          <button
            class="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Fermer"
            @click="emit('close')"
          >
            <UIcon name="i-heroicons-x-mark" class="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <!-- Recherche -->
        <div v-if="departmentResults.length > 0" class="relative">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            :placeholder="`Rechercher parmi ${departmentResults.length} communes...`"
            size="sm"
            class="w-full"
            :ui="{ icon: { trailing: { pointer: '' } } }"
          >
            <template v-if="searchQuery" #trailing>
              <button class="flex items-center" @click="searchQuery = ''">
                <UIcon
                  name="i-heroicons-x-circle"
                  class="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                />
              </button>
            </template>
          </UInput>
        </div>
      </div>

      <!-- Contenu scrollable -->
      <div :class="['flex-1 overflow-y-auto', isMobile ? 'pb-20' : '']">
        <!-- Résumé stats -->
        <div class="grid grid-cols-2 gap-2 p-4">
          <div class="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800">
            <div
              class="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              Communes
            </div>
            <div class="mt-0.5 text-lg font-black tabular-nums text-green-700 dark:text-green-400">
              {{ departmentResults.length }}
            </div>
          </div>
          <div class="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800">
            <div
              class="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              Total voix
            </div>
            <div class="mt-0.5 text-lg font-black tabular-nums text-green-700 dark:text-green-400">
              {{ formatNumber(departmentResults.reduce((sum, r) => sum + r.votes, 0)) }}
            </div>
          </div>
        </div>

        <!-- Top 3 communes par votes -->
        <div v-if="topCommunes.length > 0 && !searchQuery" class="px-4 pb-3">
          <h3
            class="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
          >
            Top 3 communes par nombre de voix
          </h3>
          <div class="space-y-1.5">
            <div
              v-for="(item, index) in topCommunes"
              :key="item.id"
              class="rounded-xl p-3 ring-1"
              :class="[
                index === 0
                  ? 'bg-gradient-to-r from-yellow-50 to-amber-50 ring-yellow-200 dark:from-yellow-900/20 dark:to-amber-900/20 dark:ring-yellow-800/40'
                  : index === 1
                    ? 'bg-gradient-to-r from-gray-50 to-slate-50 ring-gray-200 dark:from-gray-800 dark:to-slate-800 dark:ring-gray-700'
                    : 'bg-gradient-to-r from-orange-50 to-amber-50 ring-orange-200 dark:from-orange-900/20 dark:to-amber-900/20 dark:ring-orange-800/40',
              ]"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-base">{{ medalEmoji(index) }}</span>
                  <span class="text-sm font-bold text-gray-900 dark:text-white">
                    {{ item.commune }}
                  </span>
                </div>
                <span class="text-sm font-black tabular-nums text-green-700 dark:text-green-400">
                  {{ formatNumber(item.votes) }} voix
                </span>
              </div>
              <div class="mt-1.5 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <UIcon name="i-heroicons-trophy" class="h-3.5 w-3.5 text-amber-500" />
                <span class="font-semibold">{{ item.coalition }}</span>
                <span class="text-gray-400 dark:text-gray-600">·</span>
                <span>{{ item.headOfList }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Séparateur -->
        <div
          v-if="departmentResults.length > 0"
          class="mx-4 border-t border-gray-100 dark:border-gray-800"
        />

        <!-- Liste des communes -->
        <div v-if="departmentResults.length > 0" class="px-4 py-3">
          <h3
            class="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
          >
            {{
              searchQuery
                ? `Résultats (${filteredResults.length})`
                : `Toutes les communes (${departmentResults.length})`
            }}
          </h3>

          <!-- État vide recherche -->
          <div v-if="searchQuery && filteredResults.length === 0" class="py-6 text-center">
            <UIcon
              name="i-heroicons-magnifying-glass"
              class="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600"
            />
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Aucune commune trouvée pour « {{ searchQuery }} »
            </p>
          </div>

          <!-- Liste -->
          <div v-else class="scrollbar-thin max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
            <div
              v-for="item in filteredResults"
              :key="item.id"
              class="rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              <div class="flex items-center justify-between">
                <span class="mr-2 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {{ item.commune }}
                </span>
                <span
                  class="shrink-0 text-xs font-black tabular-nums text-green-700 dark:text-green-400"
                >
                  {{ formatNumber(item.votes) }} voix
                </span>
              </div>
              <div class="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <UIcon name="i-heroicons-trophy" class="h-3 w-3 shrink-0 text-amber-500" />
                <span class="truncate font-medium">{{ item.coalition }}</span>
                <span class="shrink-0 text-gray-300 dark:text-gray-600">·</span>
                <span class="truncate">{{ item.headOfList }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- État vide : aucune donnée -->
        <div v-if="departmentResults.length === 0" class="px-4 py-10 text-center">
          <UIcon
            name="i-heroicons-chart-bar"
            class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600"
          />
          <h3 class="mb-1 text-sm font-bold text-gray-500 dark:text-gray-400">
            Aucun résultat disponible
          </h3>
          <p class="text-xs text-gray-400 dark:text-gray-500">
            Les résultats pour ce département ne sont pas encore publiés.
          </p>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-right-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}
.dark .scrollbar-thin::-webkit-scrollbar-thumb {
  background: #4b5563;
}
</style>
