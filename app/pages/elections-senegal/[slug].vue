<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';

const route = useRoute();
const router = useRouter();

const electionSlug = computed(() => route.params.slug as string);

const dashboard = useElectoralDashboard();
const { selectedYear, selectedType, config, currentElection, loadingConfig } = dashboard;

// Résoudre l'élection par son slug CMS
const electionBySlug = computed(
  () => config.value?.elections?.find((e: any) => e.slug === electionSlug.value) || null,
);

// Syncer type+year depuis le slug au chargement
// Utilise flush: 'sync' pour que la mise à jour soit immédiate avant le rendu
watch(
  electionBySlug,
  (election) => {
    if (election) {
      selectedType.value = election.type;
      selectedYear.value = election.year;
    }
  },
  { immediate: true, flush: 'sync' },
);

// Quand le slug change (navigation entre élections), re-sync immédiatement
watch(
  electionSlug,
  () => {
    // Forcer la re-sync quand le slug change
    const election = config.value?.elections?.find((e: any) => e.slug === electionSlug.value);
    if (election) {
      selectedType.value = election.type;
      selectedYear.value = election.year;
    }
  },
  { flush: 'sync' },
);

const isCandidateProfilePage = computed(() =>
  /^\/elections-senegal\/[^/]+\/candidats\/[^/]+$/.test(route.path),
);

// Tab actif = segment juste après le slug d'élection (segments[0]=elections-senegal,
// [1]=slug, [2]=onglet), quelle que soit la profondeur ensuite (ex. candidats/coalition/[slug]).
const currentTab = computed(() => {
  const segments = route.path.split('/').filter(Boolean);
  const tab = segments[2];
  const VALID_TABS = new Set([
    'candidats',
    'carte',
    'resultats',
    'pvs',
    'documents',
    'statistiques',
    'guide',
  ]);
  return VALID_TABS.has(tab) ? tab : '';
});

const getAllowedTabsForElection = (election: any) => {
  const electionTypeRaw = String(election?.type || selectedType.value || '').toLowerCase();
  const isLegislativeElection = electionTypeRaw.includes('legislative');

  if (election?.status === 'completed') {
    const completedTabs = new Set(['candidats', 'resultats', 'documents']);
    if (election?.pv_upload_active) completedTabs.add('pvs');
    if (isLegislativeElection) completedTabs.add('statistiques');
    return completedTabs;
  }

  const allowedTabs = new Set(['candidats', 'carte', 'resultats', 'documents', 'guide']);
  if (election?.pv_upload_active) allowedTabs.add('pvs');
  if (isLegislativeElection) allowedTabs.add('statistiques');
  return allowedTabs;
};

const allTabs = [
  { id: 'candidats', icon: 'i-heroicons-user-group' },
  { id: 'carte', label: 'Carte', icon: 'i-heroicons-map' },
  { id: 'resultats', label: 'Résultats', icon: 'i-heroicons-chart-bar' },
  { id: 'pvs', label: 'PVs', icon: 'i-heroicons-document-check' },
  { id: 'documents', label: 'Documents', icon: 'i-heroicons-document-duplicate' },
  { id: 'statistiques', label: 'Stats', icon: 'i-heroicons-presentation-chart-line' },
  { id: 'guide', label: 'Guide', icon: 'i-heroicons-play-circle' },
];

const tabs = computed(() => {
  const allowedTabs = getAllowedTabsForElection(currentElection.value);
  return allTabs
    .filter((tab) => allowedTabs.has(tab.id))
    .map((tab) => ({
      ...tab,
      label:
        tab.id === 'candidats'
          ? selectedType.value === 'presidential'
            ? 'Candidats'
            : selectedType.value === 'locale'
              ? 'Circonscriptions'
              : 'Coalitions'
          : tab.label,
    }));
});

// Les onglets sont de vrais liens (crawlables) ; activeTab est resynchronisé
// depuis la route par useElectoralDashboard après navigation.
const tabLink = (tab: string) =>
  electionBySlug.value?.slug
    ? `/elections-senegal/${electionBySlug.value.slug}/${tab}`
    : route.path;

// Navigation vers une autre élection (changement type/année)
const navigateToElection = (type: string, year: number) => {
  const targetElection = config.value?.elections?.find(
    (e: any) => e.type === type && e.year === year,
  );
  if (!targetElection?.slug) return;
  const targetTab = targetElection.status === 'completed' ? 'resultats' : 'candidats';
  router.push(`/elections-senegal/${targetElection.slug}/${targetTab}`);
};

const onYearChange = (year: number | string) =>
  navigateToElection(selectedType.value, Number(year));

const onTypeChange = (type: string) => {
  let targetYear = selectedYear.value;
  const electionsOfType = config.value?.elections?.filter((e: any) => e.type === type) || [];
  const exists = electionsOfType.some((e: any) => e.year === targetYear);

  if (!exists && electionsOfType.length > 0) {
    const latestCompleted = electionsOfType
      .filter((e: any) => e.status === 'completed')
      .sort((a: any, b: any) => b.year - a.year)[0];
    targetYear = latestCompleted
      ? latestCompleted.year
      : electionsOfType.sort((a: any, b: any) => b.year - a.year)[0].year;
  }

  navigateToElection(type, targetYear);
};

const { siteUrl } = useSiteMetadata();
const ogImage = `${siteUrl}/images/share-linkedin.png`;

useSeoMeta({
  title: () =>
    currentElection.value?.name
      ? `${currentElection.value.name}`
      : 'Élections Sénégal',
  description: () =>
    currentElection.value?.name
      ? `Candidats, résultats, carte et documents pour ${currentElection.value.name}.`
      : "Plateforme d'information électorale du Sénégal.",
  ogTitle: () => currentElection.value?.name || 'Élections Sénégal',
  ogDescription: () =>
    currentElection.value?.name
      ? `Tableau de bord complet pour ${currentElection.value.name} : candidats, résultats, carte électorale et documents.`
      : "Plateforme d'information électorale du Sénégal.",
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage,
});

