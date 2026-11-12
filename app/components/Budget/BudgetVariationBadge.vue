<template>
  <!--
    Badge de variation — composant UNIQUE pour tout le module budget
    (indicateurs clés, tableaux de répartition, budgets ministériels, fiches entité).

    ⚠️ Les classes de couleur sont écrites EN TOUTES LETTRES ici, dans un `.vue`.
    Les classes sont écrites en toutes lettres (l'extracteur ne lit pas les
    couleurs construites dynamiquement) et reprennent celles déjà employées
    ailleurs dans le projet, pour rester cohérent.

    La couleur indique le SENS (vert = hausse, rouge = baisse, gris = stable),
    jamais un jugement : une baisse des dépenses n'est ni bonne ni mauvaise.
    Variation indisponible → aucun badge.
  -->
  <span
    v-if="variation"
    class="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium"
    :class="[
      sizeClass,
      variation.direction === 'up'
        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : variation.direction === 'down'
          ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    ]"
    :title="title"
  >
    <UIcon :name="variation.icon" class="h-3.5 w-3.5 shrink-0" />
    {{ variation.label }}
  </span>
</template>

<script setup lang="ts">
interface Props {
  /** Variation brute : « +13,0% », « -0.9% », 4.7, « N/A »… */
  value: string | number | null | undefined;
  size?: 'xs' | 'sm';
  title?: string;
}

const props = withDefaults(defineProps<Props>(), { size: 'sm', title: undefined });

const variation = computed(() => describeBudgetVariation(props.value));
const sizeClass = computed(() => (props.size === 'xs' ? 'text-[10px]' : 'text-xs'));
</script>
