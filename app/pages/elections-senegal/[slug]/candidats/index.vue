<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useElectoralCoalitions } from '~/composables/elections/dashboard/useElectoralCoalitions';
import { useElectoralConstituencies } from '~/composables/elections/dashboard/useElectoralConstituencies';

const dashboard = useElectoralDashboard();
const {
  selectedYear,
  selectedType,
  currentElection,
  selectedCoalitionId,
  selectedConstituencyId,
  searchQuery,
  legislativeViewType,
  selectConstituency,
  clearConstituency,
  selectCoalition,
  clearCoalition,
} = dashboard;

const isLocalElection = computed(() => selectedType.value === 'locale');

const { constituencies, loading: loadingConstituencies } = useElectoralConstituencies({
  year: selectedYear,
  type: selectedType,
  search: searchQuery,
});

const { coalitions, loading: loadingCoalitions } = useElectoralCoalitions({
  year: selectedYear,
  type: selectedType,
  ranking: true,
  search: searchQuery,
});

const selectedConstituencyName = computed(() => {
  if (!selectedConstituencyId.value) return '';
  return constituencies.value.find(c => c.id === selectedConstituencyId.value)?.name || '';
});

const hasElectionStats = computed(() => {
  const e = currentElection.value;
  if (!e) return false;
  return !!(e.registered_voters || e.voters_count || e.null_ballots ||
    e.valid_votes || e.participation_rate ||
    (e.absolute_majority && e.type === 'presidential') ||
    (e.national_quotient && e.type === 'legislative'));
});

