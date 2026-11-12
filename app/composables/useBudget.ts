import { pickPriorityBudgetVersion } from '#shared/budget-version';

export interface BudgetMetric {
  code: string;
  label: string;
  value: number;
  unit: string;
  color?: string;
  note?: string;
}

export interface BudgetDocument {
  id: string;
  slug: string;
  title: string;
  file?: string;
  cover_image?: string;
}

export interface BudgetGlobalData {
  year: number;
  versionId: number;
  documents: BudgetDocument[];
  keyIndicators: BudgetMetric[];
  revenues: BudgetMetric[];
  expenses: BudgetMetric[];
  financing: BudgetMetric[];
  debt: BudgetMetric[];
  allMetrics: BudgetMetric[];
}

export interface BudgetYear {
  year: number;
  yearId: number;
  versions: BudgetVersion[];
}

export interface BudgetVersion {
  id: number;
  label: string;
  date: string; // Format: YYYY-MM-DD
}

export interface BudgetYearsData {
  years: BudgetYear[];
  latest: {
    year: number;
    versionId: number;
    versionLabel: string;
  } | null;
}

/**
 * Options de `useFetch('/api/budget/years')`, partagées par le composable et
 * par les pages qui doivent connaître l'exercice courant AVANT le rendu.
 * Identiques de part et d'autre, sinon Nuxt avertit (« Incompatible options »)
 * et ne déduplique pas.
 */
export const BUDGET_YEARS_FETCH = {
  key: 'budget-years',
  default: () => ({ years: [], latest: null }) as BudgetYearsData,
  server: true,
} as const;

/** Valeur de repli d'un budget global, identique partout (voir `useBudgetGlobalFetch`). */
const emptyBudgetGlobal = (): BudgetGlobalData => ({
  year: 0,
  versionId: 0,
  documents: [],
  keyIndicators: [],
  revenues: [],
  expenses: [],
  financing: [],
  debt: [],
  allMetrics: [],
});

/**
 * Fetch canonique de `/api/budget/global`.
 *
 * ⚠️ À utiliser PARTOUT plutôt que de réécrire un `useFetch` sur cette route :
 * deux appels qui partagent la clé `budget-global-<année>-<version>` mais pas
 * les mêmes options déclenchent « [useFetch] Incompatible options detected » et
 * ne sont pas dédupliqués proprement (c'était le cas entre `useBudget` et
 * `Budget2TableMinistryV2` sur le tableau de bord).
 */
export const useBudgetGlobalFetch = (
  year: MaybeRefOrGetter<number | undefined>,
  version: MaybeRefOrGetter<number | null | undefined>,
) =>
  useFetch<BudgetGlobalData>('/api/budget/global', {
    key: computed(() => `budget-global-${toValue(year)}-${toValue(version) || 'latest'}`),
    query: computed(() => ({ year: toValue(year), version: toValue(version) ?? undefined })),
    watch: [() => toValue(year), () => toValue(version)],
    server: true,
    lazy: false,
    default: emptyBudgetGlobal,
  });

export interface UseBudgetOptions {
  year?: number;
  version?: number;
  enableComparison?: boolean; // Activer la comparaison par défaut
}