// Canonical par onglet + fil d'Ariane structuré. La fiche candidat définit
// son propre canonical/JSON-LD : on ne pose rien depuis le parent dans ce cas.
const canonicalUrl = computed(() => `${siteUrl}${route.path}`);

const breadcrumbSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Élections', item: `${siteUrl}/elections-senegal` },
    {
      '@type': 'ListItem',
      position: 3,
      name: currentElection.value?.name || 'Élection',
      item: canonicalUrl.value,
    },
  ],
}));

useHead({
  link: computed(() =>
    isCandidateProfilePage.value ? [] : [{ rel: 'canonical', href: canonicalUrl.value }],
  ),
  script: computed(() =>
    isCandidateProfilePage.value
      ? []
      : [{ type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbSchema.value) }],
  ),
});
</script>

<template>
  <div
    class="min-h-screen overflow-x-hidden bg-white pb-16 text-gray-900 dark:bg-gray-900 dark:text-gray-100"
  >
    <!-- Header : breadcrumb + sélecteurs type/année -->
    <div v-if="!isCandidateProfilePage" class="border-b border-gray-200 dark:border-transparent">
      <div class="container mx-auto px-4 py-4 md:py-6">
        <AppBreadcrumb
          v-if="currentElection"
          class="mb-3 text-xs"
          :items="[
            { label: 'Élections', to: '/elections-senegal' },
            { label: currentElection.name || 'Dashboard' },
          ]"
        />

        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
              {{ currentElection?.name || 'Élections Sénégal' }}
            </h1>
            <p
              v-if="currentElection?.election_date"
              class="mt-0.5 text-sm text-gray-500 dark:text-gray-400"
            >
              {{
                new Date(currentElection.election_date).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              }}
            </p>
          </div>

          <!-- Sélecteurs type + année -->
          <div v-if="config && currentElection" class="flex items-center gap-2">
            <USelect
              :model-value="selectedType"
              :options="config.types"
              value-attribute="value"
              option-attribute="label"
              size="xs"
              class="w-36"
              @update:model-value="onTypeChange"
            />
            <USelect
              :model-value="selectedYear"
              :options="
                config.years.filter((y) =>
                  config.elections?.some((e) => e.type === selectedType && e.year === y.value),
                )
              "
              value-attribute="value"
              option-attribute="label"
              size="xs"
              class="w-24"
              @update:model-value="onYearChange"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs Navigation (style budget) -->
    <div
      v-if="!isCandidateProfilePage"
      class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95"
    >
      <div class="container mx-auto px-4">
        <nav
          class="no-scrollbar -mb-px flex gap-0.5 overflow-x-auto py-1 sm:gap-1"
          aria-label="Onglets"
        >
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.id"
            :to="tabLink(tab.id)"
            class="group flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
            :class="
              currentTab === tab.id
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
            "
          >
            <UIcon
              :name="tab.icon"
              class="h-3.5 w-3.5 shrink-0 transition-colors sm:h-4 sm:w-4"
              :class="
                currentTab === tab.id
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
              "
            />
            <span class="truncate">{{ tab.label }}</span>
          </NuxtLink>
        </nav>
      </div>
    </div>

    <!-- Contenu principal -->
    <main :class="isCandidateProfilePage ? '' : 'container mx-auto px-4 py-8'">
      <!-- État : élection introuvable -->
      <div
        v-if="!loadingConfig && !electionBySlug"
        class="animate-in fade-in zoom-in-95 flex flex-col items-center justify-center py-32 text-center duration-500"
      >
        <div class="bg-primary-50 dark:bg-primary-900/10 mb-6 rounded-full p-6">
          <UIcon name="i-heroicons-face-frown" class="text-primary-500 h-20 w-20" />
        </div>
        <h1 class="mb-4 text-4xl font-black tracking-tight text-gray-900 dark:text-white">
          Oups ! Élection introuvable
        </h1>
        <p class="mx-auto mb-8 max-w-lg text-lg text-gray-500">
          Aucune élection ne correspond à cette adresse.
        </p>
        <UButton
          to="/elections-senegal"
          size="xl"
          color="gray"
          variant="solid"
          icon="i-heroicons-arrow-left"
        >
          Retour aux élections
        </UButton>
      </div>

      <div v-else>
        <!-- Chargement -->
        <div v-if="loadingConfig" class="flex flex-col items-center justify-center space-y-4 py-32">
          <div class="relative h-16 w-16">
            <div
              class="border-primary-200 dark:border-primary-900 absolute inset-0 rounded-full border-4"
            ></div>
            <div
              class="border-primary-600 absolute inset-0 animate-spin rounded-full border-4 border-t-transparent"
            ></div>
          </div>
          <p class="animate-pulse text-sm font-bold text-gray-400">
            Synchronisation des données...
          </p>
        </div>

        <!-- Page enfant (onglet actif) -->
        <div v-else>
          <NuxtPage />
        </div>
      </div>
    </main>

    <footer class="mt-20 border-t border-gray-200 py-12 dark:border-gray-800">
      <div class="container mx-auto px-4">
        <div>
          <h5 class="text-lg font-black uppercase italic text-gray-400">Plateforme Électorale</h5>
          <p class="mt-2 max-w-md text-xs text-gray-500">
            Source officielle des listes électorales validées par la Direction Générale des
            Élections (DGE) du Sénégal. Cette plateforme assure la transparence et l'accessibilité à
            l'information publique.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
.container {
  max-width: 1400px;
}
</style>
