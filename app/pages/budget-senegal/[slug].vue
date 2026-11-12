<script setup lang="ts">
import { describeBudgetVersion } from '#shared/budget-version';

const route = useRoute();
const slug = route.params.slug as string;

// Utilisation du composable
const {
  entity,
  level,
  latestYear,
  loading,
  error,
  currentBudget,
  budgetVariation,
  evolutionChartData,
  formattedPrograms,
} = useBudgetEntity(slug);

// Statut du texte budgétaire affiché. Règle éditoriale : partout où l'année
// apparaît, le lecteur doit savoir s'il regarde un PROJET en cours d'examen ou
// une loi votée — « Budget 2027 » seul serait un contresens.
const budgetVersion = computed(() => describeBudgetVersion(latestYear.value?.version_label));

// Libellé de l'exercice servant de base à la variation, tiré de l'historique
// déjà chargé (avant-dernier point). Aucune donnée recalculée : on nomme juste
// ce à quoi on compare, « vs année précédente » étant trop vague.
const comparaisonLabel = computed(() => {
  const historique = evolutionChartData.value;
  const precedent = historique.length >= 2 ? historique[historique.length - 2] : null;
  if (!precedent) return "par rapport à l'exercice précédent";

  const version = describeBudgetVersion(precedent.label.match(/\(([^)]+)\)/)?.[1]);
  return `par rapport à la ${version.label.toLowerCase()} ${precedent.year}`;
});

// SEO
const { siteName, siteUrl, keywords, themeColor } = useSiteMetadata();

// ⚠️ Pas de « - Sénégal » ici : le `titleTemplate` global ajoute déjà la marque,
// et les noms de ministères sont longs (on dépassait 85 caractères).
const title = computed(() => {
  if (!entity.value) return 'Budget - Sénégal';
  const exercice = latestYear.value?.year;
  return exercice ? `Budget ${exercice} - ${entity.value.name}` : `Budget - ${entity.value.name}`;
});

const description = computed(() => {
  if (!entity.value) return "Budget de l'État du Sénégal";
  const exercice = latestYear.value?.year;
  const texte = budgetVersion.value.code ? ` (${budgetVersion.value.label.toLowerCase()})` : '';
  const details = 'montant total, évolution par année et répartition par programmes.';
  return exercice
    ? `Budget ${exercice}${texte} — ${entity.value.name} : ${details}`
    : `Budget — ${entity.value.name} : ${details}`;
});

// Pas de logo en base pour les entités budget → image de partage statique dédiée
const image = computed(() => `${siteUrl}/images/vpsn-share-budget.png`);

const url = computed(() => `${siteUrl}/budget-senegal/${slug}`);

// SEO Setup
useSeoMeta({
  title: () => title.value,
  ogTitle: () => title.value,
  description: () => description.value,
  ogDescription: () => description.value,
  ogImage: () => image.value,
  ogImageAlt: () => (entity.value ? `Budget ${entity.value.name}` : "Budget de l'État du Sénégal"),
  ogUrl: () => url.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value,
  twitterDescription: () => description.value,
  twitterImage: () => image.value,
  keywords: () =>
    [
      ...keywords,
      'Budget Sénégal',
      entity.value?.name || '',
      'ministère',
      'institution',
      'finances publiques',
    ].join(', '),
});

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: () => [{ rel: 'canonical', href: url.value }],
  meta: [
    { name: 'theme-color', content: themeColor },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
    { name: 'robots', content: 'index, follow' },
  ],
});

// Nœud d'entité propre à la page, en JSON-LD brut (pattern majoritaire du
// projet). `key` obligatoire : sans elle, un `script` réactif duplique le nœud
// à l'hydratation — invisible en SSR, visible au test Rich Results.
const entitySchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'GovernmentOrganization',
  name: entity.value?.name,
  url: url.value,
  description: description.value,
  parentOrganization: {
    '@type': 'GovernmentOrganization',
    name: 'République du Sénégal',
  },
  areaServed: {
    '@type': 'Country',
    name: 'Sénégal',
  },
}));

useHead({
  script: [
    {
      key: 'ld-budget-entity',
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(entitySchema.value)),
    },
  ],
});

// Structured Data
useSchemaOrg([
  // Breadcrumb émis par <AppBreadcrumb> (source unique) — pas de defineBreadcrumb ici
  // pour éviter la fusion @graph qui dupliquait les items (§7 CLAUDE.md).
  defineWebPage({
    name: () => title.value,
    description: () => description.value,
    url: () => url.value,
  }),
]);

