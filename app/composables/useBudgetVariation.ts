/**
 * Badge de variation budgétaire — règle UNIQUE pour tout le module budget
 * (indicateurs clés, tableaux de répartition, budgets ministériels, graphiques
 * comparatifs).
 *
 * ⚠️ La couleur indique le SENS de la variation, jamais un jugement.
 * Vert = hausse, rouge = baisse, gris = stable. Rien d'autre n'entre en compte :
 * une baisse des dépenses n'est ni « bonne » ni « mauvaise », c'est au lecteur
 * d'en juger. Ne PAS réintroduire d'inversion par indicateur (l'ancien
 * `getVariationColor` inversait pour le déficit, ce qui colorait la même
 * variation différemment d'un bloc à l'autre).
 *
 * Variation indisponible → `null` : on n'affiche pas de badge « N/A ».
 */
export type BudgetVariationDirection = 'up' | 'down' | 'flat';

export interface BudgetVariationBadge {
  direction: BudgetVariationDirection;
  /** Valeur sans le signe : le sens est porté par la flèche. */
  label: string;
  icon: string;
}

const ICONS: Record<BudgetVariationDirection, string> = {
  up: 'i-heroicons-arrow-up-right',
  down: 'i-heroicons-arrow-down-right',
  flat: 'i-heroicons-minus-small',
};

/** Normalise « +13,0% », « -0.9% », 4.7, « N/A »… en un badge, ou `null`. */
export const describeBudgetVariation = (
  raw: string | number | null | undefined,
): BudgetVariationBadge | null => {
  if (raw === null || raw === undefined) return null;

  const text = String(raw).trim();
  if (!text || text === 'N/A') return null;

  // Texte de comparaison (« 5.4% en 2026 ») : ce n'est pas une variation.
  if (/\ben\b/.test(text)) return null;

  const value = Number.parseFloat(text.replace(',', '.').replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(value)) return null;

  const direction: BudgetVariationDirection = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const absolute = Math.abs(value).toFixed(1).replace('.', ',');

  return {
    direction,
    label: direction === 'flat' ? 'stable' : `${absolute} %`,
    icon: ICONS[direction],
  };
};

export const useBudgetVariation = () => ({ describeBudgetVariation });
