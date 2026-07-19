<!-- pages/elections-senegal/carte-electorale/diaspora/[country].vue -->
<script setup lang="ts">
/**
 * Page de détails d'un pays de la diaspora
 * Suit le pattern: page -> composable -> server -> Directus
 */

const route = useRoute();

const country = computed(() => decodeURIComponent(route.params.country as string));

const { siteUrl, siteName } = useSiteMetadata();
const canonicalUrl = `${siteUrl}/elections-senegal/carte-electorale/diaspora/${route.params.country}`;

// Contexte : révision de la carte électorale (?revision=) ou élection (?election=, compat)
const {
  revisionLabel,
  electionName,
  electionIdParam: electionId,
  diasporaFileId,
  backTo,
} = useElectoralRevision();

// États réactifs pour la recherche et la pagination
const search = ref('');
const page = ref(1);
const q = ref(''); // Filtre local côté client

// ✅ Utilisation du composable (fichier électoral de la révision, élection en compat)
const { stats, locations, pending, totalPages } = useDiasporaCountry({
  country: country.value,
  search,
  page,
  limit: 1000,
  electionId,
  electoralFileId: diasporaFileId,
});

// Filtrage local côté client (pour le champ de recherche dans le tableau)
const filteredRows = computed(() => {
  if (!q.value) {
    return locations.value;
  }

  return locations.value.filter((location) => {
    return Object.values(location).some((value) => {
      return String(value).toLowerCase().includes(q.value.toLowerCase());
    });
  });
});

// URL de retour (fallback) : le dashboard de l'élection si on en vient, sinon la vue diaspora
const backUrl = computed(() => backTo('/elections-senegal/carte-electorale/diaspora'));

const router = useRouter();

// Bouton retour : navigue dans l'historique du navigateur si on vient d'une
// page de l'app (ex. la liste des zones/pays), sinon retombe sur backUrl.
const goBack = () => {
  if (window.history.state?.back) {
    router.back();
  } else {
    navigateTo(backUrl.value);
  }
};

// Titre de la page : contexte élection si la navigation en vient, sinon la révision
const pageTitle = computed(() => {
  let title = country.value;
  if (electionName.value) {
    title += ` - ${electionName.value}`;
  } else if (revisionLabel.value) {
    title += ` - ${revisionLabel.value}`;
  }
  return title;
});

// SEO avec Open Graph
const ogImage = `${siteUrl}/images/share-linkedin.png`;

useSeoMeta({
  title: () => `Diaspora ${pageTitle.value} | Carte Électorale Sénégal`,
  description: () =>
    electionName.value
      ? `Carte électorale de la diaspora sénégalaise en ${country.value} pour ${electionName.value} - Liste des bureaux de vote, localités et électeurs.`
      : `Carte électorale de la diaspora sénégalaise en ${country.value} - Liste des bureaux de vote, localités et électeurs.`,
  ogTitle: () => `Diaspora ${pageTitle.value}`,
  ogDescription: () =>
    `Découvrez les bureaux de vote et statistiques électorales de la diaspora en ${country.value}.`,
  ogUrl: canonicalUrl,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterTitle: () => `Diaspora ${pageTitle.value} | Carte Électorale Sénégal`,
  twitterDescription: () =>
    `Découvrez les bureaux de vote et statistiques électorales de la diaspora en ${country.value}.`,
  twitterImage: ogImage,
});

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
  ],
});
</script>

<template>
  <div class="mx-auto min-h-screen max-w-7xl space-y-6 p-4 pb-16">
    <!-- Breadcrumb -->
    <AppBreadcrumb
      :items="[
        { label: 'Élections', to: '/elections-senegal' },
        { label: 'Carte électorale', to: backUrl },
        { label: country },
      ]"
    />

    <!-- En-tête -->
    <div class="flex items-center gap-3">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" @click="goBack" />
      <div>
        <h1 class="text-xl font-bold dark:text-white sm:text-2xl">
          {{ country }}
        </h1>
      </div>
    </div>

    <!-- Statistiques globales -->
    <div v-if="stats" class="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <div
        v-for="stat in [
          { label: 'Localités', value: stats.localities, icon: 'i-heroicons-map' },
          { label: 'Lieux de vote', value: stats.pollingPlaces, icon: 'i-heroicons-map-pin' },
          { label: 'Bureaux', value: stats.offices, icon: 'i-heroicons-building-office' },
          {
            label: 'Électeurs',
            value: stats.voters?.toLocaleString('fr-FR'),
            icon: 'i-heroicons-users',
          },
        ]"
        :key="stat.label"
        class="rounded-2xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 md:p-4"
      >
        <p
          class="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
        >
          <UIcon :name="stat.icon" class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate">{{ stat.label }}</span>
        </p>
        <p
          class="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white sm:text-xl md:text-2xl"
        >
          {{ stat.value }}
        </p>
      </div>
    </div>

    <div class="space-y-4">
      <!-- Barre de recherche -->
      <UInput
        v-model="q"
        icon="i-heroicons-magnifying-glass"
        placeholder="Rechercher une localité ou lieu de vote..."
        class="w-full sm:max-w-sm"
      />

      <!-- Tableau des données -->
      <div
        class="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      >
        <UTable
          :rows="filteredRows"
          :columns="[
            {
              key: 'locality',
              label: 'Localité',
            },
            {
              key: 'polling_place',
              label: 'Lieu de vote',
            },
            {
              key: 'office_number',
              label: 'Bureau',
            },
            {
              key: 'voters',
              label: 'Électeurs',
              sortable: true,
            },
          ]"
          :loading="pending"
        >
          <template #loading>
            <div class="flex justify-center p-4">
              <UIcon name="i-heroicons-arrow-path" class="text-primary-500 h-8 w-8 animate-spin" />
            </div>
          </template>

          <template #empty-state>
            <div
              class="flex flex-col items-center justify-center px-4 py-6 text-gray-500 dark:text-gray-400"
            >
              <UIcon name="i-heroicons-inbox" class="mb-2 h-8 w-8" />
              <p v-if="q">Aucun résultat trouvé pour "{{ q }}"</p>
              <p v-else>Aucune donnée disponible</p>
            </div>
          </template>

          <!-- Formater les nombres -->
          <template #cell-voters="{ row }">
            {{ parseInt(row.voters).toLocaleString('fr-FR') }}
          </template>
        </UTable>
      </div>

      <!-- Stats de la recherche -->
      <div
        v-if="filteredRows.length > 0"
        class="rounded-2xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      >
        <div class="text-sm text-gray-600 dark:text-gray-300">
          <span class="font-medium">{{ filteredRows.length }}</span> bureau(x) de vote affichés
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center pt-2">
        <UPagination
          v-model="page"
          :total="totalPages"
          :page-count="1"
          :ui="{
            wrapper: 'flex items-center gap-1',
            button: {
              base: 'h-8 w-8 flex items-center justify-center rounded-md disabled:opacity-50 disabled:cursor-not-allowed',
              active: 'bg-primary-500 text-white hover:bg-primary-600',
              inactive: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
            },
          }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.u-table th {
  @apply whitespace-nowrap;
}
</style>
