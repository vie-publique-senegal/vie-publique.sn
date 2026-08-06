<script setup lang="ts">
import type { AssemblyQuestion } from '~~/types/assembly';

// Page dédiée : toutes les questions écrites d'un député.
// URL : /assemblee-nationale/deputes/<id>/<nom-prenom>/questions
// Recherche (?q=) sur le titre ET le contenu, insensible à la casse et aux
// accents (index replié côté serveur), pagination à 20 par page.

// --- 1. Route & données (avant tout helper/computed) -------------------------
const { siteName, siteUrl, keywords, themeColor } = useSiteMetadata();
const route = useRoute();

const deputyId = computed(() => route.params.id as string);

const {
  deputy,
  loading: deputyLoading,
  error: deputyError,
} = useAssemblyDeputies({
  id: deputyId.value,
});

const {
  questions,
  loading: questionsLoading,
  error: questionsError,
  currentPage,
  itemsPerPage,
  totalItems,
  totalPages,
  searchQuery,
  setCurrentPage,
} = useAssemblyQuestions({ deputyId, limit: 20 });

// --- 2. Fonctions helper -----------------------------------------------------
const formatDateISO = (date?: string | null) => (date ? new Date(date).toISOString() : '');

const buildDeputySlug = (firstName?: string, lastName?: string) =>
  `${firstName || ''}-${lastName || ''}`
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// --- 3. Computed d'affichage & SEO -------------------------------------------
const deputyFullName = computed(() =>
  deputy.value ? `${deputy.value.first_name} ${deputy.value.last_name}`.trim() : '',
);

// Slug dérivé des DONNÉES (jamais de route.fullPath) : le canonical doit rester
// stable quel que soit le slug tapé dans l'URL ou les query params (audit BING-6).
const deputySlug = computed(() =>
  deputy.value ? buildDeputySlug(deputy.value.first_name, deputy.value.last_name) : '',
);

const deputyUrl = computed(
  () => `${siteUrl}/assemblee-nationale/deputes/${deputyId.value}/${deputySlug.value}`,
);

/** URL canonique : sans le paramètre de recherche, avec la page si > 1. */
const canonicalUrl = computed(() => {
  const base = `${deputyUrl.value}/questions`;
  return currentPage.value > 1 ? `${base}?page=${currentPage.value}` : base;
});

/** Une recherche produit un espace d'URLs infini → jamais indexable (§SEO 10). */
const isSearching = computed(() => Boolean(searchQuery.value));

const loading = computed(() => deputyLoading.value || questionsLoading.value);

const title = computed(() =>
  deputyFullName.value
    ? `Questions écrites de ${deputyFullName.value} | Assemblée nationale`
    : 'Questions écrites du député | Assemblée nationale',
);

const description = computed(() => {
  if (!deputyFullName.value) return 'Questions écrites posées à l’Assemblée nationale du Sénégal.';
  const count = totalItems.value ? `${totalItems.value} ` : '';
  return `Consultez les ${count}questions écrites posées par ${deputyFullName.value}, député à l'Assemblée nationale du Sénégal. Recherche par titre ou par contenu.`;
});

const image = computed(() => {
  const photo = deputy.value?.photo;
  if (typeof photo !== 'string') return `${siteUrl}/images/questions-ecrites-assemblee.webp`;
  const relative = useCmsImage(photo);
  return relative.startsWith('http') ? relative : `${siteUrl}${relative}`;
});

// Nœud propre à la page. Le @graph global (WebSite / WebPage / Organization) et
// le BreadcrumbList d'<AppBreadcrumb> ne sont PAS réémis ici (§7 CLAUDE.md).
const collectionSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: title.value,
  description: description.value,
  url: canonicalUrl.value,
  about: deputyFullName.value
    ? {
        '@type': 'Person',
        name: deputyFullName.value,
        jobTitle: 'Député',
        url: deputyUrl.value,
      }
    : undefined,
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: totalItems.value,
    itemListElement: questions.value.map((question: AssemblyQuestion, index: number) => ({
      '@type': 'ListItem',
      position: (currentPage.value - 1) * itemsPerPage.value + index + 1,
      url: `${siteUrl}/assemblee-nationale/questions/${question.id}/${question.slug || 'question'}`,
      name: truncateText(cleanCmsText(question.subject), 110),
    })),
  },
}));

