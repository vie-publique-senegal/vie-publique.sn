<script setup lang="ts">
// Chiffres du dernier exercice budgétaire publié — aucune année, aucun montant
// écrit en dur : tout vient du CMS via `useBudgetLatest`. Un nouvel exercice
// publié (PLF, puis LFI votée) s'affiche sans retoucher ce composant.
const { year, version, stats } = useBudgetLatest();

// Un seul titre, qui porte DÉJÀ le statut : « Projet de budget 2027 » dit que le
// texte n'est pas voté. L'ancienne version empilait titre + badge « Projet de loi
// de finances · En examen au Parlement », ce qui alourdissait pour redire la même
// chose. Le statut complet reste sur /budget-senegal.
const heading = computed(() => {
  if (!year.value) return 'Budget du Sénégal';
  return version.value?.isDraft
    ? `Projet de budget ${year.value}`
    : `Budget ${year.value} du Sénégal`;
});

// ⚠️ Classes en toutes lettres : l'extracteur Tailwind ne voit pas les couleurs
// construites dynamiquement. (C'est ce piège qui avait donné un badge
// « Dépenses » cerclé de BLEU : sans classe littérale, Tailwind retombait sur
// `--tw-ring-color` par défaut.)
//
// La couleur se limite au filet latéral et au libellé. Plus de dégradé de fond
// ni d'opacité en dark (`dark:from-<x>-950/50` rendait un aplat délavé).
const TUILE: Record<string, { surface: string; label: string }> = {
  expense_total: {
    surface: 'bg-orange-50',
    label: 'text-orange-700 dark:text-orange-300',
  },
  revenue_total: {
    surface: 'bg-emerald-50',
    label: 'text-emerald-700 dark:text-emerald-300',
  },
  deficit_total: {
    surface: 'bg-rose-50',
    label: 'text-rose-700 dark:text-rose-300',
  },
};

const tuile = (code: string) =>
  TUILE[code] || {
    surface: 'bg-gray-50',
    label: 'text-gray-600 dark:text-gray-300',
  };
</script>

<template>
  <div class="my-4">
    <UCard
      class="overflow-hidden border-0 bg-white ring-1 ring-gray-200 transition-shadow hover:shadow-sm dark:bg-gray-800 dark:ring-gray-700"
      :ui="{ body: { padding: 'p-4 sm:p-6' } }"
    >
      <!-- Header -->
      <div class="mb-4 flex items-start justify-between gap-3 sm:mb-5">
        <div class="flex min-w-0 items-start gap-2">
          <div
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700"
          >
            <UIcon name="i-heroicons-chart-pie" class="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
              {{ heading }}
            </h3>
          </div>
        </div>
        <NuxtLink
          to="/budget-senegal/dashboard"
          class="group hidden shrink-0 items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 sm:inline-flex"
        >
          Explorer
          <UIcon
            name="i-heroicons-arrow-right"
            class="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          />
        </NuxtLink>
      </div>

      <!-- Chiffres : fond légèrement teinté et libellé coloré pour distinguer la
           catégorie, sans filet ni autre ornement. En dark la surface reste celle
           du site, la couleur ne passe que par le libellé. -->
      <div v-if="stats.length" class="grid grid-cols-3 gap-2 sm:gap-4">
        <div
          v-for="stat in stats"
          :key="stat.code"
          class="rounded-xl p-3 dark:bg-gray-700 sm:p-4"
          :class="tuile(stat.code).surface"
        >
          <div>
            <p class="text-xs font-medium sm:text-sm" :class="tuile(stat.code).label">
              {{ stat.label }}
            </p>
            <p
              class="mt-1 text-lg font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl"
            >
              {{ stat.formattedValue }}
            </p>
            <p
              class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-gray-500 dark:text-gray-300 sm:text-xs"
            >
              <span>Md FCFA</span>
              <BudgetVariationBadge :value="stat.change" size="xs" />
            </p>
          </div>
        </div>
      </div>

      <!-- Mobile CTA -->
      <NuxtLink
        to="/budget-senegal/dashboard"
        class="bg-primary-50 mt-3 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700 sm:hidden"
      >
        Voir le tableau de bord
        <UIcon name="i-heroicons-arrow-right" class="h-4 w-4" />
      </NuxtLink>
    </UCard>
  </div>
</template>
