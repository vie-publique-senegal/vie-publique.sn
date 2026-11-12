<script setup lang="ts">
import { describeBudgetVersion } from '#shared/budget-version';

/**
 * Évolution pluriannuelle du budget d'une entité.
 *
 * ⚠️ Rendu en HTML/CSS, PAS en D3. La version D3 ne dessinait RIEN (SVG présent,
 * 0 `<rect>` : conteneur de largeur 0 au montage) et codait les couleurs de
 * labels en dur (`#6B7280`, `#2563EB`), donc illisibles en mode sombre.
 *
 * ⚠️ Chaque barre est positionnée en ABSOLU dans un rail de hauteur fixe.
 * Un `height: X%` sur un enfant flex ne se résout pas : toutes les barres
 * sortaient à la même hauteur (156 px), ce qui vidait le graphique de son sens.
 *
 * ⚠️ N'utiliser que des nuances DÉJÀ présentes dans le dépôt : une classe
 * inédite n'est pas générée par l'extracteur et la barre sort TRANSPARENTE
 * (vécu avec `bg-sky-200`, et avec `dark:bg-sky-900` NU : le dépôt ne l'emploie
 * qu'avec opacité, donc seule `dark:bg-sky-900/40` existe). Vérifier la forme
 * EXACTE avec `grep -rhoE 'dark:bg-sky-900[^ "]*' app/`.
 *
 * ⚠️ ORDRE : helpers avant les `computed` qui les appellent (cf. CLAUDE.md).
 *
 * L'échelle part de ZÉRO, volontairement : tronquer l'axe exagérerait
 * optiquement des écarts de quelques pour cent sur des montants publics.
 * Les montants exacts sont imprimés au-dessus de chaque barre.
 */
interface EvolutionData {
  year: string;
  amount: number;
  /** Ex. « 2027 (PLF) » */
  label: string;
}

const props = defineProps<{ data: EvolutionData[] }>();

const formatMontant = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);

/** Extrait le sigle de version (LFI / LFR / PLF) du libellé. */
const versionOf = (label: string) => label.match(/\(([^)]+)\)/)?.[1] ?? '';

const maxAmount = computed(() => Math.max(...props.data.map((d) => d.amount), 0));

const bars = computed(() =>
  props.data.map((d, index) => {
    const version = versionOf(d.label);
    const described = describeBudgetVersion(version);

    return {
      ...d,
      version,
      titre: `${d.year} - ${described.label} : ${formatMontant(d.amount)} Md FCFA`,
      estDernier: index === props.data.length - 1,
      hauteur: maxAmount.value > 0 ? Math.max((d.amount / maxAmount.value) * 100, 2) : 0,
    };
  }),
);
</script>

<template>
  <div class="w-full">
    <!-- Montants -->
    <div class="flex items-end gap-2 sm:gap-4">
      <div
        v-for="bar in bars"
        :key="bar.label"
        class="min-w-0 flex-1 text-center text-[11px] font-semibold tabular-nums text-gray-700 dark:text-gray-200 sm:text-xs"
      >
        {{ formatMontant(bar.amount) }}
      </div>
    </div>

    <!-- Rails : hauteur fixe, barre en absolu -> le pourcentage se résout -->
    <div class="mt-1 flex items-end gap-2 sm:gap-4" style="height: 150px">
      <div
        v-for="bar in bars"
        :key="bar.label"
        class="group relative h-full min-w-0 flex-1 rounded-t-md transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
        :title="bar.titre"
      >
        <div
          class="absolute inset-x-0 bottom-0 rounded-t-md transition-[height] duration-500 motion-reduce:transition-none"
          :class="
            bar.estDernier
              ? 'bg-sky-500 dark:bg-sky-600'
              : 'bg-sky-100 group-hover:bg-sky-200 dark:bg-sky-900/40'
          "
          :style="{ height: `${bar.hauteur}%` }"
        />
      </div>
    </div>

    <!-- Axe des exercices : l'année et le type de texte budgétaire -->
    <div
      class="mt-2 flex gap-2 border-t border-gray-200 pt-2 dark:border-gray-700 sm:gap-4"
      aria-hidden="true"
    >
      <div v-for="bar in bars" :key="bar.label" class="min-w-0 flex-1 text-center">
        <div class="text-xs font-medium tabular-nums text-gray-900 dark:text-white">
          {{ bar.year }}
        </div>
        <div class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {{ bar.version }}
        </div>
      </div>
    </div>

    <!-- Équivalent textuel : le graphique seul n'est pas accessible -->
    <ul class="sr-only">
      <li v-for="bar in bars" :key="bar.label">{{ bar.titre }}</li>
    </ul>
  </div>
</template>