useSeoMeta({
  title: () => currentElection.value?.name
    ? `Candidats · ${currentElection.value.name} | Vie-Publique SN`
    : 'Candidats | Élections Sénégal',
  description: () => currentElection.value?.name
    ? `Découvrez tous les candidats et coalitions pour ${currentElection.value.name}.`
    : 'Candidats et coalitions des élections au Sénégal.',
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8">
    <transition name="fade">
      <ElectionsDashboardElectoralDetailsCard
        v-if="currentElection && !selectedCoalitionId && !selectedConstituencyId"
        :election="currentElection"
        :coalitions="coalitions"
        :constituencies="constituencies"
        class="mb-6 animate-in fade-in slide-in-from-top-4 duration-700"
      />
    </transition>

    <transition name="fade">
      <ElectionsDashboardElectionStatsKPI
        v-if="currentElection?.status === 'completed' && hasElectionStats && !selectedCoalitionId && !selectedConstituencyId"
        :election="currentElection"
        class="mb-8 animate-in fade-in slide-in-from-top-4 duration-500"
      />
    </transition>

    <!-- NIVEAU 3: Détail Coalition -->
    <div v-if="selectedCoalitionId" class="animate-in fade-in zoom-in-95 duration-500">
      <ElectionsDashboardCoalitionDetails
        :coalition-id="String(selectedCoalitionId)"
        :coalition-name="coalitions.find(c => c.id === selectedCoalitionId)?.name"
        :year="selectedYear"
        :type="selectedType"
        :constituency-id="dashboard.selectedFilterConstituencyId.value"
        @close="clearCoalition"
      />
    </div>

    <!-- NIVEAU 2: Coalitions d'une circonscription (locales) -->
    <div v-else-if="isLocalElection && selectedConstituencyId" class="animate-in fade-in zoom-in-95 duration-500">
      <ElectionsDashboardConstituencyCoalitions
        :constituency-id="selectedConstituencyId"
        :constituency-name="selectedConstituencyName"
        :year="selectedYear"
        :type="selectedType"
        @close="clearConstituency"
        @select-coalition="(payload: any) => {
          if (typeof payload === 'object') {
            selectCoalition(payload.coalitionId);
            dashboard.selectedFilterConstituencyId.value = payload.constituencyId;
          } else {
            selectCoalition(payload);
          }
        }"
      />
    </div>

    <!-- NIVEAU 1: Grille principale -->
    <div v-else class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex flex-col gap-4">
        <div>
          <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-tighter">
            {{ isLocalElection ? 'Les Circonscriptions' : (selectedType === 'presidential' ? 'Les Candidats' : 'Les Coalitions') }}
          </h2>
          <p class="text-sm text-gray-500">
            {{ isLocalElection ? 'Sélectionnez une circonscription pour voir les coalitions en lice.' : (selectedType === 'presidential' ? 'Sélectionnez un candidat pour voir son programme et ses informations.' : 'Sélectionnez une plateforme pour voir ses listes et candidats.') }}
          </p>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div v-if="selectedType !== 'presidential'" class="flex-1 max-w-md">
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              :placeholder="selectedType === 'locale' ? 'Rechercher...' : 'Rechercher une coalition...'"
              size="md"
              class="transition-all duration-300"
              :ui="{
                rounded: 'rounded-xl',
                wrapper: 'relative rounded-xl shadow-sm',
                base: 'h-10 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-primary-500 text-sm px-4 transition-all ring-0 focus:ring-2 focus:ring-primary-500/20',
                icon: { leading: { wrapper: 'left-3' }, trailing: { pointer: 'pointer-events-auto' } }
              }"
            >
              <template #trailing v-if="searchQuery">
                <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" size="xs" class="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" @click="searchQuery = ''" />
              </template>
            </UInput>
          </div>

          <UBadge size="md" color="white" class="shadow-sm border dark:border-gray-800 shrink-0 self-start sm:self-center">
            <span class="text-primary-600 font-black mr-1">{{ isLocalElection ? constituencies.length : coalitions.length }}</span>
            {{ isLocalElection ? 'circonscriptions' : (selectedType === 'presidential' ? 'candidats' : 'plateformes engagées') }}
          </UBadge>
        </div>
      </div>

      <!-- Sélecteur vue législatives -->
      <div v-if="selectedType === 'legislative'" class="grid grid-cols-3 md:flex items-center justify-center gap-1.5 bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-2xl border dark:border-gray-700 w-full md:w-fit mx-auto">
        <UButton
          v-for="view in [
            { id: 'list', label: 'LISTE', icon: 'i-heroicons-list-bullet' },
            { id: 'head', label: 'TÊTES DE LISTE', icon: 'i-heroicons-user' },
            { id: 'ballot', label: 'BULLETINS', icon: 'i-heroicons-document-duplicate' }
          ]"
          :key="view.id"
          :color="legislativeViewType === view.id ? 'primary' : 'gray'"
          :variant="legislativeViewType === view.id ? 'solid' : 'ghost'"
          size="xs"
          class="rounded-xl px-2 md:px-4 py-2 font-bold uppercase text-[9px] md:text-[10px] tracking-widest transition-all duration-300 flex justify-center"
          @click="legislativeViewType = view.id"
        >
          <template #leading>
            <UIcon :name="view.icon" class="h-3.5 w-3.5 md:h-4 md:w-4" />
          </template>
          <span class="truncate">{{ view.label }}</span>
        </UButton>
      </div>

      <!-- Élections locales : circonscriptions -->
      <template v-if="isLocalElection">
        <ElectionsDashboardCoalitionGridLoadingState v-if="loadingConstituencies" />
        <div v-else-if="constituencies.length > 0" class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <ElectionsDashboardCardsConstituencyCard v-for="c in constituencies" :key="c.id" :constituency="c" @select="selectConstituency" />
        </div>
        <ElectionsDashboardEmptyStateCoalitions v-else />
      </template>

      <!-- Présidentielle & législatives : coalitions -->
      <template v-else>
        <ElectionsDashboardCoalitionGridLoadingState v-if="loadingCoalitions" />

        <div v-else-if="coalitions.length > 0 && selectedType === 'presidential'" class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <ElectionsDashboardCardsLegislativeCoalitionHeadCard v-for="c in coalitions" :key="c.id" :coalition="c" @select="selectCoalition" />
        </div>

        <div v-else-if="coalitions.length > 0"
          :class="legislativeViewType === 'list' ? 'grid grid-cols-1 md:grid-cols-2 gap-2' : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'"
        >
          <template v-if="legislativeViewType === 'list'">
            <ElectionsDashboardCardsLegislativeCoalitionListCard v-for="c in coalitions" :key="c.id" :coalition="c" @select="selectCoalition" />
          </template>
          <template v-else-if="legislativeViewType === 'head'">
            <ElectionsDashboardCardsLegislativeCoalitionHeadCard v-for="c in coalitions" :key="c.id" :coalition="c" @select="selectCoalition" />
          </template>
          <template v-else-if="legislativeViewType === 'ballot'">
            <ElectionsDashboardCardsLegislativeCoalitionBallotCard v-for="c in coalitions" :key="c.id" :coalition="c" @select="selectCoalition" />
          </template>
        </div>

        <ElectionsDashboardEmptyStateCoalitions v-else />
      </template>
    </div>
  </div>
</template>
