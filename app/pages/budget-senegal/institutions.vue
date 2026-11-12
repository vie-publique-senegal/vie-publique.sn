<template>
  <div class="min-h-screen bg-gray-50 pb-24 dark:bg-gray-900">
    <!-- Sticky Header Mobile -->
    <header
      class="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/95 md:hidden"
    >
      <div class="flex items-center gap-3 px-4 py-2.5">
        <NuxtLink
          to="/budget-senegal"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors active:bg-gray-200 dark:bg-gray-800 dark:active:bg-gray-700"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </NuxtLink>
        <div class="min-w-0 flex-1">
          <p
            class="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            Budget {{ selectedYear }}
          </p>
          <p class="truncate text-base font-semibold text-gray-900 dark:text-white">Institutions</p>
        </div>
      </div>

      <!--
        Une phrase explicite, identique au desktop. ⚠️ Ne PAS raccourcir l'unite
        en « FCFA » : les montants budgetaires sont en MILLIARDS. L'ancienne
        version mobile affichait « {montant} FCFA », soit 10^9 fois trop peu.
      -->
      <div
        v-if="totalBudget && !pending"
        class="border-t border-gray-100 px-4 pb-2 dark:border-gray-800"
      >
        <p class="text-xs text-gray-500 dark:text-gray-400">
          <span class="font-semibold tabular-nums text-gray-900 dark:text-white">
            {{ filteredInstitutions.length }}
          </span>
          institutions
          <span aria-hidden="true" class="mx-1.5">·</span>
          <span class="whitespace-nowrap font-semibold tabular-nums text-gray-900 dark:text-white">
            {{ formatBudget(totalBudget) }}
          </span>
          Md FCFA de crédits de paiement
        </p>
      </div>
    </header>

    <!-- Fil d'ariane : desktop seulement (l'en-tête mobile ci-dessus a déjà
         sa flèche retour). <AppBreadcrumb> est la source UNIQUE du
         BreadcrumbList du @graph — ne pas ajouter de JSON-LD breadcrumb ici. -->
    <div class="container mx-auto hidden px-4 md:block">
      <AppBreadcrumb
        :items="[{ label: 'Budget', to: '/budget-senegal' }, { label: 'Institutions' }]"
      />
    </div>

    <!--
      Bande blanche pleine largeur regroupant titre, recherche et filtres,
      comme le <header> de /actualites et /documents/public.
      ⚠️ Ne pas ressortir le titre dans un bloc sans fond : il retomberait sur
      le `bg-gray-50` de la page et redessinerait une bande grise parasite.
      ⚠️ Les champs `bg-gray-100` ont besoin de ce fond blanc : sur `gray-50`
      l'écart tombe à 7 points et ils disparaissent.
    -->
    <div class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="container mx-auto px-4 py-3 md:px-6">
        <!-- Titre : desktop seulement, l'en-tête mobile sticky l'affiche déjà. -->
        <div class="mb-4 hidden md:block">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <!-- Left: Title -->
            <div class="max-w-2xl">
              <p class="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Exercice {{ selectedYear }}
              </p>

              <h1
                class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-3xl"
              >
                Budgets des Institutions
              </h1>

              <p class="mt-2 text-base text-gray-600 dark:text-gray-300">
                Assemblée nationale, Présidence et autres institutions
              </p>
            </div>
            <!-- Compteurs discrets : une ligne de texte, pas deux cartes. -->
            <dl class="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
              <div class="flex items-baseline gap-1.5">
                <dd class="font-semibold tabular-nums text-gray-900 dark:text-white">
                  {{ filteredInstitutions.length }}
                </dd>
                <dt class="text-gray-500 dark:text-gray-400">institutions</dt>
              </div>
              <div v-if="totalBudget" class="flex items-baseline gap-1.5">
                <dd
                  class="whitespace-nowrap font-semibold tabular-nums text-gray-900 dark:text-white"
                >
                  {{ formatBudget(totalBudget) }}
                </dd>
                <dt class="text-gray-500 dark:text-gray-400">Md FCFA de crédits de paiement</dt>
              </div>
            </dl>
          </div>
        </div>

        <!--
          Champ de recherche : motif identique à /actualites et
          /documents/public (fond gris rempli, pas de bordure, loupe à gauche,
          effacement rond à droite). Ne pas revenir à `UInput` : les défauts
          @nuxt/ui sortent en blanc bordé, étranger au reste du site.
        -->
        <div class="group relative">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <UIcon
              name="i-heroicons-magnifying-glass-20-solid"
              class="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-gray-500"
            />
          </div>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Rechercher une institution..."
            class="block w-full rounded-xl border-0 bg-gray-100 py-3 pl-11 pr-10 text-sm text-gray-900 ring-1 ring-transparent transition-all placeholder:text-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-gray-800/80 dark:focus:ring-gray-500 sm:py-2.5"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Effacer la recherche"
            @click="searchQuery = ''"
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600"
            >
              <UIcon
                name="i-heroicons-x-mark-20-solid"
                class="h-3.5 w-3.5 text-gray-600 dark:text-gray-300"
              />
            </span>
          </button>
        </div>

        <!--
          Filtres en pastilles dans une rangée scrollable, comme la rangée de
          filtres de /documents/public. Le libellé de l'option porte le sens
          (« 2027 — Projet de loi de finances », « vs 2026 — … ») : plus besoin
          des <label> + icônes au-dessus, qui faisaient « formulaire dashboard ».
        -->
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <div class="relative">
            <select
              :value="selectedYearVersion"
              :disabled="loadingYears"
              class="appearance-none rounded-full border-0 bg-gray-100 py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-500"
              aria-label="Exercice budgétaire"
              @change="handleYearVersionChange(($event.target as HTMLSelectElement).value)"
            >
              <!--
                `:selected` explicite : `selectedYearVersion` est un computed en
                lecture seule, on ne peut pas le binder en v-model, et Vue ne
                sérialise PAS `:value` d'un <select> en SSR -> sans ça, le HTML
                serveur affiche la 1re option au lieu de l'exercice choisi.
              -->
              <option
                v-for="opt in yearVersionOptions"
                :key="opt.value"
                :value="opt.value"
                :selected="opt.value === selectedYearVersion"
              >
                {{ opt.label }}
              </option>
            </select>
            <UIcon
              name="i-heroicons-chevron-down"
              class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
            />
          </div>

          <div v-if="compareYearVersionOptions.length" class="relative">
            <select
              v-model="selectedCompareYearVersion"
              class="appearance-none rounded-full border-0 bg-gray-100 py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-500"
              aria-label="Exercice de comparaison"
              @change="handleCompareChange(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in compareYearVersionOptions" :key="opt.value" :value="opt.value">
                {{ opt.value === 'none' ? opt.label : `vs ${opt.label}` }}
              </option>
            </select>
            <UIcon
              name="i-heroicons-chevron-down"
              class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>
      </div>
    </div>

    <main class="container mx-auto px-4 py-4 md:px-6 md:py-6">
      <!-- Content Section -->
      <!-- Pas de `mt-6` ici : le `py-4 md:py-6` de <main> assure deja l'ecart
           avec la bande d'en-tete. Les deux cumules faisaient 48 px de gris
           mort entre les filtres et le tableau. -->
      <div>
        <!-- Loading state -->
        <div v-if="pending" class="flex justify-center py-16">
          <div class="text-center">
            <div
              class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
            </div>
            <p class="font-medium text-gray-900 dark:text-white">Chargement des budgets</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Veuillez patienter...</p>
          </div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="mx-auto max-w-md py-12 text-center">
          <div
            class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30"
          >
            <UIcon name="i-heroicons-exclamation-triangle" class="h-10 w-10 text-red-500" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">Erreur de chargement</h3>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Impossible de charger les données des institutions
          </p>
          <UButton color="gray" variant="solid" class="mt-6" @click="refresh()">
            Réessayer
          </UButton>
        </div>

        <!-- No results -->
        <div
          v-else-if="filteredInstitutions.length === 0"
          class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-800"
        >
          <div
            class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
          >
            <UIcon name="i-heroicons-building-library" class="h-8 w-8 text-gray-400" />
          </div>
          <p class="text-lg font-medium text-gray-900 dark:text-white">
            Aucune institution trouvée
          </p>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {{ searchQuery ? `Aucun résultat pour "${searchQuery}"` : 'Aucune donnée disponible' }}
          </p>
          <UButton
            v-if="searchQuery"
            color="gray"
            variant="soft"
            class="mt-4"
            @click="searchQuery = ''"
          >
            Effacer la recherche
          </UButton>
        </div>

        <!-- Tableau des institutions -->
        <div
          v-else
          class="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700/50"
        >
          <BudgetBudget2TableMinistryV2
            entity-label="Institution"
            :ministries="filteredInstitutions"
            :year="selectedYear"
            :version="selectedVersion"
          />
        </div>
      </div>

      <!-- Navigation buttons -->
      <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
        <NuxtLink
          to="/budget-senegal/ministeres"
          class="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors active:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:active:bg-gray-800"
        >
          <UIcon name="i-heroicons-building-office-2" class="h-4 w-4" />
          Ministères
        </NuxtLink>
        <NuxtLink
          to="/budget-senegal"
          class="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors active:bg-gray-800 dark:bg-white dark:text-gray-900 dark:active:bg-gray-100"
        >
          <UIcon name="i-heroicons-chart-bar" class="h-4 w-4" />
          Dashboard
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { describeBudgetVersion } from '#shared/budget-version';