// Format budget en milliards
// 1 décimale : « 980,8 » plutôt que « 980,813 » — on parle de milliards,
// les millièmes ne disent rien au lecteur et allongent le nombre pour rien.
const formatBudget = (value: number) => {
  if (!value) return '0';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24 dark:bg-gray-900">
    <!-- Sticky Header Mobile -->
    <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-lg dark:bg-gray-950/95 md:hidden">
      <!--
        Le nom d'une entité publique est long (« Ministère de l'Éducation
        nationale ») : on lui laisse DEUX lignes plutôt que de le tronquer, quitte
        à ce que l'en-tête soit un peu plus haut. Retour et partage sont alignés
        en haut (`items-start`) pour ne pas flotter au milieu d'un titre à deux
        lignes, et le partage est en icône seule (le libellé prenait 160 px sur 390).
      -->
      <div class="flex items-start gap-3 px-4 py-3">
        <NuxtLink
          to="/budget-senegal"
          class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 active:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:active:bg-gray-700"
          aria-label="Retour au budget"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4 text-gray-600 dark:text-gray-300" />
        </NuxtLink>

        <div class="min-w-0 flex-1">
          <p
            class="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-300"
          >
            {{ level === 'institution' ? 'Institution' : 'Ministère' }}
          </p>
          <p
            v-if="entity"
            class="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900 dark:text-white"
          >
            {{ entity.name }}
          </p>
          <USkeleton v-else class="h-5 w-48" />
        </div>

        <div class="partage-mobile mt-0.5 shrink-0">
          <SocialShare v-if="entity" :title="entity.name" :url="url" compact />
        </div>
      </div>
    </header>

    <!-- Desktop Layout -->
    <div class="hidden md:block">
      <!-- Top Bar with AppBreadcrumb -->
      <div class="bg-white dark:bg-transparent">
        <div class="container mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <AppBreadcrumb
              :items="[
                { label: 'Budget', to: '/budget-senegal' },
                {
                  label: level === 'institution' ? 'Institutions' : 'Ministères',
                  to:
                    level === 'institution'
                      ? '/budget-senegal/institutions'
                      : '/budget-senegal/ministeres',
                },
                { label: entity?.name || 'Chargement...' },
              ]"
            />
            <SocialShare v-if="entity" :title="entity.name" :url="url" />
          </div>
        </div>
      </div>

      <!-- Hero Content -->
      <div
        v-if="entity && !loading"
        class="bg-gradient-to-b from-gray-50 to-white dark:bg-transparent dark:bg-none"
      >
        <div class="container mx-auto px-6 py-12">
          <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <!-- Left: Entity Info -->
            <div class="max-w-2xl">
              <div
                class="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-800"
              >
                <div
                  class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-600 dark:bg-gray-500"
                >
                  <UIcon
                    :name="
                      level === 'institution'
                        ? 'i-heroicons-building-library'
                        : 'i-heroicons-building-office-2'
                    "
                    class="h-3.5 w-3.5 text-white"
                  />
                </div>
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ level === 'institution' ? 'Institution' : 'Ministère' }}
                </span>
              </div>

              <h1
                class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-4xl"
              >
                {{ entity.name }}
              </h1>

              <p v-if="latestYear" class="mt-3 text-lg text-gray-600 dark:text-gray-300">
                Données budgétaires pour l'exercice {{ latestYear.year }}
              </p>
              <p
                v-if="latestYear && budgetVersion.status"
                class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600"
              >
                <UIcon
                  :name="budgetVersion.isDraft ? 'i-heroicons-clock' : 'i-heroicons-check-badge'"
                  class="h-3.5 w-3.5 shrink-0"
                />
                {{ budgetVersion.label }} · {{ budgetVersion.status }}
              </p>
            </div>

            <!-- Right: Budget Summary Card -->
            <div v-if="currentBudget" class="w-full lg:w-auto">
              <!--
                ⚠️ `whitespace-nowrap` + unité dans le même bloc : le montant se
                coupait de son unité (« 980,813 » / « Mds » sur deux lignes).
                `tabular-nums` aligne les chiffres d'une carte à l'autre.
                Pas d'opacité sur la surface en dark (`bg-gray-800/50` donnait un
                aplat délavé) — couleur pleine, cf. guide design.
              -->
              <div
                class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700/50"
              >
                <p class="text-sm font-medium text-gray-500 dark:text-gray-300">Budget total</p>

                <p class="mt-1 whitespace-nowrap text-gray-900 dark:text-white">
                  <span class="text-4xl font-bold tabular-nums tracking-tight">
                    {{ formatBudget(currentBudget) }}
                  </span>
                  <span class="ml-1 text-lg font-medium text-gray-500 dark:text-gray-300">
                    Md FCFA
                  </span>
                </p>

                <p class="mt-1 text-xs text-gray-500 dark:text-gray-300">Crédits de paiement</p>

                <div
                  v-if="budgetVariation !== null && budgetVariation !== undefined"
                  class="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-700"
                >
                  <BudgetVariationBadge :value="budgetVariation" size="sm" />
                  <span class="text-sm text-gray-500 dark:text-gray-300">
                    {{ comparaisonLabel }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Hero -->
      <div
        v-else-if="loading"
        class="bg-gradient-to-b from-gray-50 to-white dark:bg-transparent dark:bg-none"
      >
        <div class="container mx-auto px-6 py-12">
          <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div class="max-w-2xl">
              <USkeleton class="mb-4 h-8 w-32 rounded-full" />
              <USkeleton class="h-12 w-96" />
              <USkeleton class="mt-3 h-6 w-64" />
            </div>
            <USkeleton class="h-40 w-80 rounded-xl" />
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Budget Card -->
    <div v-if="entity && currentBudget && !loading" class="px-4 pt-4 md:hidden">
      <div
        class="overflow-hidden rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700/50"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p
              class="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-300"
            >
              Budget Total
            </p>
            <p class="mt-1 whitespace-nowrap text-gray-900 dark:text-white">
              <span class="text-2xl font-bold tabular-nums tracking-tight">
                {{ formatBudget(currentBudget) }}
              </span>
              <span class="ml-1 text-sm font-medium text-gray-500 dark:text-gray-300">
                Md FCFA
              </span>
            </p>
            <p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-300">
              Crédits de paiement · {{ latestYear?.year }}
            </p>
          </div>
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
          >
            <UIcon name="i-heroicons-banknotes" class="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </div>
        </div>
        <div
          v-if="budgetVariation !== null && budgetVariation !== undefined"
          class="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800"
        >
          <BudgetVariationBadge :value="budgetVariation" size="xs" />
          <span class="text-[11px] text-gray-500 dark:text-gray-300">
            {{ comparaisonLabel }}
          </span>
        </div>
      </div>
    </div>

    <main class="container mx-auto px-4 py-4 md:px-6 md:py-6">
      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <USkeleton class="h-64 w-full rounded-xl" />
        <USkeleton class="h-48 w-full rounded-xl" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="mx-auto max-w-md py-12 text-center">
        <div
          class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30"
        >
          <UIcon name="i-heroicons-exclamation-triangle" class="h-10 w-10 text-red-500" />
        </div>
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Données indisponibles</h3>
        <p class="mt-2 text-gray-600 dark:text-gray-300">
          Impossible de charger les informations budgétaires pour cette entité.
        </p>
        <NuxtLink
          to="/budget-senegal"
          class="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
          Retour au budget
        </NuxtLink>
      </div>

      <!-- Content -->
      <div v-else-if="entity" class="space-y-6">
        <!-- Evolution Chart -->
        <section
          v-if="evolutionChartData.length > 0"
          class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700/50 md:p-6"
        >
          <div class="mb-5">
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Évolution</h2>
              <p class="text-sm text-gray-500 dark:text-gray-300">Historique des budgets alloués</p>
            </div>
          </div>
          <BudgetEntityEvolutionChart :data="evolutionChartData" />
        </section>

        <!-- Programs Table -->
        <section
          v-if="formattedPrograms.length > 0"
          class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700/50 md:p-6"
        >
          <div class="mb-5">
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Programmes</h2>
              <p class="text-sm text-gray-500 dark:text-gray-300">
                Répartition budgétaire {{ latestYear?.year }}
              </p>
            </div>
          </div>
          <BudgetEntityProgramsTable :programs="formattedPrograms" />
        </section>

        <!-- Empty Programs -->
        <div
          v-else
          class="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-800"
        >
          <div
            class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
          >
            <UIcon name="i-heroicons-document-chart-bar" class="h-8 w-8 text-gray-400" />
          </div>
          <p class="font-medium text-gray-900 dark:text-white">Aucun programme renseigné</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-300">
            Les détails par programme ne sont pas disponibles pour cette entité.
          </p>
        </div>

        <!-- Quick Links -->
        <div class="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:justify-center">
          <NuxtLink
            to="/budget-senegal/ministeres"
            class="flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 active:bg-gray-100 motion-safe:active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-700 dark:active:bg-gray-700 md:py-2.5"
          >
            <UIcon name="i-heroicons-building-office-2" class="h-5 w-5" />
            Tous les ministères
          </NuxtLink>
          <NuxtLink
            to="/budget-senegal/institutions"
            class="flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 active:bg-gray-100 motion-safe:active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-700 dark:active:bg-gray-700 md:py-2.5"
          >
            <UIcon name="i-heroicons-building-library" class="h-5 w-5" />
            Toutes les institutions
          </NuxtLink>
        </div>
      </div>
    </main>

    <ScrollToTopButton />
  </div>
</template>

<style scoped>
/* Le libellé du bouton de partage est masqué sur petit écran : l'icône suffit,
   et le nom de l'entité récupère la largeur. `:deep` parce que la classe vit
   dans le composant partagé `SocialShare`, qu'on ne veut pas modifier ici. */
@media (max-width: 639px) {
  .partage-mobile :deep(.share-btn__label) {
    display: none;
  }
}
</style>
