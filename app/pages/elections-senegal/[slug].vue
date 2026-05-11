<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';

const route = useRoute();
const router = useRouter();

const electionSlug = computed(() => route.params.slug as string);

const dashboard = useElectoralDashboard();
const {
  selectedYear,
  selectedType,
  activeTab,
  config,
  currentElection,
  loadingConfig,
  clearConstituency,
} = dashboard;

// Résoudre l'élection par son slug CMS
const electionBySlug = computed(() =>
  config.value?.elections?.find((e: any) => e.slug === electionSlug.value) || null
);

// Syncer type+year depuis le slug au chargement
watch(electionBySlug, (election) => {
  if (election) {
    selectedType.value = election.type;
    selectedYear.value = election.year;
  }
}, { immediate: true });

const isCandidateProfilePage = computed(() =>
  /^\/elections-senegal\/[^/]+\/candidats\/[^/]+$/.test(route.path)
);

// Tab actif = dernier segment du path
const currentTab = computed(() => {
  const segments = route.path.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  const VALID_TABS = new Set(['candidats', 'carte', 'resultats', 'pvs', 'documents', 'statistiques', 'guide']);
  return VALID_TABS.has(last) ? last : '';
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
    .filter(tab => allowedTabs.has(tab.id))
    .map(tab => ({
      ...tab,
      label: tab.id === 'candidats'
        ? selectedType.value === 'presidential' ? 'Candidats' : (selectedType.value === 'locale' ? 'Circonscriptions' : 'Coalitions')
        : tab.label,
    }));
});

const onTabChange = (tab: string) => {
  if (!electionBySlug.value?.slug) return;
  activeTab.value = tab;
  router.push(`/elections-senegal/${electionBySlug.value.slug}/${tab}`);
};

// Navigation vers une autre élection (changement type/année)
const navigateToElection = (type: string, year: number) => {
  const targetElection = config.value?.elections?.find((e: any) => e.type === type && e.year === year);
  if (!targetElection?.slug) return;
  const targetTab = targetElection.status === 'completed' ? 'resultats' : 'candidats';
  router.push(`/elections-senegal/${targetElection.slug}/${targetTab}`);
};

const onYearChange = (year: number | string) => navigateToElection(selectedType.value, Number(year));

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
const ogImage = `${siteUrl}/og-image.png`;

useSeoMeta({
  title: () => currentElection.value?.name
    ? `${currentElection.value.name} | Vie-Publique SN`
    : 'Élections Sénégal | Vie-Publique SN',
  description: () => currentElection.value?.name
    ? `Candidats, résultats, carte et documents pour ${currentElection.value.name}.`
    : 'Plateforme d\'information électorale du Sénégal.',
  ogTitle: () => currentElection.value?.name || 'Élections Sénégal',
  ogDescription: () => currentElection.value?.name
    ? `Tableau de bord complet pour ${currentElection.value.name} : candidats, résultats, carte électorale et documents.`
    : 'Plateforme d\'information électorale du Sénégal.',
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage,
});

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0' }]
});
</script>

<template>
  <div class="min-h-screen pb-16 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 overflow-x-hidden">

    <!-- Header : breadcrumb + sélecteurs type/année -->
    <div v-if="!isCandidateProfilePage" class="border-b border-gray-200 dark:border-transparent">
      <div class="container mx-auto px-4 py-4 md:py-6">
        <AppBreadcrumb
          v-if="currentElection"
          class="mb-3 text-xs"
          :items="[
            { label: 'Élections', to: '/elections-senegal' },
            { label: currentElection.name || 'Dashboard' }
          ]"
        />

        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 class="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">
              {{ currentElection?.name || 'Élections Sénégal' }}
            </h1>
            <p v-if="currentElection?.election_date" class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {{ new Date(currentElection.election_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) }}
            </p>
          </div>

          <!-- Sélecteurs type + année -->
          <div v-if="config" class="flex items-center gap-2">
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
              :options="config.years.filter(y => config.elections?.some(e => e.type === selectedType && e.year === y.value))"
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
    <div v-if="!isCandidateProfilePage" class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
      <div class="container mx-auto px-4">
        <nav class="-mb-px flex gap-0.5 py-1 sm:gap-1 overflow-x-auto no-scrollbar" aria-label="Onglets">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="group flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all sm:gap-2 sm:px-3 sm:py-2 sm:text-sm shrink-0"
            :class="currentTab === tab.id
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'"
            @click="onTabChange(tab.id)"
          >
            <UIcon
              :name="tab.icon"
              class="h-3.5 w-3.5 shrink-0 transition-colors sm:h-4 sm:w-4"
              :class="currentTab === tab.id
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'"
            />
            <span class="truncate">{{ tab.label }}</span>
          </button>
        </nav>
      </div>
    </div>

    <!-- Contenu principal -->
    <main :class="isCandidateProfilePage ? '' : 'container mx-auto px-4 py-8'">
      <!-- État : élection introuvable -->
      <div v-if="!loadingConfig && !electionBySlug" class="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in-95 duration-500">
        <div class="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-full mb-6">
          <UIcon name="i-heroicons-face-frown" class="h-20 w-20 text-primary-500" />
        </div>
        <h1 class="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Oups ! Élection introuvable</h1>
        <p class="text-gray-500 text-lg max-w-lg mx-auto mb-8">Aucune élection ne correspond à cette adresse.</p>
        <UButton to="/elections-senegal" size="xl" color="gray" variant="solid" icon="i-heroicons-arrow-left">
          Retour aux élections
        </UButton>
      </div>

      <div v-else>
        <!-- Chargement -->
        <div v-if="loadingConfig" class="flex flex-col items-center justify-center py-32 space-y-4">
          <div class="relative h-16 w-16">
            <div class="absolute inset-0 border-4 border-primary-200 dark:border-primary-900 rounded-full"></div>
            <div class="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p class="text-sm font-bold text-gray-400 animate-pulse">Synchronisation des données...</p>
        </div>

        <!-- Page enfant (onglet actif) -->
        <div v-else>
          <NuxtPage />
        </div>
      </div>
    </main>

    <footer class="mt-20 border-t border-gray-200 dark:border-gray-800 py-12">
      <div class="container mx-auto px-4">
        <div>
          <h5 class="text-lg font-black uppercase text-gray-400 italic">Plateforme Électorale</h5>
          <p class="text-xs text-gray-500 mt-2 max-w-md">Source officielle des listes électorales validées par la Direction Générale des Élections (DGE) du Sénégal. Cette plateforme assure la transparence et l'accessibilité à l'information publique.</p>
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
