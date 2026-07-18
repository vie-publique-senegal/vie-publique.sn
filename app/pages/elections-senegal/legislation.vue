<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import type { Document } from '~~/types/document';

const route = useRoute();
const router = useRouter();

const selectedType = ref<string>((route.query.type as string) || 'all');
const selectedYear = ref<string>((route.query.year as string) || 'all');

const { config } = useElectoralDashboard();

const currentPage = ref(parseInt((route.query.page as string) || '1'));
const searchQuery = ref((route.query.q as string) || '');
const sortBy = ref((route.query.sort as string) || '-publish_date');

// Retourne tous les IDs d'élections correspondants au type et/ou à l'année sélectionnés
const selectedElectionIds = computed(() => {
  if (selectedType.value === 'all' && selectedYear.value === 'all') return null;
  if (!config.value?.elections) return null;

  // Filtrer pour les élections qui ont des documents
  const electionsWithDocsIds = new Set(config.value?.election_ids_with_documents || []);

  // Trouver TOUTES les élections correspondantes (pas seulement la première)
  const matchingElections = config.value.elections.filter((e) => {
    // Ne garder que les élections qui ont des documents
    if (!electionsWithDocsIds.has(e.id)) return false;
    if (selectedType.value !== 'all' && e.type !== selectedType.value) return false;
    if (selectedYear.value !== 'all' && e.year !== parseInt(selectedYear.value)) return false;
    return true;
  });

  if (matchingElections.length === 0) return null;

  // Retourner les IDs séparés par des virgules
  return matchingElections.map((e) => e.id).join(',');
});

// Vue mode (liste par défaut, comme /documents/public)
const viewMode = ref<'grid' | 'list'>('list');

const {
  items: documents,
  loading,
  error,
  refresh,
  pagination,
} = useCmsCollection<Document>({
  collection: 'documents',
  filters: computed(() => {
    const filters: any = {
      type: 'election',
    };
    if (selectedElectionIds.value) {
      filters.election_ids = selectedElectionIds.value;
    }
    return filters;
  }),
  search: searchQuery,
  sort: sortBy,
  page: currentPage,
  limit: 12,
});

const itemsPerPage = 12;
const totalItems = computed(() => pagination.value?.total || 0);
const totalPages = computed(() => pagination.value?.totalPages || 1);

const defaultSort = '-publish_date';

const setSearchQuery = (q: string) => {
  searchQuery.value = q;
  currentPage.value = 1;
  router.replace({ query: { ...route.query, q: q || undefined, page: undefined } });
};

const searchQueryUI = computed({
  get: () => searchQuery.value,
  set: (val) => setSearchQuery(val),
});

watch(currentPage, (newPage) => {
  router.replace({ query: { ...route.query, page: newPage > 1 ? newPage.toString() : undefined } });
});

watch(sortBy, (newSort) => {
  currentPage.value = 1;
  router.replace({
    query: {
      ...route.query,
      sort: newSort === defaultSort ? undefined : newSort,
      page: undefined,
    },
  });
});

watch([selectedType, selectedYear], () => {
  currentPage.value = 1;
  router.replace({
    query: {
      ...route.query,
      type: selectedType.value === 'all' ? undefined : selectedType.value,
      year: selectedYear.value === 'all' ? undefined : selectedYear.value,
      page: undefined,
    },
  });
});

const hasActiveFilters = computed(
  () =>
    selectedType.value !== 'all' ||
    selectedYear.value !== 'all' ||
    !!searchQuery.value ||
    sortBy.value !== defaultSort,
);

const handleReset = () => {
  selectedType.value = 'all';
  selectedYear.value = 'all';
  sortBy.value = defaultSort;
  setSearchQuery('');
};

// Event handlers pour les éléments natifs (style repris de /documents/public)
const handleSearchInput = (e: Event) => {
  setSearchQuery((e.target as HTMLInputElement).value);
};

const handleTypeChange = (e: Event) => {
  selectedType.value = (e.target as HTMLSelectElement).value;
};

