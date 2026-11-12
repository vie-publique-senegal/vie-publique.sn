<template>
  <div class="min-h-screen bg-gray-50 pb-24 dark:bg-gray-900">
    <!-- Breadcrumb -->
    <div class="container mx-auto px-4 pt-4">
      <AppBreadcrumb :items="[{ label: 'Budget' }]" />
    </div>

    <!-- Header mobile-first -->
    <header
      class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95 md:relative md:border-0 md:bg-transparent md:backdrop-blur-none"
    >
      <div class="container mx-auto px-4 py-3 md:py-6">
        <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
          Budget du Sénégal
        </h1>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-300 md:mt-1 md:text-sm">
          Finances publiques et documents officiels
        </p>
      </div>
    </header>

    <main class="container mx-auto px-4 py-4 md:py-6">
      <!-- Dashboard Hero Card -->
      <NuxtLink
        to="/budget-senegal/dashboard"
        class="group mb-6 block rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-shadow motion-safe:active:scale-[0.99] dark:bg-gray-800 dark:ring-gray-700/50 md:p-6 md:hover:shadow-md"
      >
        <div class="mb-3 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="text-lg font-bold text-gray-900 dark:text-white md:text-xl">
              {{ dashboardTitle }}
            </h2>
            <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-300">
              {{ versionLabel }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-arrow-right"
            class="mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform motion-safe:group-hover:translate-x-1 dark:text-gray-500"
            aria-hidden="true"
          />
        </div>

        <!-- Statut du texte : un projet de loi n'est pas une loi adoptée. -->
        <p
          v-if="version?.status"
          class="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 md:text-xs"
        >
          <UIcon
            :name="version.isDraft ? 'i-heroicons-clock' : 'i-heroicons-check-badge'"
            class="h-3.5 w-3.5"
          />
          {{ version.status }}
        </p>

        <!-- Description -->
        <p class="mb-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300 md:text-sm">
          {{ dashboardDescription }}
        </p>

        <!-- Montants du dernier exercice publié (jamais en dur).
             Surface neutre + filet de catégorie : la couleur identifie la ligne
             budgétaire, elle ne décore pas et ne juge pas la variation. -->
        <div v-if="stats.length" class="grid grid-cols-3 gap-2 md:gap-4">
          <div
            v-for="stat in stats"
            :key="stat.code"
            class="rounded-xl p-3 dark:bg-gray-700"
            :class="kpiStyles[stat.code]?.surface"
          >
            <div>
              <p
                class="text-[10px] font-medium uppercase tracking-wide md:text-xs"
                :class="kpiStyles[stat.code]?.label"
              >
                {{ stat.label }}
              </p>
              <p
                class="mt-1 whitespace-nowrap text-lg font-bold tabular-nums text-gray-900 dark:text-white md:text-2xl"
              >
                {{ stat.formattedValue }}
              </p>
              <div class="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span class="text-[10px] text-gray-500 dark:text-gray-300 md:text-xs">
                  Md FCFA
                </span>
                <BudgetVariationBadge
                  :value="stat.change"
                  size="xs"
                  :title="compareYear ? `Variation par rapport à ${compareYear}` : undefined"
                />
              </div>
            </div>
          </div>
        </div>
      </NuxtLink>

      <!-- Navigation Links - Mobile: vertical list, Desktop: grid -->
      <div class="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-4">
        <!-- Ministères -->
        <NuxtLink
          to="/budget-senegal/ministeres"
          class="group flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 motion-safe:active:scale-[0.98] dark:bg-gray-800 dark:ring-gray-700/50 md:flex-col md:items-start md:gap-0 md:p-4 md:hover:shadow-md"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 md:mb-3"
          >
            <UIcon
              name="i-heroicons-building-office"
              class="h-5 w-5 text-blue-600 dark:text-blue-300"
            />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white md:text-base">
              Ministères
            </h3>
            <p class="truncate text-xs text-gray-500 dark:text-gray-300">Budgets et programmes</p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600 md:hidden"
          />
        </NuxtLink>

        <!-- Institutions -->
        <NuxtLink
          to="/budget-senegal/institutions"
          class="group flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 motion-safe:active:scale-[0.98] dark:bg-gray-800 dark:ring-gray-700/50 md:flex-col md:items-start md:gap-0 md:p-4 md:hover:shadow-md"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950 md:mb-3"
          >
            <UIcon
              name="i-heroicons-building-library"
              class="h-5 w-5 text-violet-600 dark:text-violet-300"
            />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white md:text-base">
              Institutions
            </h3>
            <p class="truncate text-xs text-gray-500 dark:text-gray-300">
              Assemblée, Présidence...
            </p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600 md:hidden"
          />
        </NuxtLink>

        <!-- Documents -->
        <NuxtLink
          to="/documents/budget"
          class="group flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 motion-safe:active:scale-[0.98] dark:bg-gray-800 dark:ring-gray-700/50 md:flex-col md:items-start md:gap-0 md:p-4 md:hover:shadow-md"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950 md:mb-3"
          >
            <UIcon
              name="i-heroicons-document-text"
              class="h-5 w-5 text-orange-600 dark:text-orange-300"
            />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white md:text-base">
              Documents
            </h3>
            <p class="truncate text-xs text-gray-500 dark:text-gray-300">Loi de finances</p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600 md:hidden"
          />
        </NuxtLink>

        <!-- Glossaire -->
        <NuxtLink
          to="/budget-senegal/glossaire"
          class="group flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 motion-safe:active:scale-[0.98] dark:bg-gray-800 dark:ring-gray-700/50 md:flex-col md:items-start md:gap-0 md:p-4 md:hover:shadow-md"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950 md:mb-3"
          >
            <UIcon name="i-heroicons-book-open" class="h-5 w-5 text-teal-600 dark:text-teal-300" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white md:text-base">
              Glossaire
            </h3>
            <p class="truncate text-xs text-gray-500 dark:text-gray-300">Termes et concepts</p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600 md:hidden"
          />
        </NuxtLink>
      </div>

      <!-- Section Comprendre le Budget -->
      <section class="mt-6 md:mt-8">
        <div class="mb-4">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Comprendre le Budget</h2>
        </div>
        <div
          class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700/50 md:p-6"
        >
          <BudgetArticles />
        </div>
      </section>

      <!-- Section Documents Budget -->
      <section class="mt-6 md:mt-8">
        <div class="mb-4">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Documents officiels</h2>
        </div>
        <div
          class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700/50 md:p-6"
        >
          <BudgetDocuments />
        </div>
      </section>
    </main>

    <ScrollToTopButton />
  </div>
</template>

<script setup lang="ts">
import { budgetVersionArticle } from '#shared/budget-version';

// Dernier exercice budgétaire publié : rien n'est écrit en dur, la page suit
// les données du CMS (cf. `useBudgetLatest`).
const { summary, year, version, stats } = useBudgetLatest();

const compareYear = computed(() => summary.value?.compareYear ?? null);

const versionLabel = computed(() => version.value?.label || 'Finances publiques');

const dashboardTitle = computed(() =>
  year.value ? `Tableau de bord ${year.value}` : 'Tableau de bord',
);

// Le texte doit rester juste quel que soit le statut du budget affiché : un
// projet de loi « ne sert pas de cadre d'exécution », il est encore en débat.
const dashboardDescription = computed(() => {
  if (!year.value || !version.value) {
    return "Explorez les prévisions de ressources et de dépenses de l'État, par ministère et par institution.";
  }

  const article = budgetVersionArticle(version.value);

  if (version.value.isDraft) {
    return `${article} ${version.value.label.toLowerCase()} ${year.value} présente les prévisions de ressources et de dépenses de l'État. Il est en cours d'examen au Parlement et n'a pas encore été adopté.`;
  }

  return `${article} ${version.value.label.toLowerCase()} ${year.value} fixe les ressources et les dépenses de l'État pour l'année. ${version.value.gender === 'm' ? 'Il' : 'Elle'} sert de cadre d'exécution pour l'action publique.`;
});

// ⚠️ Classes écrites en toutes lettres : l'extracteur Tailwind ne voit pas les
// couleurs construites dynamiquement (même piège que HomeBudgetHighlight).
// ⚠️ Classes écrites en toutes lettres : l'extracteur Tailwind ne voit pas les
// couleurs construites dynamiquement.
// La couleur se limite au filet et au libellé — pas de fond teinté, et surtout
// pas d'opacité en dark (`dark:bg-<x>-900/20` rendait un bleu délavé, cf. guide).
const kpiStyles: Record<string, Record<'surface' | 'label', string>> = {
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

// SEO — le titre et la description suivent l'exercice publié. Getters réactifs
// (cf. CLAUDE.md § SEO règle 4) : évalués au rendu, donc présents en SSR.
const title = computed(() =>
  year.value ? `Budget ${year.value} de l'État du Sénégal` : "Budget de l'État du Sénégal",
);

const description = computed(() => {
  const expense = stats.value.find((s) => s.code === 'expense_total');
  const revenue = stats.value.find((s) => s.code === 'revenue_total');

  if (!year.value || !version.value?.code || !expense || !revenue) {
    return "Découvrez le budget de l'État du Sénégal : tableau de bord, budgets par ministère et institution, documents officiels et articles pour comprendre les finances publiques.";
  }

  return `${version.value.label} ${year.value} : ${expense.formattedValue} milliards FCFA de dépenses, ${revenue.formattedValue} de recettes. Tableau de bord, budgets par ministère et par institution, documents officiels.`;
});

// ⚠️ `ogUrl` doit être explicite : sans lui, le repli global de @nuxtjs/seo
// renvoie la RACINE du site, et tout partage de cette page pointait vers
// l'accueil (vérifié sur le HTML SSR de prod le 11/11/2026).
const { siteUrl } = useSiteMetadata();
const url = `${siteUrl}/budget-senegal`;
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
</script>
