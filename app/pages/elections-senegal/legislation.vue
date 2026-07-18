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

const {
  items: documents,
  loading,
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
useSeoMeta({
  title: 'Législation Électorale | Élections Sénégal',
  description:
    'Consultez les textes de loi, décrets et documents officiels régissant les élections au Sénégal.',
  ogTitle: 'Législation Électorale - Sénégal',
  ogDescription:
    'Accédez à tous les textes juridiques et documents officiels du processus électoral sénégalais.',
});
</script>

<template>
  <div class="min-h-screen pb-20 dark:bg-gray-900">
    <div class="container mx-auto px-4 pt-4">
      <AppBreadcrumb
        :items="[{ label: 'Élections', to: '/elections-senegal' }, { label: 'Législation' }]"
      />
    </div>

    <header class="container mx-auto px-4 py-3 md:py-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white md:text-3xl">
            Législation électorale
          </h1>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 md:mt-1 md:text-sm">
            Textes de lois, décrets et arrêtés officiels
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <USelect
            v-model="selectedType"
            :options="typeOptions"
            size="sm"
            class="w-full md:w-40"
            placeholder="Type d'élection"
          />
          <USelect
            v-model="selectedYear"
            :options="yearOptions"
            size="sm"
            class="w-full md:w-28"
            placeholder="Année"
          />
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4">
      <!-- Search & Sort -->
      <div class="mb-6 flex flex-col items-center gap-3 md:flex-row">
        <div class="relative w-full flex-1">
          <UInput
            v-model="searchQueryUI"
            icon="i-heroicons-magnifying-glass"
            placeholder="Rechercher un décret, une loi..."
            size="md"
            class="w-full"
          />
        </div>
        <USelectMenu
          v-model="sortBy"
          :options="sortOptions"
          value-attribute="value"
          size="md"
          class="w-full md:w-48"
        />
      </div>

      <!-- Results Grid -->
      <div v-if="loading" class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="n in 8"
          :key="n"
          class="animate-pulse overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700"
        >
          <div class="aspect-[3/2] bg-gray-300 dark:bg-gray-600" />
          <div class="space-y-2 p-2 sm:p-3">
            <div class="h-3 w-3/4 rounded bg-gray-300 dark:bg-gray-600" />
            <div class="h-2 w-1/2 rounded bg-gray-200 dark:bg-gray-600" />
          </div>
        </div>
      </div>

      <div
        v-else-if="documents.length === 0"
        class="rounded-2xl bg-white py-16 text-center ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      >
        <UIcon
          name="i-heroicons-document-magnifying-glass"
          class="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
        />
        <h3 class="text-base font-bold text-gray-600 dark:text-gray-400">Aucun document trouvé</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-500">
          Essayez de modifier vos filtres ou votre recherche.
        </p>
        <UButton
          v-if="selectedType !== 'all' || selectedYear !== 'all'"
          variant="soft"
          class="mt-4"
          @click="
            selectedType = 'all';
            selectedYear = 'all';
          "
        >
          Voir tout
        </UButton>
        <NuxtLink
          to="/documents/public"
          class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mt-4 inline-flex items-center gap-1 text-sm font-bold underline underline-offset-4"
        >
          Consulter la bibliothèque complète des documents
          <UIcon name="i-heroicons-arrow-right" class="h-3.5 w-3.5" />
        </NuxtLink>
      </div>

      <div v-else>
        <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          <NuxtLink
            v-for="doc in documents"
            :key="doc.id"
            :to="`/documents/${doc.id}/${doc.slug}`"
            class="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <!-- Image de couverture -->
            <div class="aspect-[3/2] overflow-hidden bg-gray-100 dark:bg-gray-700">
              <CmsImage
                v-if="doc.cover_image"
                :src="doc.cover_image"
                :quality="40"
                :alt="`Aperçu ${doc.title}`"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-700"
              >
                <UIcon
                  name="i-heroicons-document-text"
                  class="h-8 w-8 text-gray-300 dark:text-gray-500 sm:h-10 sm:w-10"
                />
              </div>
            </div>

            <!-- Contenu -->
            <div class="p-2 sm:p-3">
              <h3
                class="line-clamp-2 text-xs font-semibold leading-tight text-gray-900 dark:text-white sm:text-sm"
              >
                {{ doc.title }}
              </h3>
              <time
                v-if="doc.publish_date"
                :datetime="doc.publish_date"
                class="mt-1 block text-[10px] text-gray-400 dark:text-gray-500 sm:text-xs"
              >
                {{
                  new Date(doc.publish_date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                }}
              </time>
            </div>
          </NuxtLink>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="mt-12 flex justify-center">
          <UPagination
            v-model="currentPage"
            :total="totalItems"
            :page-count="itemsPerPage"
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
.container {
  max-width: 1200px;
}
</style>