const handleYearChange = (e: Event) => {
  selectedYear.value = (e.target as HTMLSelectElement).value;
};

const handleSortChange = (e: Event) => {
  sortBy.value = (e.target as HTMLSelectElement).value;
};

const typeOptions = computed(() => {
  if (!config.value?.elections) return [{ label: 'Tous les types', value: 'all' }];

  const electionsWithDocsIds = new Set(config.value?.election_ids_with_documents || []);

  const typesWithDocs = new Set(
    config.value.elections.filter((e) => electionsWithDocsIds.has(e.id)).map((e) => e.type),
  );

  const typeLabels: Record<string, string> = {
    presidential: 'Présidentielle',
    legislative: 'Législatives',
    locale: 'Locales',
  };

  const options = Array.from(typesWithDocs).map((type) => ({
    label: typeLabels[type] || type,
    value: type,
  }));

  return [{ label: 'Tous les types', value: 'all' }, ...options];
});

const yearOptions = computed(() => {
  if (!config.value?.elections) return [{ label: 'Toutes les années', value: 'all' }];

  const electionsWithDocsIds = new Set(config.value?.election_ids_with_documents || []);

  const yearsWithDocs = new Set(
    config.value.elections
      .filter((e) => {
        if (!electionsWithDocsIds.has(e.id)) return false;
        if (selectedType.value !== 'all' && e.type !== selectedType.value) return false;
        return true;
      })
      .map((e) => e.year),
  );

  const options = Array.from(yearsWithDocs)
    .sort((a, b) => b - a)
    .map((year) => ({
      label: year.toString(),
      value: year.toString(),
    }));

  return [{ label: 'Toutes les années', value: 'all' }, ...options];
});

const sortOptions = [
  { label: 'Plus récent', value: '-publish_date' },
  { label: 'Plus ancien', value: 'publish_date' },
  { label: 'Titre A-Z', value: 'title' },
];

// SEO avec Open Graph
const { siteUrl, siteName } = useSiteMetadata();
const url = `${siteUrl}/elections-senegal/legislation`;
const ogImage = `${siteUrl}/images/share-linkedin.png`;

const title = 'Législation Électorale | Élections Sénégal';
const description =
  'Consultez les textes de loi, décrets et documents officiels régissant les élections au Sénégal.';

useSeoMeta({
  title,
  description,
  ogTitle: 'Législation Électorale - Sénégal',
  ogDescription:
    'Accédez à tous les textes juridiques et documents officiels du processus électoral sénégalais.',
  ogUrl: url,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: ogImage,
});

useHead({
  link: [{ rel: 'canonical', href: url }],
  meta: [
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Élections',
            item: `${siteUrl}/elections-senegal`,
          },
          { '@type': 'ListItem', position: 3, name: 'Législation électorale', item: url },
        ],
      }),
    },
  ],
});
</script>

