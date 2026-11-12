<template>
  <!--
    Fond très légèrement teinté pour les 3 indicateurs principaux (recettes,
    dépenses, déficit), neutre pour les autres. Pas de dégradé, pas d'ombre.
    ⚠️ En DARK la surface reste celle du site (`gray-800`) : on ne transpose pas
    les pastels clairs — la catégorie passe alors par la couleur du libellé.
    Pas de filet vertical coloré : décoratif, et il faisait « template ».
  -->
  <div
    class="rounded-lg p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 sm:p-4"
    :class="surfaceClass"
  >
    <h3 class="mb-2 text-sm font-medium" :class="accentTextClass">{{ name }}</h3>

    <div class="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
        {{ formattedValue }}{{ isPercentage ? '%' : '' }}
      </span>

      <!-- Variation : la couleur indique le SENS, elle ne juge pas. -->
      <BudgetVariationBadge v-if="showVariationBadge" :value="variation_percentage" />
    </div>

    <div v-if="!isPercentage" class="text-xs text-gray-500 dark:text-gray-300">
      {{ unit }}
    </div>

    <div
      v-if="isComparisonText && variation_percentage"
      class="mt-1 text-xs text-gray-500 dark:text-gray-300"
    >
      {{ variation_percentage }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  name: string;
  value: string;
  unit?: string;
  variation_percentage: string;
  color?: 'green' | 'red' | 'gray' | 'orange' | 'purple' | 'yellow';
  showVariationBadge?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  unit: '',
  color: 'gray',
  showVariationBadge: true,
});

const isPercentage = computed(() => props.unit === '%');

// Formater la valeur : 1 décimale pour les pourcentages
const formattedValue = computed(() => {
  if (!isPercentage.value) return props.value;

  const numValue = parseFloat(props.value);
  if (isNaN(numValue)) return props.value;

  return numValue.toFixed(1);
});

// Détecter si la variation est un texte de comparaison (ex: "5.2% en 2025")
const isComparisonText = computed(() => {
  return props.variation_percentage && props.variation_percentage.includes('en');
});

// ⚠️ Classes écrites en toutes lettres : l'extracteur Tailwind ne voit pas les
// couleurs construites dynamiquement.
const SURFACE: Record<string, string> = {
  green: 'bg-emerald-50',
  orange: 'bg-orange-50',
  red: 'bg-rose-50',
};

const ACCENT_TEXT: Record<string, string> = {
  green: 'text-emerald-700 dark:text-emerald-300',
  red: 'text-rose-700 dark:text-rose-300',
  orange: 'text-orange-700 dark:text-orange-300',
  gray: 'text-gray-600 dark:text-gray-300',
};

const surfaceClass = computed(() => SURFACE[props.color] || 'bg-white');
const accentTextClass = computed(() => ACCENT_TEXT[props.color] || ACCENT_TEXT.gray);
</script>