// --- 4. Meta (en dernier : les getters lisent les computed ci-dessus) --------
useSeoMeta({
  title: () => title.value,
  ogTitle: () => title.value,
  description: () => description.value,
  ogDescription: () => description.value,
  ogImage: () => image.value,
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value,
  twitterDescription: () => description.value,
  twitterImage: () => image.value,
  keywords: () =>
    [
      ...keywords,
      deputyFullName.value,
      `questions écrites ${deputyFullName.value}`,
      'questions écrites Assemblée nationale',
      'contrôle parlementaire Sénégal',
      'activité parlementaire Sénégal',
    ]
      .filter(Boolean)
      .join(', '),
});

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: () => [{ rel: 'canonical', href: canonicalUrl.value }],
  meta: [
    { name: 'theme-color', content: themeColor },
    { name: 'author', content: siteName },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
    { name: 'robots', content: () => (isSearching.value ? 'noindex, follow' : 'index, follow') },
    { name: 'geo.region', content: 'SN' },
    { name: 'geo.placename', content: 'Dakar' },
  ],
  script: [
    {
      key: 'ld-deputy-questions',
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(collectionSchema.value)),
    },
  ],
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20 dark:bg-gray-900">
    <!-- Breadcrumb (source UNIQUE du BreadcrumbList) -->
    <div class="container mx-auto px-4 pt-4">
      <AppBreadcrumb
        :items="[
          { label: 'Assemblée nationale', to: '/assemblee-nationale' },
          { label: 'Députés', to: '/assemblee-nationale/deputes' },
          {
            label: deputyFullName || 'Député',
            to: deputySlug ? `/assemblee-nationale/deputes/${deputyId}/${deputySlug}` : undefined,
          },
          { label: 'Questions écrites' },
        ]"
      />
    </div>

    <!-- Header -->
    <header
      class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95 md:relative md:border-0 md:bg-transparent md:backdrop-blur-none"
    >
      <div class="container mx-auto px-4 py-3 md:py-4">
        <div class="flex items-center gap-3">
          <NuxtLink
            :to="
              deputySlug
                ? `/assemblee-nationale/deputes/${deputyId}/${deputySlug}`
                : '/assemblee-nationale/deputes'
            "
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            aria-label="Retour au profil du député"
          >
            <UIcon
              name="i-heroicons-arrow-left-20-solid"
              class="h-5 w-5 text-gray-600 dark:text-gray-300"
            />
          </NuxtLink>

          <CmsImage
            v-if="deputy?.photo"
            :src="deputy.photo"
            :alt="deputyFullName"
            class="h-10 w-10 shrink-0 rounded-full object-cover"
          />

          <div class="min-w-0 flex-1">
            <h1 class="truncate text-base font-bold text-gray-900 dark:text-white md:text-xl">
              Questions écrites de {{ deputyFullName || '…' }}
            </h1>
            <p v-if="!loading" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {{ totalItems }} question{{ totalItems > 1 ? 's' : '' }}
              {{ isSearching ? 'trouvée' + (totalItems > 1 ? 's' : '') : 'au total' }}
            </p>
          </div>
        </div>

        <!-- Recherche (?q=) — titre et contenu, insensible aux accents -->
        <div class="group relative mt-3">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <UIcon
              name="i-heroicons-magnifying-glass-20-solid"
              class="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-gray-500"
            />
          </div>
          <input
            v-model="searchQuery"
            type="search"
            aria-label="Rechercher dans les questions de ce député"
            placeholder="Rechercher par titre ou contenu..."
            class="block w-full rounded-xl border-0 bg-gray-100 py-3 pl-11 pr-10 text-sm text-gray-900 ring-1 ring-transparent transition-all placeholder:text-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-gray-800/80 dark:focus:ring-gray-500 sm:py-2.5"
          />
          <button
            v-if="searchQuery"
            type="button"
            aria-label="Effacer la recherche"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
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
      </div>
    </header>

    <main class="container mx-auto px-4 py-4">
      <!-- Loading -->
      <div v-if="loading" class="space-y-2">
        <div
          v-for="i in 6"
          :key="i"
          class="space-y-2 rounded-xl bg-white p-4 ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
        >
          <USkeleton class="h-2 w-20" />
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-2/3" />
        </div>
      </div>

      <!-- Erreur -->
      <div
        v-else-if="deputyError || questionsError"
        class="rounded-2xl bg-red-50 p-6 text-center dark:bg-red-900/20"
      >
        <UIcon
          name="i-heroicons-exclamation-triangle"
          class="mx-auto mb-3 h-10 w-10 text-red-500"
        />
        <h2 class="font-semibold text-red-800 dark:text-red-200">Erreur de chargement</h2>
        <p class="mt-1 text-sm text-red-600 dark:text-red-300">
          Impossible de charger les questions de ce député
        </p>
      </div>

      <!-- Vide -->
      <div
        v-else-if="questions.length === 0"
        class="rounded-2xl bg-white py-16 text-center ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
      >
        <UIcon
          name="i-heroicons-chat-bubble-left-right"
          class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600"
        />
        <h2 class="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
          Aucune question trouvée
        </h2>
        <p class="mb-4 px-4 text-xs text-gray-500 dark:text-gray-400">
          {{
            isSearching
              ? 'Essayez d’autres mots-clés.'
              : 'Aucune question écrite référencée pour ce député.'
          }}
        </p>
        <button
          v-if="isSearching"
          type="button"
          class="rounded-full bg-gray-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900"
          @click="searchQuery = ''"
        >
          Réinitialiser la recherche
        </button>
      </div>

      <!-- Liste -->
      <div v-else class="space-y-2">
        <NuxtLink
          v-for="question in questions"
          :key="question.id"
          :to="`/assemblee-nationale/questions/${question.id}/${question.slug || 'question'}`"
          class="group flex gap-3 rounded-xl bg-white p-3 ring-1 ring-gray-100 transition-all active:scale-[0.98] dark:bg-gray-800 dark:ring-gray-700 md:p-4 md:hover:shadow-md md:hover:ring-gray-200"
        >
          <div class="min-w-0 flex-1">
            <time
              v-if="question.question_date"
              :datetime="formatDateISO(question.question_date)"
              class="text-[10px] text-gray-400 md:text-xs"
            >
              {{ $dateformat(question.question_date) }}
            </time>
            <h2 class="text-xs font-medium text-gray-900 dark:text-white md:text-sm">
              {{ question.subject }}
            </h2>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="h-4 w-4 shrink-0 self-center text-gray-300 dark:text-gray-600"
          />
        </NuxtLink>

        <!-- Pagination (20 par page) -->
        <div v-if="totalPages > 1" class="mt-6 flex justify-center">
          <UPagination
            :model-value="currentPage"
            :total="totalItems"
            :page-count="itemsPerPage"
            :show-edges="true"
            :sibling-count="1"
            size="sm"
            @update:model-value="setCurrentPage"
          />
        </div>
      </div>
    </main>

    <ScrollToTopButton />
  </div>
</template>