<template>
  <div class="min-h-screen pb-20 dark:bg-gray-900">
    <!-- Breadcrumb -->
    <div class="container mx-auto hidden px-4 pt-4 md:block">
      <AppBreadcrumb
        :items="[{ label: 'Élections', to: '/elections-senegal' }, { label: 'Législation' }]"
      />
    </div>

    <!-- Sticky Header -->
    <header
      class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95"
    >
      <div class="container mx-auto px-4 py-3">
        <!-- Title Row -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              Législation électorale
            </h1>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Textes de lois, décrets et arrêtés officiels
            </p>
          </div>
          <div class="flex items-center gap-2">
            <!-- View Toggle -->
            <div class="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
              <button
                type="button"
                :class="[
                  'rounded-md p-1.5 transition-colors',
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
                ]"
                aria-label="Vue grille"
                @click="viewMode = 'grid'"
              >
                <UIcon name="i-heroicons-squares-2x2" class="h-4 w-4" />
              </button>
              <button
                type="button"
                :class="[
                  'rounded-md p-1.5 transition-colors',
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
                ]"
                aria-label="Vue liste"
                @click="viewMode = 'list'"
              >
                <UIcon name="i-heroicons-list-bullet" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Search Input -->
        <div class="group relative mt-3">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <UIcon
              name="i-heroicons-magnifying-glass-20-solid"
              class="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-gray-500"
            />
          </div>
          <input
            type="search"
            :value="searchQueryUI"
            placeholder="Rechercher un décret, une loi..."
            class="block w-full rounded-xl border-0 bg-gray-100 py-3 pl-11 pr-10 text-sm text-gray-900 ring-1 ring-transparent transition-all placeholder:text-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-gray-800/80 dark:focus:ring-gray-500 sm:py-2.5"
            @input="handleSearchInput"
          />
          <button
            v-if="searchQueryUI"
            type="button"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            @click="setSearchQuery('')"
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

        <!-- Filters Row - Horizontal Scroll -->
        <div class="scrollbar-hide -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 py-1">
          <!-- Type Filter -->
          <div class="relative shrink-0">
            <select
              :value="selectedType"
              class="appearance-none rounded-full border-0 bg-gray-100 py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-500"
              @change="handleTypeChange"
            >
              <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <UIcon
              name="i-heroicons-chevron-down"
              class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
            />
          </div>

          <!-- Year Filter -->
          <div class="relative shrink-0">
            <select
              :value="selectedYear"
              class="appearance-none rounded-full border-0 bg-gray-100 py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-500"
              @change="handleYearChange"
            >
              <option v-for="opt in yearOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <UIcon
              name="i-heroicons-chevron-down"
              class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
            />
          </div>

          <!-- Sort -->
          <div class="relative shrink-0">
            <select
              :value="sortBy"
              class="appearance-none rounded-full border-0 bg-gray-100 py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-500"
              @change="handleSortChange"
            >
              <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <UIcon
              name="i-heroicons-chevron-down"
              class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4 pt-4">
      <!-- Loading Skeleton -->
      <template v-if="loading">
        <!-- Grid skeleton -->
        <div
          v-if="viewMode === 'grid'"
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          <div
            v-for="n in 8"
            :key="n"
            class="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800"
          >
            <USkeleton class="aspect-[4/3] w-full" />
            <div class="space-y-2 p-3">
              <USkeleton class="h-3 w-full" />
              <USkeleton class="h-3 w-2/3" />
              <USkeleton class="h-2.5 w-1/3" />
            </div>
          </div>
        </div>
        <!-- List skeleton -->
        <div v-else class="space-y-2">
          <div
            v-for="n in 6"
            :key="n"
            class="flex gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800"
          >
            <USkeleton class="h-16 w-20 shrink-0 rounded-lg" />
            <div class="flex flex-1 flex-col justify-between py-0.5">
              <div class="space-y-2">
                <USkeleton class="h-3.5 w-full" />
                <USkeleton class="h-3.5 w-3/4" />
              </div>
              <USkeleton class="h-2.5 w-24" />
            </div>
          </div>
        </div>
      </template>

      <!-- Error State -->
      <div v-else-if="error" class="py-12">
        <div
          class="mx-auto max-w-sm rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
        >
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="h-6 w-6 text-red-600 dark:text-red-400"
            />
          </div>
          <p class="text-sm font-medium text-red-900 dark:text-red-200">
            Impossible de charger les documents
          </p>
          <p class="mt-1 text-xs text-red-700 dark:text-red-300">Vérifiez votre connexion</p>
          <div class="mt-4 flex justify-center gap-2">
            <UButton
              color="red"
              variant="soft"
              size="xs"
              icon="i-heroicons-arrow-path"
              @click="refresh()"
            >
              Réessayer
            </UButton>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="documents.length === 0" class="py-16 text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
        >
          <UIcon name="i-heroicons-document-magnifying-glass" class="h-8 w-8 text-gray-400" />
        </div>
        <p class="text-sm font-medium text-gray-900 dark:text-white">Aucun document trouvé</p>
        <p class="mt-1 text-xs text-gray-500">Modifiez vos critères de recherche</p>
        <UButton
          v-if="hasActiveFilters"
          color="gray"
          variant="soft"
          size="sm"
          class="mt-4"
          @click="handleReset"
        >
          Réinitialiser les filtres
        </UButton>
        <div>
          <NuxtLink
            to="/documents/public"
            class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mt-4 inline-flex items-center gap-1 text-sm font-bold underline underline-offset-4"
          >
            Consulter la bibliothèque complète des documents
            <UIcon name="i-heroicons-arrow-right" class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </div>

      <!-- Documents Content -->
      <div v-else>
        <div v-if="totalItems || hasActiveFilters" class="mb-3 flex items-center justify-between">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            <span v-if="totalItems">{{
              `${totalItems} résultat${totalItems > 1 ? 's' : ''}`
            }}</span>
            <span v-if="totalItems && searchQueryUI"> · </span>
            <span v-if="searchQueryUI">pour "{{ searchQueryUI }}"</span>
          </p>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="text-xs text-gray-500 underline transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            @click="handleReset"
          >
            Réinitialiser
          </button>
        </div>

        <!-- Grid View -->
        <div
          v-if="viewMode === 'grid'"
          class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
        >
          <NuxtLink
            v-for="doc in documents"
            :key="doc.id"
            :to="`/documents/${doc.id}/${doc.slug}`"
            class="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100 transition-all active:scale-[0.98] dark:bg-gray-800 dark:ring-gray-700 sm:hover:shadow-md"
          >
            <!-- Cover -->
            <div class="aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
              <CmsImage
                v-if="doc.cover_image"
                :src="doc.cover_image"
                :quality="40"
                :alt="doc.title"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div v-else class="flex h-full w-full items-center justify-center">
                <UIcon
                  name="i-heroicons-document-text"
                  class="h-10 w-10 text-gray-300 dark:text-gray-600"
                />
              </div>
            </div>
            <!-- Content -->
            <div class="p-2.5">
              <h3
                class="group-hover:text-primary-600 line-clamp-2 text-xs font-semibold leading-snug text-gray-900 dark:text-white sm:text-sm"
              >
                {{ doc.title }}
              </h3>
              <time
                v-if="doc.publish_date"
                :datetime="doc.publish_date"
                class="mt-1.5 block text-[10px] text-gray-400 dark:text-gray-500"
              >
                {{ $dateformat(doc.publish_date) }}
              </time>
            </div>
          </NuxtLink>
        </div>

        <!-- List View -->
        <div v-else class="space-y-2">
          <NuxtLink
            v-for="doc in documents"
            :key="doc.id"
            :to="`/documents/${doc.id}/${doc.slug}`"
            class="group flex gap-3 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-gray-100 transition-all active:scale-[0.98] dark:bg-gray-800 dark:ring-gray-600 sm:hover:shadow-md"
          >
            <!-- Thumbnail -->
            <div
              class="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 sm:h-20 sm:w-24"
            >
              <CmsImage
                v-if="doc.cover_image"
                :src="doc.cover_image"
                :quality="30"
                :alt="doc.title"
                class="h-full w-full object-cover"
                loading="lazy"
              />
              <div v-else class="flex h-full w-full items-center justify-center">
                <UIcon
                  name="i-heroicons-document-text"
                  class="h-6 w-6 text-gray-300 dark:text-gray-600"
                />
              </div>
            </div>
            <!-- Content -->
            <div class="flex min-w-0 flex-1 flex-col justify-between py-0.5">
              <h3
                class="group-hover:text-primary-600 line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white"
              >
                {{ doc.title }}
              </h3>
              <time
                v-if="doc.publish_date"
                :datetime="doc.publish_date"
                class="text-[11px] text-gray-400 dark:text-gray-500"
              >
                {{ $dateformat(doc.publish_date) }}
              </time>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="h-5 w-5 shrink-0 self-center text-gray-300 dark:text-gray-600"
            />
          </NuxtLink>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="mt-8 flex justify-center">
          <UPagination
            v-model="currentPage"
            :total="totalItems"
            :page-count="itemsPerPage"
            size="sm"
            :ui="{
              wrapper: 'flex items-center gap-1',
              rounded: 'rounded-lg',
            }"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Hide scrollbar */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