interface Institution {
  id: number;
  year: number;
  label: string;
  version: number;
  level: string;
  code: string;
  amount_cp: string;
  unit: string;
  public_entity: {
    name: string;
    id: number;
    logo?: string;
    slug?: string;
  };
  variation_percentage?: string | null;
  variation_color?: 'green' | 'red' | 'gray';
  previous_amount?: number | null;
}

// State
const searchQuery = ref('');
const selectedCompareYear = ref<number | null>(null);
const selectedCompareVersion = ref<number | null>(null);

// Fetch available years
const { data: yearsData, pending: loadingYears } = await useFetch<BudgetYearsData>(
  '/api/budget/years',
  BUDGET_YEARS_FETCH,
);

// ⚠️ Exercice sélectionné initialisé de façon SYNCHRONE au setup, depuis
// `latest` (dernier exercice publié + version prioritaire LFR > LFI > PLF).
// Avant : `ref(2026)` corrigé dans `onMounted` — donc le SERVEUR rendait
// « Budget 2026 » et les montants 2026, puis l'affichage sautait après
// hydratation (cf. CLAUDE.md § listes paginées & SSR). Aucune année en dur :
// un nouvel exercice publié au CMS devient le défaut tout seul.
// ⚠️ Exercice ET version dans UNE SEULE ref, jamais deux. Écrites séparément
// (`selectedYear.value = …; selectedVersion.value = …;`), il existe un instant
// où le couple est incohérent — année 2026 + version 8, celle du PLF 2027 — et
// ce couple partait réellement à `/api/budget/ministries` à chaque changement
// d'exercice (requête inutile, table momentanément vide). Même correctif que
// `useBudget`, où le symptôme était plus grave (404 + 500 envoyés à Sentry).
const selection = ref<{ year: number; version: number | null }>({
  year: yearsData.value?.latest?.year ?? new Date().getFullYear(),
  version: yearsData.value?.latest?.versionId ?? null,
});

