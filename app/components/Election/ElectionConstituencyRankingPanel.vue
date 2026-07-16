<script setup lang="ts">
/**
 * Classement complet des coalitions pour une circonscription (popup carte
 * résultats = gagnant seul ; ce panneau = classement entier). Charge
 * l'endpoint dédié à l'ouverture, pas de préchargement pour toutes les
 * circonscriptions.
 */
interface RankingCoalition {
  id?: number | null;
  slug?: string | null;
  name?: string | null;
  acronym?: string | null;
  color?: string | null;
  logo?: string | null;
}

interface RankingItem {
  coalition: RankingCoalition;
  votes: number | null;
  percentage: number | null;
}

interface RankingResponse {
  constituency: { slug: string | null; name: string | null };
  round1: RankingItem[];
  round2: RankingItem[] | null;
}

interface Props {
  constituency: { slug: string; name: string } | null;
  isOpen: boolean;
  electionId?: string | number | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

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

const ranking = ref<RankingResponse | null>(null);
const loading = ref(false);
const errored = ref(false);

watch(
  () => [props.isOpen, props.constituency?.slug, props.electionId] as const,
  async ([open, slug, electionId]) => {
    if (!open || !slug || !electionId) return;
    loading.value = true;
    errored.value = false;
    ranking.value = null;
    try {
      ranking.value = await $fetch<RankingResponse>(`/api/elections/results/constituency/${slug}`, {
        params: { election: String(electionId) },
      });
    } catch {
      errored.value = true;
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

const formatNumber = (value: number | null) =>
  value === null || value === undefined ? 'N/A' : value.toLocaleString('fr-FR');

const formatPercentage = (value: number | null) =>
  value === null || value === undefined ? 'N/A' : `${value.toFixed(1)}%`;

const medalEmoji = (index: number) => ['🥇', '🥈', '🥉'][index] || '';

const coalitionLabel = (coalition: RankingCoalition) => coalition?.name || coalition?.acronym || 'Coalition';
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
      v-if="isOpen && constituency"
      :class="[
        isMobile
          ? 'fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] rounded-t-2xl'
          : 'fixed right-4 z-50 w-[400px] rounded-2xl',
        'bg-white dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col',
        'border border-gray-200 dark:border-gray-700',
      ]"
      :style="!isMobile ? { top: '80px', bottom: '16px' } : {}"
    >
      <!-- Drag handle mobile -->
      <div v-if="isMobile" class="flex justify-center pt-2 pb-1 shrink-0">
        <div class="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      <!-- Header -->
      <div class="shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">
              {{ constituency.name }}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Classement des coalitions</p>
          </div>
          <button
            class="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Fermer"
            @click="emit('close')"
          >
            <UIcon name="i-heroicons-x-mark" class="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <!-- Contenu scrollable -->
      <div :class="['flex-1 overflow-y-auto', isMobile ? 'pb-20' : '']">
        <!-- Chargement -->
        <div v-if="loading" class="space-y-2 p-4">
          <USkeleton v-for="i in 4" :key="i" class="h-14 w-full rounded-xl" />
        </div>

        <!-- Erreur -->
        <div v-else-if="errored" class="py-10 text-center px-4">
          <UIcon name="i-heroicons-exclamation-triangle" class="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 class="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Erreur de chargement</h3>
          <p class="text-xs text-gray-400 dark:text-gray-500">Le classement n'a pas pu être récupéré.</p>
        </div>

        <!-- État vide : aucune donnée saisie -->
        <div v-else-if="ranking && ranking.round1.length === 0" class="py-10 text-center px-4">
          <UIcon name="i-heroicons-chart-bar" class="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 class="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
            Classement pas encore disponible
          </h3>
          <p class="text-xs text-gray-400 dark:text-gray-500">
            Le détail par coalition n'a pas encore été saisi pour cette circonscription.
          </p>
        </div>

        <!-- Classement -->
        <template v-else-if="ranking">
          <div class="px-4 py-3">
            <h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              1er tour
            </h3>
            <div class="space-y-1.5">
              <div
                v-for="(item, index) in ranking.round1"
                :key="item.coalition.id ?? index"
                class="rounded-xl p-3 ring-1"
                :class="[
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 ring-yellow-200 dark:ring-yellow-800/40'
                    : 'bg-gray-50 dark:bg-gray-800 ring-gray-100 dark:ring-gray-700',
                ]"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <span v-if="index < 3" class="text-base shrink-0">{{ medalEmoji(index) }}</span>
                    <span v-else class="text-xs font-bold text-gray-400 shrink-0 w-4 text-center">{{ index + 1 }}</span>
                    <span
                      class="h-2.5 w-2.5 rounded-full shrink-0"
                      :style="{ backgroundColor: item.coalition.color || '#94a3b8' }"
                    />
                    <span class="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {{ coalitionLabel(item.coalition) }}
                    </span>
                  </div>
                  <span class="text-sm font-black tabular-nums text-green-700 dark:text-green-400 shrink-0">
                    {{ formatNumber(item.votes) }}
                  </span>
                </div>
                <div class="mt-1 pl-6 text-xs text-gray-500 dark:text-gray-400">
                  {{ formatPercentage(item.percentage) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Second tour -->
          <div v-if="ranking.round2 && ranking.round2.length > 0" class="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800">
            <h3 class="mb-2 mt-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              2d tour
            </h3>
            <div class="space-y-1.5">
              <div
                v-for="(item, index) in ranking.round2"
                :key="item.coalition.id ?? index"
                class="rounded-xl p-3 ring-1"
                :class="[
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 ring-yellow-200 dark:ring-yellow-800/40'
                    : 'bg-gray-50 dark:bg-gray-800 ring-gray-100 dark:ring-gray-700',
                ]"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <span v-if="index < 3" class="text-base shrink-0">{{ medalEmoji(index) }}</span>
                    <span v-else class="text-xs font-bold text-gray-400 shrink-0 w-4 text-center">{{ index + 1 }}</span>
                    <span
                      class="h-2.5 w-2.5 rounded-full shrink-0"
                      :style="{ backgroundColor: item.coalition.color || '#94a3b8' }"
                    />
                    <span class="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {{ coalitionLabel(item.coalition) }}
                    </span>
                  </div>
                  <span class="text-sm font-black tabular-nums text-green-700 dark:text-green-400 shrink-0">
                    {{ formatNumber(item.votes) }}
                  </span>
                </div>
                <div class="mt-1 pl-6 text-xs text-gray-500 dark:text-gray-400">
                  {{ formatPercentage(item.percentage) }}
                </div>
              </div>
            </div>
          </div>
        </template>
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
</style>
