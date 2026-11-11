<script setup lang="ts">
// Chiffres du dernier exercice budgétaire publié — aucune année, aucun montant
// écrit en dur : tout vient du CMS via `useBudgetLatest`. Un nouvel exercice
// publié (PLF, puis LFI votée) s'affiche sans retoucher ce composant.
const { year, version, stats } = useBudgetLatest();

const heading = computed(() =>
  year.value ? `Budget ${year.value} du Sénégal` : 'Budget du Sénégal',
);

// Un PLF est un PROJET en cours d'examen, pas une loi adoptée : afficher
// « Budget 2027 » sans ce statut serait un contresens.
const statusBadge = computed(() => {
  const described = version.value;
  if (!described?.code) return null;
  return described.status ? `${described.label} · ${described.status}` : described.label;
});

/** Couleur de tuile par indicateur (l'ordre d'affichage vient du composable). */
const statColors: Record<string, string> = {
  expense_total: 'orange',
  revenue_total: 'emerald',
  deficit_total: 'rose',
};

const cardStyles: Record<string, string> = {
  orange:
    'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30',
  emerald:
    'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30',
  rose: 'bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/50 dark:to-rose-900/30',
};

const textStyles: Record<string, { label: string; value: string; unit: string }> = {
  orange: {
    label: 'text-orange-700 dark:text-orange-300',
    value: 'text-orange-900 dark:text-orange-100',
    unit: 'text-orange-600/70 dark:text-orange-400/70',
  },
  emerald: {
    label: 'text-emerald-700 dark:text-emerald-300',
    value: 'text-emerald-900 dark:text-emerald-100',
    unit: 'text-emerald-600/70 dark:text-emerald-400/70',
  },
  rose: {
    label: 'text-rose-700 dark:text-rose-300',
    value: 'text-rose-900 dark:text-rose-100',
    unit: 'text-rose-600/70 dark:text-rose-400/70',
  },
};

// ⚠️ Classes écrites en toutes lettres, PAS de `<UBadge :color="...">` dynamique.
// L'extracteur de Nuxt UI v2 ne voit que les couleurs passées en statique
// (`color="green"`) ; avec un `:color` dynamique, les classes de la couleur ne sont
// pas générées. Résultat vécu : l'anneau orange absent du CSS → il retombait
// sur la valeur par défaut de Tailwind (`--tw-ring-color: blue-500/50`) → badge
// « Dépenses » cerclé de BLEU. Alternative globale si besoin ailleurs :
// `ui.safelistColors` dans nuxt.config.ts (au prix de CSS supplémentaire).
const badgeStyles: Record<string, string> = {
  orange:
    'bg-orange-50 text-orange-500 ring-orange-500/25 dark:bg-orange-400/10 dark:text-orange-400 dark:ring-orange-400/25',
  emerald:
    'bg-emerald-50 text-emerald-500 ring-emerald-500/25 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/25',
  rose: 'bg-rose-50 text-rose-500 ring-rose-500/25 dark:bg-rose-400/10 dark:text-rose-400 dark:ring-rose-400/25',
};

const styleKey = (code: string) => statColors[code] || 'emerald';
</script>

<template>
  <div class="my-4">
    <UCard
      class="overflow-hidden border-0 bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800"
      :ui="{ body: { padding: 'p-4 sm:p-6' } }"
    >
      <!-- Header -->
      <div class="mb-4 flex items-start justify-between gap-3 sm:mb-5">
        <div class="flex min-w-0 items-start gap-2">
          <div
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-900/50"
          >
            <UIcon name="i-heroicons-chart-pie" class="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
              {{ heading }}
            </h3>
            <!-- Statut du texte budgétaire : projet en examen vs texte adopté. -->
            <p
              v-if="statusBadge"
              class="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium sm:text-xs"
              :class="
                version?.isDraft
                  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25'
                  : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25'
              "
            >
              <UIcon
                :name="version?.isDraft ? 'i-heroicons-clock' : 'i-heroicons-check-badge'"
                class="h-3.5 w-3.5 shrink-0"
              />
              {{ statusBadge }}
            </p>
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

      <!-- Stats Grid -->
      <div v-if="stats.length" class="grid grid-cols-3 gap-2 sm:gap-4">
        <div
          v-for="stat in stats"
          :key="stat.code"
          class="rounded-xl p-3 transition-transform hover:scale-[1.02] sm:p-4"
          :class="cardStyles[styleKey(stat.code)]"
        >
          <p class="text-xs font-medium sm:text-sm" :class="textStyles[styleKey(stat.code)].label">
            {{ stat.label }}
          </p>
          <div class="mt-1 flex items-baseline gap-1 sm:gap-2">
            <span
              class="text-lg font-bold tracking-tight sm:text-2xl"
              :class="textStyles[styleKey(stat.code)].value"
            >
              {{ stat.formattedValue }}
            </span>
            <span
              v-if="stat.change"
              class="hidden items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset sm:inline-flex"
              :class="badgeStyles[styleKey(stat.code)]"
            >
              {{ stat.change }}
            </span>
          </div>
          <p class="mt-0.5 text-[10px] sm:text-xs" :class="textStyles[styleKey(stat.code)].unit">
            Mds FCFA
            <span v-if="stat.change" class="inline sm:hidden">({{ stat.change }})</span>
          </p>
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