const selectedYear = computed(() => selection.value.year);
const selectedVersion = computed(() => selection.value.version);

/** Change l'exercice et sa version en une écriture (pas de couple bâtard). */
const setYearVersion = (year: number, version: number | null) => {
  selection.value = { year, version };
};

// SEO — le titre et la description suivent l'exercice affiché. Getters
// réactifs : ils sont évalués au rendu, donc présents dans le HTML SSR.
// Aucune année en dur (cf. `shared/budget-version.ts`).
const selectedVersionLabel = computed(() => {
  const yearData = yearsData.value?.years?.find((y) => y.year === selectedYear.value);
  const found = yearData?.versions?.find((v) => v.id === selectedVersion.value);
  return describeBudgetVersion(found?.label);
});

const title = computed(() =>
  selectedYear.value
    ? `Budgets des institutions du Sénégal ${selectedYear.value}`
    : 'Budgets des institutions du Sénégal',
);

const description = computed(() =>
  selectedYear.value
    ? `Budget ${selectedYear.value} de chaque institution du Sénégal (${selectedVersionLabel.value.label.toLowerCase()}) : montants alloués, évolution et comparaison avec l'exercice précédent.`
    : 'Répartition détaillée des budgets par institution au Sénégal : Assemblée nationale, Présidence, Conseil constitutionnel, Cour des comptes et autres institutions de la République.',
);

// ⚠️ `ogUrl` doit être explicite : sans lui, le repli global de @nuxtjs/seo
// renvoie la RACINE du site, et tout partage de cette page pointait vers
// l'accueil (vérifié sur le HTML SSR de prod le 11/11/2026).
const { siteUrl } = useSiteMetadata();
const url = `${siteUrl}/budget-senegal/institutions`;
const image = `${siteUrl}/images/vpsn-share-budget.png`;

useSeoMeta({
  title: () => title.value,
  description: () => description.value,
  ogTitle: () => title.value,
  ogDescription: () => description.value,
  ogUrl: url,
  ogImage: image,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value,
  twitterDescription: () => description.value,
  twitterImage: image,
});