export const useBudget = (options: UseBudgetOptions = {}) => {
  // Fetch de la liste des années et versions disponibles. Même clé et mêmes
  // options que l'appel attendu côté page (cf. `BUDGET_YEARS_FETCH`) : Nuxt
  // déduplique, il n'y a qu'une requête.
  const { data: yearsData } = useFetch<BudgetYearsData>('/api/budget/years', BUDGET_YEARS_FETCH);

  // Exercice affiché : fourni par l'appelant, qui a attendu `/api/budget/years`
  // et passe `latest` (dernier exercice publié, priorité LFR > LFI > PLF).
  //
  // ⚠️ NE PAS réintroduire d'année en dur ici (c'était `ref(2026)` recalé par
  // un `watch` sur `latest`). Conséquences mesurées : le tableau de bord était
  // rendu côté SERVEUR avec les montants 2026 et aucune option sélectionnée
  // dans le menu d'exercice, puis sautait sur l'exercice courant après
  // hydratation — avec un aller-retour `/api/budget/global` inutile au passage.
  //
  // ⚠️ NE PAS `await` dans ce composable : l'`await` d'une fonction ordinaire
  // n'est pas enveloppé par `withAsyncContext` (seuls les `await` de premier
  // niveau d'un `<script setup>` le sont), donc les `useFetch` qui suivent
  // perdent l'instance Nuxt → 500 SSR. D'où la résolution côté page.
  // Années disponibles (déclarées avant la sélection : `versionForYear` en dépend).
  const availableYears = computed(() => yearsData.value?.years || []);

  /**
   * Exercice ET version dans UNE SEULE ref.
   *
   * ⚠️ NE PAS revenir à deux refs séparées. Avec `year` et `version` écrites
   * l'une après l'autre (`year.value = 2026; version.value = 5;`), il existe un
   * instant où le couple est incohérent — année 2026 + version 8, qui est celle
   * du PLF 2027. Ce couple partait réellement à l'API à CHAQUE changement
   * d'exercice : `/api/budget/global` répondait **404** et
   * `/api/budget/compare` **500**, soit une erreur serveur remontée à Sentry à
   * chaque clic. Une seule écriture = aucun état intermédiaire observable.
   */
  const selection = ref<{ year: number; version?: number }>({
    year: options.year ?? new Date().getFullYear(),
    version: options.version,
  });

  /** Version prioritaire d'un exercice (LFR > LFI > PLF), ou `undefined`. */
  const versionForYear = (targetYear: number): number | undefined => {
    const yearData = availableYears.value.find((y) => y.year === targetYear);
    return yearData ? pickPriorityBudgetVersion(yearData.versions)?.id : undefined;
  };

  /** Change l'exercice ET sa version en une écriture (pas de couple bâtard). */
  const setYearVersion = (newYear: number, newVersion?: number) => {
    selection.value = {
      year: newYear,
      version: newVersion ?? versionForYear(newYear),
    };
  };

  // `year` et `version` restent l'API publique du composable : ce sont des
  // computed inscriptibles, pour que tout le code existant (`year.value = …`)
  // continue de fonctionner — mais toute écriture reste atomique.
  const year = computed<number>({
    get: () => selection.value.year,
    set: (newYear) => setYearVersion(newYear),
  });

  const version = computed<number | undefined>({
    get: () => selection.value.version,
    set: (newVersion) => {
      selection.value = { year: selection.value.year, version: newVersion };
    },
  });

  // La comparaison est toujours activée, avec l'année N-1 par défaut
  const compareYear = ref<number | undefined>(undefined);
  const compareVersion = ref<number | undefined>(undefined);

  // Computed pour les versions disponibles de l'année sélectionnée
  const availableVersions = computed(() => {
    const yearData = availableYears.value.find((y) => y.year === year.value);
    return yearData?.versions || [];
  });

  /**
   * Version réellement envoyée à l'API : `version` n'est retenue que si elle
   * appartient bien à l'exercice sélectionné.
   *
   * ⚠️ `year` et `version` sont deux refs écrites l'une après l'autre quand on
   * change d'exercice. Entre les deux écritures, le couple est incohérent
   * (ex. année 2026 + version 8 du PLF 2027) et partait tel quel à l'API :
   * `/api/budget/global` répondait 404 et `/api/budget/compare` 500 — une
   * erreur serveur remontée à Sentry à CHAQUE changement d'exercice. En
   * omettant la version incohérente, le serveur choisit lui-même celle de
   * l'exercice demandé et la réponse reste valide.
   */
  const effectiveVersion = computed(() => {
    if (!version.value) return undefined;
    const belongsToYear = availableVersions.value.some((v) => v.id === version.value);
    return belongsToYear ? version.value : undefined;
  });

  // Construction des query params
  const queryParams = computed(() => {
    const params: Record<string, any> = {
      year: year.value,
    };
    if (effectiveVersion.value) {
      params.version = effectiveVersion.value;
    }
    return params;
  });

  // Fetch des données via server API route (options canoniques partagées).
  const globalFetch = useBudgetGlobalFetch(year, effectiveVersion);

  const { data, pending, error, refresh } = globalFetch;

  // Fetch des données de comparaison (toujours activé)
  const comparisonQueryParams = computed(() => {
    const params: Record<string, any> = {
      currentYear: year.value,
      currentVersion: effectiveVersion.value,
    };

    if (compareYear.value) {
      params.compareYear = compareYear.value;
    }

    if (compareVersion.value) {
      params.compareVersion = compareVersion.value;
    }

    return params;
  });

  const comparisonFetch = useFetch('/api/budget/compare', {
    key: computed(
      () =>
        `budget-compare-${year.value}-${effectiveVersion.value || 'latest'}-vs-${compareYear.value || year.value - 1}-${compareVersion.value || 'auto'}`,
    ),
    query: comparisonQueryParams,
    watch: [year, version, compareYear, compareVersion],
    server: true,
    lazy: false, // Force le fetch immédiat côté serveur
    // Même forme que toutes les branches de `/api/budget/compare` : un `default`
    // incomplet suffit à rendre `compare`/`compareYear` inaccessibles en TS.
    default: () => ({
      current: null,
      compare: null,
      hasComparison: false,
      compareYear: null as number | null,
      compareVersionId: null as number | null,
    }),
  });

  const { data: comparisonData } = comparisonFetch;

  // Fonction utilitaire pour calculer le pourcentage de variation
  const calculateVariation = (current: number, previous: number): string => {
    if (previous === 0) return 'N/A';
    const variation = ((current - previous) / previous) * 100;
    const sign = variation > 0 ? '+' : '';
    return `${sign}${variation.toFixed(1)}%`;
  };

  // Fonction utilitaire pour déterminer la couleur du badge
  // Pour le déficit, une baisse (négatif) est positive, donc on inverse les couleurs
  const getVariationColor = (
    variation: string,
    indicatorCode: string,
  ): 'green' | 'red' | 'gray' => {
    if (variation === 'N/A' || variation === '0%' || variation === '+0.0%') return 'gray';

    const isPositive = variation.startsWith('+');
    const isDeficit = indicatorCode === 'deficit_total' || indicatorCode === 'deficit_pct_gdp';

    // Pour le déficit, on inverse : baisse = vert, hausse = rouge
    if (isDeficit) {
      return isPositive ? 'red' : 'green';
    }

    // Pour les autres indicateurs : hausse = vert, baisse = rouge
    return isPositive ? 'green' : 'red';
  };

  // Computed pour les indicateurs clés formatés (pour affichage)
  const formattedKeyIndicators = computed(() => {
    if (!data.value?.keyIndicators) return [];

    // Map des couleurs thématiques par code d'indicateur
    // Seuls les 3 indicateurs PRINCIPAUX portent une couleur de catégorie
    // (recettes / dépenses / déficit). Tous les autres restent neutres : c'est ce
    // qui évite la page arc-en-ciel tout en gardant l'identité des grandes masses.
    const colorMap: Record<string, 'green' | 'red' | 'gray' | 'orange' | 'purple' | 'yellow'> = {
      revenue_total: 'green',
      expense_total: 'orange',
      deficit_total: 'red',
    };

    return data.value.keyIndicators.map((indicator) => {
      let variation = 'N/A';
      let variationColor: 'green' | 'red' | 'gray' = 'gray';
      let compareValue = null;

      // Calculer la variation si on a des données de comparaison
      if (comparisonData.value?.hasComparison && comparisonData.value.compare) {
        const compareIndicator = comparisonData.value.compare.keyIndicators.find(
          (item: any) => item.code === indicator.code,
        );
        if (compareIndicator) {
          variation = calculateVariation(indicator.value, compareIndicator.value);
          variationColor = getVariationColor(variation, indicator.code);
          compareValue = compareIndicator.value;
        }
      }

      // Pour les indicateurs en %, afficher la valeur de l'année de comparaison au lieu du % de variation
      // Séparateur de milliers français : « 6 012 » et non « 6012 », comme
      // partout ailleurs dans le module.
      const displayValue =
        indicator.unit === 'mds_fcfa'
          ? new Intl.NumberFormat('fr-FR').format(Math.round(indicator.value))
          : indicator.value.toFixed(1);
      let displayVariation = variation;

      // Si l'unité est en pourcentage, on affiche la valeur comparative directement
      if (
        indicator.unit !== 'mds_fcfa' &&
        compareValue !== null &&
        comparisonData.value?.hasComparison
      ) {
        displayVariation = `${compareValue.toFixed(1)}% en ${comparisonData.value.compareYear}`;
        // Pour le déficit en %, ne pas afficher de couleur (gris par défaut)
        variationColor = 'gray';
      }

      return {
        code: indicator.code,
        name: indicator.label,
        value: displayValue,
        unit: indicator.unit === 'mds_fcfa' ? 'Md FCFA' : '%',
        color: colorMap[indicator.code] || 'gray',
        variation_percentage: displayVariation,
        variation_color: variationColor,
        showVariationBadge: true,
      };
    });
  });

  // Computed pour les données de recettes (format graphique)
  const revenueChartData = computed(() => {
    if (!data.value?.revenues) return [];

    // Couleurs fixes pour les recettes (palette verte)
    const colors = ['#2E7D32', '#43A047', '#66BB6A', '#81C784', '#A5D6A7'];

    return data.value.revenues.map((item, index) => {
      let variation = 'N/A';
      let variationColor: 'green' | 'red' | 'gray' = 'gray';

      // Calculer la variation si on a des données de comparaison
      if (comparisonData.value?.hasComparison && comparisonData.value.compare) {
        const compareItem = comparisonData.value.compare.revenues.find(
          (r: any) => r.code === item.code,
        );
        if (compareItem) {
          variation = calculateVariation(item.value, compareItem.value);
          variationColor = getVariationColor(variation, item.code);
        }
      }

      return {
        label: item.label,
        value: item.value,
        color: colors[index % colors.length],
        variation_percentage: variation,
        variation_color: variationColor,
      };
    });
  });

  // Computed pour le total des recettes avec variation
  const revenueTotalWithVariation = computed(() => {
    const total = revenueChartData.value.reduce((sum, item) => sum + item.value, 0);
    let variation = 'N/A';
    let variationColor: 'green' | 'red' | 'gray' = 'gray';

    if (comparisonData.value?.hasComparison && comparisonData.value.compare) {
      const compareTotal = comparisonData.value.compare.revenues.reduce(
        (sum: number, item: any) => sum + item.value,
        0,
      );
      if (compareTotal > 0) {
        variation = calculateVariation(total, compareTotal);
        variationColor = getVariationColor(variation, 'revenue_total');
      }
    }

    return {
      total,
      variation_percentage: variation,
      variation_color: variationColor,
    };
  });

  // Computed pour les données de dépenses (format graphique)
  const expenseChartData = computed(() => {
    if (!data.value?.expenses) return [];

    // Couleurs fixes pour les dépenses (palette orange/jaune)
    const colors = ['#F97316', '#FB923C', '#FDBA74', '#FCD34D', '#FDE047'];

    return data.value.expenses.map((item, index) => {
      let variation = 'N/A';
      let variationColor: 'green' | 'red' | 'gray' = 'gray';

      // Calculer la variation si on a des données de comparaison
      if (comparisonData.value?.hasComparison && comparisonData.value.compare) {
        const compareItem = comparisonData.value.compare.expenses.find(
          (e: any) => e.code === item.code,
        );
        if (compareItem) {
          variation = calculateVariation(item.value, compareItem.value);
          variationColor = getVariationColor(variation, item.code);
        }
      }

      return {
        label: item.label,
        value: item.value,
        color: colors[index % colors.length],
        variation_percentage: variation,
        variation_color: variationColor,
      };
    });
  });

  // Computed pour le total des dépenses avec variation
  const expenseTotalWithVariation = computed(() => {
    const total = expenseChartData.value.reduce((sum, item) => sum + item.value, 0);
    let variation = 'N/A';
    let variationColor: 'green' | 'red' | 'gray' = 'gray';

    if (comparisonData.value?.hasComparison && comparisonData.value.compare) {
      const compareTotal = comparisonData.value.compare.expenses.reduce(
        (sum: number, item: any) => sum + item.value,
        0,
      );
      if (compareTotal > 0) {
        variation = calculateVariation(total, compareTotal);
        variationColor = getVariationColor(variation, 'expense_total');
      }
    }

    return {
      total,
      variation_percentage: variation,
      variation_color: variationColor,
    };
  });

  // Computed pour les opérations de trésorerie (financement)
  const treasuryOperations = computed(() => {
    if (!data.value?.financing)
      return {
        total: 0,
        components: [],
        variation_percentage: 'N/A',
        variation_color: 'gray' as const,
      };

    // Filtrer pour ne garder que les composantes (exclure le total s'il existe)
    const components = data.value.financing.filter((item) => item.code !== 'financing_need_total');

    // Calculer le total à partir des composantes
    const total = components.reduce((sum, item) => sum + item.value, 0);

    // Calculer la variation du total
    let totalVariation = 'N/A';
    let totalVariationColor: 'green' | 'red' | 'gray' = 'gray';

    if (comparisonData.value?.hasComparison && comparisonData.value.compare) {
      const compareComponents = comparisonData.value.compare.financing.filter(
        (f: any) => f.code !== 'financing_need_total',
      );
      const compareTotal = compareComponents.reduce(
        (sum: number, item: any) => sum + item.value,
        0,
      );
      if (compareTotal > 0) {
        totalVariation = calculateVariation(total, compareTotal);
        totalVariationColor = getVariationColor(totalVariation, 'financing_need_total');
      }
    }

    return {
      total,
      variation_percentage: totalVariation,
      variation_color: totalVariationColor,
      components: components.map((item) => {
        let variation = 'N/A';
        let variationColor: 'green' | 'red' | 'gray' = 'gray';

        // Calculer la variation si on a des données de comparaison
        if (comparisonData.value?.hasComparison && comparisonData.value.compare) {
          const compareComponents = comparisonData.value.compare.financing.filter(
            (f: any) => f.code !== 'financing_need_total',
          );
          const compareItem = compareComponents.find((f: any) => f.code === item.code);
          if (compareItem) {
            variation = calculateVariation(item.value, compareItem.value);
            variationColor = getVariationColor(variation, item.code);
          }
        }

        return {
          label: item.label,
          value: item.value,
          percentage: total > 0 ? (item.value / total) * 100 : 0,
          color: item.color || '#5924b2',
          variation_percentage: variation,
          variation_color: variationColor,
        };
      }),
    };
  });

  // Computed pour la dette publique
  const publicDebt = computed(() => {
    if (!data.value?.debt)
      return {
        total: 0,
        components: [],
        variation_percentage: 'N/A',
        variation_color: 'gray' as const,
      };

    // Filtrer pour ne garder que les composantes (intérêts et principal)
    // debt_service_total est le total, pas une composante
    const components = data.value.debt.filter((item) => item.code !== 'debt_service_total');

    // Chercher le total
    const totalItem = data.value.debt.find((item) => item.code === 'debt_service_total');
    const total = totalItem
      ? totalItem.value
      : components.reduce((sum, item) => sum + item.value, 0);

    // Calculer la variation du total
    let totalVariation = 'N/A';
    let totalVariationColor: 'green' | 'red' | 'gray' = 'gray';

    if (comparisonData.value?.hasComparison && comparisonData.value.compare) {
      const compareTotalItem = comparisonData.value.compare.debt.find(
        (d: any) => d.code === 'debt_service_total',
      );
      const compareComponents = comparisonData.value.compare.debt.filter(
        (d: any) => d.code !== 'debt_service_total',
      );
      const compareTotal = compareTotalItem
        ? compareTotalItem.value
        : compareComponents.reduce((sum: number, item: any) => sum + item.value, 0);

      if (compareTotal > 0) {
        totalVariation = calculateVariation(total, compareTotal);
        totalVariationColor = getVariationColor(totalVariation, 'debt_service_total');
      }
    }

    return {
      total,
      variation_percentage: totalVariation,
      variation_color: totalVariationColor,
      components: components.map((item) => {
        let variation = 'N/A';
        let variationColor: 'green' | 'red' | 'gray' = 'gray';

        // Calculer la variation si on a des données de comparaison
        if (comparisonData.value?.hasComparison && comparisonData.value.compare) {
          const compareComponents = comparisonData.value.compare.debt.filter(
            (d: any) => d.code !== 'debt_service_total',
          );
          const compareItem = compareComponents.find((d: any) => d.code === item.code);
          if (compareItem) {
            variation = calculateVariation(item.value, compareItem.value);
            variationColor = getVariationColor(variation, item.code);
          }
        }

        return {
          label: item.label,
          value: item.value,
          percentage: total > 0 ? (item.value / total) * 100 : 0,
          color: '#f97316', // Couleur orange fixe
          variation_percentage: variation,
          variation_color: variationColor,
        };
      }),
    };
  });

  // Change l'exercice en sélectionnant sa version prioritaire (LFR > LFI > PLF),
  // en une seule écriture. La priorité vient de `shared/budget-version.ts`,
  // comme `/api/budget/years` — une seule définition de la règle.
  const setYear = (newYear: number) => setYearVersion(newYear);

  // Méthode pour changer la version
  const setVersion = (newVersion: number | undefined) => {
    version.value = newVersion;
  };

  // Computed pour le label de la version actuelle
  const currentVersionLabel = computed(() => {
    const versionObj = availableVersions.value.find((v) => v.id === version.value);
    return versionObj?.label || '';
  });

  // Méthode pour gérer la comparaison
  const setCompareYear = (newYear: number | undefined, newVersion?: number | undefined) => {
    compareYear.value = newYear;
    if (newVersion !== undefined) {
      compareVersion.value = newVersion;
    }
  };

  // Fetch de l'évolution multi-années (recettes, dépenses, financement, dette)
  const evolutionFetch = useFetch('/api/budget/evolution', {
    key: 'budget-evolution',
    server: true,
    default: () => ({
      revenueEvolution: [],
      expenseEvolution: [],
      financingEvolution: [],
      debtEvolution: [],
    }),
  });

  const { data: evolutionData } = evolutionFetch;

  /**
   * À `await` dans le `<script setup>` appelant.
   *
   * ⚠️ Nécessaire parce que la page attend déjà `/api/budget/years` au niveau
   * supérieur : les `useFetch` enregistrés APRÈS cet `await` ne sont plus
   * attendus par Nuxt avant le rendu serveur. Leurs données finissent bien dans
   * le payload, mais le HTML est produit avant — d'où des écarts d'hydratation
   * (variations rendues « N/A » côté serveur, puis « -2,9 % » côté client).
   */
  const ready = () => Promise.all([globalFetch, comparisonFetch, evolutionFetch]);

  const revenueEvolution = computed(() => evolutionData.value?.revenueEvolution || []);
  const expenseEvolution = computed(() => evolutionData.value?.expenseEvolution || []);
  const financingEvolution = computed(() => evolutionData.value?.financingEvolution || []);
  const debtEvolution = computed(() => evolutionData.value?.debtEvolution || []);

  return {
    // État
    year,
    version,
    loading: pending,
    error,

    // Listes disponibles
    availableYears,
    availableVersions,
    currentVersionLabel,

    // États de comparaison
    compareYear,
    compareVersion,
    hasComparison: computed(() => comparisonData.value?.hasComparison || false),
    comparisonYearLabel: computed(() => {
      if (!comparisonData.value?.hasComparison) return '';
      return `${comparisonData.value.compareYear || year.value - 1}`;
    }),

    // Données brutes
    budgetData: data,
    documents: computed(() => data.value?.documents || []),
    keyIndicators: computed(() => data.value?.keyIndicators || []),
    revenues: computed(() => data.value?.revenues || []),
    expenses: computed(() => data.value?.expenses || []),
    financing: computed(() => data.value?.financing || []),
    debt: computed(() => data.value?.debt || []),
    allMetrics: computed(() => data.value?.allMetrics || []),

    // Données formatées pour affichage
    formattedKeyIndicators,
    revenueChartData,
    revenueTotalWithVariation,
    expenseChartData,
    expenseTotalWithVariation,
    treasuryOperations,
    publicDebt,

    // Évolutions multi-années
    revenueEvolution,
    expenseEvolution,
    financingEvolution,
    debtEvolution,

    // Méthodes
    ready,
    setYear,
    setYearVersion,
    setVersion,
    setCompareYear,
    refresh,
  };
};
