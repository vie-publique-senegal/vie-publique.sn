<script setup lang="ts">
import type { Coalition } from '~~/types/coalition';

interface Props {
  coalitions: Coalition[];
  loading?: boolean;
  electionDateRound2?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  electionDateRound2: null,
});

// Filtrer uniquement les coalitions du second tour
const round2Coalitions = computed(() => {
  return props.coalitions
    .filter(c => (c.round_2_voix != null && c.round_2_voix > 0) || (c.round_2_pourcentage != null && c.round_2_pourcentage > 0))
    .sort((a, b) => (b.round_2_voix || 0) - (a.round_2_voix || 0));
});

const hasRound2Data = computed(() => round2Coalitions.value.length > 0);

const formattedDate = computed(() => {
  if (!props.electionDateRound2) return null;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(props.electionDateRound2));
});

const formatVoix = (v: number | null | undefined) =>
  v != null ? new Intl.NumberFormat('fr-FR').format(v) : '-';

const formatPct = (v: number | null | undefined) =>
  v != null ? `${Number(v).toFixed(2)} %` : '-';
</script>

<template>
  <div class="space-y-4">
    <!-- En-tête Second Tour -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div class="flex items-center gap-2">
        <div class="h-1.5 w-6 rounded-full bg-amber-500"></div>
        <h3 class="text-lg font-black uppercase tracking-tighter text-gray-900 dark:text-white">
          Second Tour
        </h3>
        <UBadge color="amber" variant="subtle" size="xs" class="uppercase font-bold tracking-widest">
          Tour 2
        </UBadge>
      </div>
      <span v-if="formattedDate" class="text-sm text-gray-500 dark:text-gray-400">
        {{ formattedDate }}
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <USkeleton v-for="i in 2" :key="i" class="h-20 w-full rounded-xl" />
    </div>

    <!-- Aucune donnée -->
    <div v-else-if="!hasRound2Data" class="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
      <UIcon name="i-heroicons-clock" class="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
      <p class="text-sm font-medium text-gray-400">Résultats du second tour non disponibles</p>
    </div>

    <!-- Liste des candidats du second tour -->
    <div v-else class="space-y-2">
      <div
        v-for="(coalition, index) in round2Coalitions"
        :key="coalition.id"
        class="flex items-center gap-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-4 transition-colors"
      >
        <!-- Rang -->
        <div class="flex-shrink-0 w-7 text-center">
          <span
            :class="[
              'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-black',
              index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            ]"
          >
            {{ index + 1 }}
          </span>
        </div>

        <!-- Photo candidat -->
        <div class="flex-shrink-0">
          <UAvatar
            v-if="coalition.head_of_list?.photo"
            :src="useCmsImage(coalition.head_of_list.photo)"
            :alt="`${coalition.head_of_list.first_name} ${coalition.head_of_list.last_name}`"
            size="md"
            :ui="{ rounded: 'rounded-full' }"
            class="bg-gray-100 dark:bg-gray-800 ring-2 ring-amber-400/30"
          />
          <UAvatar
            v-else-if="coalition.logo"
            :src="useCmsImage(coalition.logo)"
            :alt="coalition.name"
            size="md"
            :ui="{ rounded: 'rounded-lg' }"
            class="bg-gray-100 dark:bg-gray-800"
          />
          <div v-else class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <UIcon name="i-heroicons-user" class="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <!-- Nom candidat + coalition -->
        <div class="min-w-0 flex-1">
          <h4 v-if="coalition.head_of_list" class="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
            {{ coalition.head_of_list.first_name }} {{ coalition.head_of_list.last_name }}
          </h4>
          <h4 v-else class="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate italic opacity-60">
            Candidat non renseigné
          </h4>
          <p class="text-xs text-gray-500 truncate">{{ coalition.name }}</p>
        </div>

        <!-- Résultats -->
        <div class="flex-shrink-0 text-right">
          <div class="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
            {{ formatVoix(coalition.round_2_voix) }}
          </div>
          <div class="text-[10px] font-medium tabular-nums" :class="index === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'">
            {{ formatPct(coalition.round_2_pourcentage) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