// Structured Data
useHead({
  script: [
    {
      // `key` obligatoire sur toute entrée JSON-LD (CLAUDE.md § SEO) :
      // sans elle, un `script` réactif duplique le nœud à l'hydratation.
      key: 'ld-institutions',
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'GovernmentService',
          name: 'Budgets des Institutions du Sénégal',
          description: description.value,
          url,
          provider: {
            '@type': 'GovernmentOrganization',
            name: 'République du Sénégal',
          },
          areaServed: {
            '@type': 'Country',
            name: 'Sénégal',
          },
        }),
      ),
    },
  ],
});

// Créer les options combinées année-version
const yearVersionOptions = computed(() => {
  if (!yearsData.value?.years) return [];

  const options: Array<{
    label: string;
    value: string;
    year: number;
    versionId: number | null;
    date: string;
  }> = [];

  yearsData.value.years.forEach((yearData: any) => {
    if (yearData.versions && yearData.versions.length > 0) {
      yearData.versions.forEach((ver: any) => {
        options.push({
          label: `${yearData.year} — ${describeBudgetVersion(ver.label).label}`,
          value: `${yearData.year}-${ver.id}`,
          year: yearData.year,
          versionId: ver.id,
          date: ver.date,
        });
      });
    }
  });

  // Trier par date décroissante (plus récent en premier)
  return options.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
});

// Options de comparaison (seulement les versions antérieures à la sélection actuelle)
const compareYearVersionOptions = computed(() => {
  const currentOption = yearVersionOptions.value.find(
    (opt) => opt.year === selectedYear.value && opt.versionId === selectedVersion.value,
  );

  if (!currentOption) return [];

  const currentDate = new Date(currentOption.date);

  // Filtrer uniquement les versions antérieures
  const olderOptions = yearVersionOptions.value.filter((opt) => {
    const optionDate = new Date(opt.date);
    return optionDate < currentDate;
  });

  // Ajouter l'option "Aucune comparaison"
  return [
    { label: 'Aucune comparaison', value: 'none', year: 0, versionId: null, date: '' },
    ...olderOptions,
  ];
});

// Valeur sélectionnée actuelle
const selectedYearVersion = computed(() => {
  if (selectedVersion.value === null) {
    return yearVersionOptions.value[0]?.value || '';
  }
  return `${selectedYear.value}-${selectedVersion.value}`;
});

// Valeur de comparaison sélectionnée
const selectedCompareYearVersion = ref<string>('none');

// Gestion du changement de sélection
const handleYearVersionChange = (value: string) => {
  const option = yearVersionOptions.value.find((opt) => opt.value === value);
  if (option) {
    setYearVersion(option.year, option.versionId);
    // Réinitialiser la comparaison quand on change la version principale
    selectedCompareYearVersion.value = 'none';
    selectedCompareYear.value = null;
    selectedCompareVersion.value = null;
  }
};

// Gestion du changement de comparaison
const handleCompareChange = (value: string) => {
  if (value === 'none') {
    selectedCompareYear.value = null;
    selectedCompareVersion.value = null;
  } else {
    const option = yearVersionOptions.value.find((opt) => opt.value === value);
    if (option) {
      selectedCompareYear.value = option.year;
      selectedCompareVersion.value = option.versionId;
    }
  }
};

// Fetch institutions data
const {
  data: institutionsData,
  pending,
  error,
  refresh,
} = await useFetch('/api/budget/ministries', {
  query: computed(() => ({
    year: selectedYear.value,
    version: selectedVersion.value,
    level: 'institution',
    compareYear: selectedCompareYear.value,
    compareVersion: selectedCompareVersion.value,
  })),
  watch: [selectedYear, selectedVersion, selectedCompareYear, selectedCompareVersion],
});

const institutions = computed<Institution[]>(() => {
  return institutionsData.value?.ministries || [];
});

// Filter institutions based on search
const filteredInstitutions = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return institutions.value;

  return institutions.value.filter(
    (i) =>
      i.public_entity.name.toLowerCase().includes(query) ||
      i.label.toLowerCase().includes(query) ||
      i.code.includes(query),
  );
});

// Calculate total budget
const totalBudget = computed(() => {
  return filteredInstitutions.value.reduce((sum, i) => {
    const amount = parseFloat(i.amount_cp) || 0;
    return sum + amount;
  }, 0);
});

// Format budget for display
// Les montants arrivent DÉJÀ en milliards : une décimale suffit. Sans cela,
// `toLocaleString` rendait « 296,615 », qui se lit « 296 615 » et trompe.
const formatBudget = (value: number) => {
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}Md`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
};
</script>
