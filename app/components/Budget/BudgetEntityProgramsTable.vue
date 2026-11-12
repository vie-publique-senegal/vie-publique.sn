<script setup lang="ts">
interface ProgramData {
  label: string;
  value: number;
  variation_percentage: string;
  variation_color: string;
}

const props = defineProps<{ programs: ProgramData[] }>();

const formatMontant = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);

const total = computed(() => props.programs.reduce((sum, item) => sum + item.value, 0));

/** Part du programme dans le total, en % (1 décimale, séparateur français). */
const part = (value: number) => (total.value > 0 ? (value / total.value) * 100 : 0);
</script>

<template>
  <!--
    Liste financière : lignes séparées par de fines hairlines, pas de carte dans
    la carte. ⚠️ Ne pas réintroduire `shadow-lg` + en-tête gris ici : le tableau
    était enfermé dans un 2ᵉ niveau de surface, à l'intérieur d'une carte qui en
    est déjà une.
    Les montants sont en `tabular-nums` et `whitespace-nowrap` : les chiffres
    s'alignent d'une ligne à l'autre et ne se coupent jamais de leur unité.
  -->
  <div>
    <!-- En-tête de colonnes (desktop seulement : sur mobile la ligne est empilée) -->
    <div
      class="hidden items-baseline justify-between border-b border-gray-200 pb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:flex"
    >
      <span>Programme</span>
      <span>Montant (Md FCFA)</span>
    </div>

    <ul class="divide-y divide-gray-100 dark:divide-gray-700">
      <li
        v-for="program in programs"
        :key="program.label"
        class="group py-3 transition-colors hover:bg-gray-50 motion-reduce:transition-none dark:hover:bg-gray-700/40"
      >
        <div class="flex items-baseline justify-between gap-3">
          <span class="min-w-0 flex-1 text-sm text-gray-900 dark:text-gray-100">
            {{ program.label }}
          </span>

          <div class="flex shrink-0 items-baseline gap-2">
            <span
              class="whitespace-nowrap text-sm font-semibold tabular-nums text-gray-900 dark:text-white"
            >
              {{ formatMontant(program.value) }}
            </span>
            <BudgetVariationBadge :value="program.variation_percentage" size="xs" />
          </div>
        </div>

        <!-- Part dans le total : barre + pourcentage sur la même ligne -->
        <div class="mt-2 flex items-center gap-2">
          <div
            class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"
            role="presentation"
          >
            <div
              class="h-full rounded-full bg-sky-500 dark:bg-sky-400"
              :style="{ width: `${part(program.value)}%` }"
            />
          </div>
          <span
            class="w-12 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400"
          >
            {{ formatMontant(part(program.value)) }} %
          </span>
        </div>
      </li>
    </ul>

    <!-- Total -->
    <div
      class="flex items-baseline justify-between border-t-2 border-gray-200 pt-3 dark:border-gray-600"
    >
      <span class="text-sm font-semibold text-gray-900 dark:text-white">Total</span>
      <span
        class="whitespace-nowrap text-sm font-bold tabular-nums text-gray-900 dark:text-white sm:text-base"
      >
        {{ formatMontant(total) }}
        <span class="text-xs font-normal text-gray-500 dark:text-gray-400">Md FCFA</span>
      </span>
    </div>
  </div>
</template>
