import { describeBudgetVersion, type BudgetVersionDescription } from '#shared/budget-version';
import { formatNumber } from '#shared/format';

import type { BudgetGlobalData, BudgetMetric, BudgetYearsData } from './useBudget';

/**
 * Chiffres d'en-tête du dernier exercice budgétaire publié.
 *
 * Sert les surfaces « vitrine » (accueil du site, accueil de la rubrique budget)
 * qui n'ont besoin que de 3 montants et de l'intitulé du texte — pas de tout
 * l'appareil du tableau de bord (`useBudget`, qui charge aussi l'évolution
 * multi-années et tous les groupes de métriques).
 *
 * ⚠️ Aucune année n'est écrite en dur : l'exercice vient de `/api/budget/years`.
 * Un nouvel exercice publié au CMS s'affiche sans toucher au code.
 */

/** Les 3 montants mis en avant, dans l'ordre d'affichage. */
const HEADLINE_METRICS = [
  { code: 'expense_total', label: 'Dépenses' },
  { code: 'revenue_total', label: 'Recettes' },
  { code: 'deficit_total', label: 'Déficit' },
] as const;

export interface BudgetHeadlineStat {
  code: string;
  /** Libellé court d'affichage (le libellé CMS est trop long pour une tuile). */
  label: string;
  value: number;
  /** Montant arrondi en milliards, séparateurs français : « 7 364 ». */
  formattedValue: string;
  /** Variation vs exercice comparé (« +13,0% »), `null` si incomparable. */
  change: string | null;
  /**
   * Sens de la variation, pour l'afficher par une FLÈCHE et non par une couleur.
   * Une baisse des dépenses en rouge laisserait entendre « mauvaise nouvelle » ;
   * sur un budget, c'est au lecteur d'en juger, pas à l'interface.
   */
  changeDirection: 'up' | 'down' | 'flat' | null;
  /** Variation sans le signe (« 13,0% ») : le signe est porté par la flèche. */
  changeLabel: string | null;
}

export interface BudgetLatestSummary {
  year: number;
  version: BudgetVersionDescription;
  /** Exercice servant de base aux variations, `null` s'il n'y en a pas. */
  compareYear: number | null;
  stats: BudgetHeadlineStat[];
}

const findValue = (metrics: BudgetMetric[] | undefined, code: string): number | undefined => {
  const metric = metrics?.find((item) => item.code === code);
  return typeof metric?.value === 'number' && Number.isFinite(metric.value)
    ? metric.value
    : undefined;
};

const describeChange = (current: number, previous: number) => {
  if (!previous) return { change: null, changeDirection: null, changeLabel: null };

  const variation = ((current - previous) / previous) * 100;
  if (!Number.isFinite(variation))
    return { change: null, changeDirection: null, changeLabel: null };

  const formatted = variation.toFixed(1).replace('.', ',');
  const sign = variation > 0 ? '+' : '';

  return {
    change: `${sign}${formatted}%`,
    changeDirection: (variation > 0 ? 'up' : variation < 0 ? 'down' : 'flat') as
      | 'up'
      | 'down'
      | 'flat',
    changeLabel: `${formatted.replace('-', '')}%`,
  };
};

export const useBudgetLatest = () => {
  const { data, pending, error } = useAsyncData<BudgetLatestSummary | null>(
    'budget-latest-summary',
    async () => {
      // Dégradation propre : les surfaces vitrine masquent les chiffres plutôt
      // que d'afficher une erreur ou, pire, des montants d'un autre exercice.
      try {
        const years = await $fetch<BudgetYearsData>('/api/budget/years');
        const latest = years?.latest;
        if (!latest) return null;

        const comparison = await $fetch<{
          current: BudgetGlobalData | null;
          compare: BudgetGlobalData | null;
          hasComparison: boolean;
          compareYear?: number;
        }>('/api/budget/compare', {
          query: { currentYear: latest.year, currentVersion: latest.versionId },
        });

        const current = comparison?.current?.keyIndicators;
        if (!current?.length) return null;

        const previous = comparison?.hasComparison ? comparison.compare?.keyIndicators : undefined;

        const stats = HEADLINE_METRICS.flatMap(({ code, label }) => {
          const value = findValue(current, code);
          if (value === undefined) return [];

          const previousValue = findValue(previous, code);
          const variation =
            previousValue === undefined
              ? { change: null, changeDirection: null, changeLabel: null }
              : describeChange(value, previousValue);

          return [
            {
              code,
              label,
              value,
              formattedValue: formatNumber(Math.round(value)),
              ...variation,
            },
          ];
        });

        return {
          year: latest.year,
          version: describeBudgetVersion(latest.versionLabel),
          compareYear: comparison?.hasComparison ? (comparison.compareYear ?? null) : null,
          stats,
        };
      } catch {
        return null;
      }
    },
    { default: () => null, server: true },
  );

  return {
    summary: data,
    pending,
    error,
    /** Année du dernier exercice publié, `null` tant qu'elle est inconnue. */
    year: computed(() => data.value?.year ?? null),
    /** Intitulé lisible du texte budgétaire (« Projet de loi de finances »). */
    version: computed(() => data.value?.version ?? null),
    stats: computed<BudgetHeadlineStat[]>(() => data.value?.stats ?? []),
  };
};
