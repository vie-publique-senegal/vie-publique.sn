<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useElectoralCoalitions } from '~/composables/elections/dashboard/useElectoralCoalitions';
import { useElectoralConstituencies } from '~/composables/elections/dashboard/useElectoralConstituencies';

const router = useRouter();

const dashboard = useElectoralDashboard();
const { selectedYear, selectedType, currentElection, searchQuery, legislativeViewType } = dashboard;

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

const hasElectionStats = computed(() => {
  const e = currentElection.value;
  if (!e) return false;
  return !!(
    e.registered_voters ||
    e.voters_count ||
    e.null_ballots ||
    e.valid_votes ||
    e.participation_rate ||
    (e.absolute_majority && e.type === 'presidential') ||
    (e.national_quotient && e.type === 'legislative')
  );
});

// Seules les élections présidentielles peuvent avoir 2 tours (rounds=2)
const presidentialRoundFilter = ref<'all' | 'round2'>('all');

const isPresidential2Rounds = computed(
  () => currentElection.value?.type === 'presidential' && currentElection.value?.rounds === 2,
);

// Le filtre de tour s'affiche uniquement si l'élection est présidentielle à 2 tours
// ET qu'au moins une coalition a des données de second tour renseignées
const hasRound2Coalitions = computed(
  () =>
    isPresidential2Rounds.value &&
    coalitions.value.some(
      (c) =>
        (c.round_2_voix != null && c.round_2_voix > 0) ||
        (c.round_2_pourcentage != null && c.round_2_pourcentage > 0),
    ),
);

const displayedPresidentialCoalitions = computed(() => {
  if (presidentialRoundFilter.value === 'round2') {
    return coalitions.value.filter(
      (c) =>
        (c.round_2_voix != null && c.round_2_voix > 0) ||
        (c.round_2_pourcentage != null && c.round_2_pourcentage > 0),
    );
  }
  return coalitions.value;
});

// Réinitialiser le filtre quand on change d'élection
watch([selectedType, selectedYear], () => {
  presidentialRoundFilter.value = 'all';
});

// Navigation vers les pages dédiées (routes indexables, pas de query
// ?coalition=/?constituency=) : on résout le slug depuis la liste déjà chargée.
const goToCoalition = (id: number) => {
  const electionSlug = currentElection.value?.slug;
  const source =
    selectedType.value === 'presidential'
      ? displayedPresidentialCoalitions.value
      : coalitions.value;
  const slug = source.find((c) => c.id === id)?.political_entity?.slug;
  if (electionSlug && slug) {
    router.push(`/elections-senegal/${electionSlug}/candidats/coalition/${slug}`);
  }
};

const goToConstituency = (id: number) => {
  const electionSlug = currentElection.value?.slug;
  const slug = constituencies.value.find((c) => c.id === id)?.slug;
  if (electionSlug && slug) {
    router.push(`/elections-senegal/${electionSlug}/candidats/circonscription/${slug}`);
  }
};

useSeoMeta({
  title: () =>
    currentElection.value?.name
      ? `Candidats · ${currentElection.value.name}`
      : 'Candidats | Élections Sénégal',
  description: () =>
    currentElection.value?.name
      ? `Découvrez tous les candidats et coalitions pour ${currentElection.value.name}.`
      : 'Candidats et coalitions des élections au Sénégal.',
  ogTitle: () =>
    currentElection.value?.name
      ? `Candidats · ${currentElection.value.name}`
      : 'Candidats des Élections au Sénégal',
  ogDescription: () =>
    currentElection.value?.name
      ? `Découvrez tous les candidats et coalitions pour ${currentElection.value.name}.`
      : 'Candidats et coalitions des élections au Sénégal.',
});
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-8">
    <transition name="fade">
      <ElectionsDashboardElectoralDetailsCard
        v-if="currentElection"
        :election="currentElection"
        :coalitions="coalitions"
        :constituencies="constituencies"
        class="animate-in fade-in slide-in-from-top-4 mb-6 duration-700"
      />
    </transition>

    <transition name="fade">
      <ElectionsDashboardStatsKPI
        v-if="currentElection?.status === 'completed' && hasElectionStats"
        :election="currentElection"
        class="animate-in fade-in slide-in-from-top-4 mb-8 duration-500"
      />
    </transition>

    <div class="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <div class="flex flex-col gap-4">
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            {{
              isLocalElection
                ? 'Les Circonscriptions'
                : selectedType === 'presidential'
                  ? 'Les Candidats'
                  : 'Les Coalitions'
            }}
          </h2>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {{
              isLocalElection
                ? 'Sélectionnez une circonscription pour voir les coalitions en lice.'
                : selectedType === 'presidential'
                  ? 'Sélectionnez un candidat pour voir son programme et ses informations.'
                  : 'Sélectionnez une plateforme pour voir ses listes et candidats.'
            }}
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div v-if="selectedType !== 'presidential'" class="group relative max-w-md flex-1">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <UIcon
                name="i-heroicons-magnifying-glass-20-solid"
                class="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-gray-500"
              />
            </div>
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="
                selectedType === 'locale' ? 'Rechercher...' : 'Rechercher une coalition...'
              "
              class="block w-full rounded-xl border-0 bg-gray-100 py-3 pl-11 pr-10 text-sm text-gray-900 ring-1 ring-transparent transition-all placeholder:text-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-gray-800/80 dark:focus:ring-gray-500 sm:py-2.5"
            />
            <button
              v-if="searchQuery"
              type="button"
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

          <UBadge
            size="md"
            color="white"
            class="shrink-0 self-start border shadow-sm dark:border-gray-800 sm:self-center"
          >
            <span class="text-primary-600 mr-1 font-black">{{
              isLocalElection
                ? constituencies.length
                : selectedType === 'presidential'
                  ? displayedPresidentialCoalitions.length
                  : coalitions.length
            }}</span>
            {{
              isLocalElection
                ? 'circonscriptions'
                : selectedType === 'presidential'
                  ? 'candidats'
                  : 'coalitions'
            }}
          </UBadge>
        </div>
      </div>

      <!-- Filtre tour présidentielle (si second tour disponible) -->
      <div
        v-if="selectedType === 'presidential' && hasRound2Coalitions"
        class="flex w-fit items-center gap-1.5 rounded-2xl border bg-gray-100/50 p-1.5 dark:border-gray-700 dark:bg-gray-800/50"
      >
        <UButton
          :color="presidentialRoundFilter === 'all' ? 'primary' : 'gray'"
          :variant="presidentialRoundFilter === 'all' ? 'solid' : 'ghost'"
          size="xs"
          class="rounded-xl px-3 text-[10px] font-bold uppercase tracking-widest"
          @click="presidentialRoundFilter = 'all'"
        >
          Tous les tours
        </UButton>
        <UButton
          :color="presidentialRoundFilter === 'round2' ? 'amber' : 'gray'"
          :variant="presidentialRoundFilter === 'round2' ? 'solid' : 'ghost'"
          size="xs"
          class="rounded-xl px-3 text-[10px] font-bold uppercase tracking-widest"
          @click="presidentialRoundFilter = 'round2'"
        >
          2<sup>e</sup> tour
        </UButton>
      </div>

      <!-- Sélecteur vue législatives -->
      <div
        v-if="selectedType === 'legislative'"
        class="mx-auto grid w-full grid-cols-3 items-center justify-center gap-1.5 rounded-2xl border bg-gray-100/50 p-1.5 dark:border-gray-700 dark:bg-gray-800/50 md:flex md:w-fit"
      >
        <UButton
          v-for="view in [
            { id: 'list', label: 'LISTE', icon: 'i-heroicons-list-bullet' },
            { id: 'head', label: 'TÊTES DE LISTE', icon: 'i-heroicons-user' },
            { id: 'ballot', label: 'BULLETINS', icon: 'i-heroicons-document-duplicate' },
          ]"
          :key="view.id"
          :color="legislativeViewType === view.id ? 'primary' : 'gray'"
          :variant="legislativeViewType === view.id ? 'solid' : 'ghost'"
          size="xs"
          class="flex justify-center rounded-xl px-2 py-2 text-[9px] font-bold uppercase tracking-widest transition-all duration-300 md:px-4 md:text-[10px]"
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
        <div
          v-else-if="constituencies.length > 0"
          class="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          <ElectionsDashboardCardsConstituencyCard
            v-for="c in constituencies"
            :key="c.id"
            :constituency="c"
            @select="goToConstituency"
          />
        </div>
        <ElectionsDashboardEmptyStateCoalitions v-else />
      </template>

      <!-- Présidentielle & législatives : coalitions -->
      <template v-else>
        <ElectionsDashboardCoalitionGridLoadingState v-if="loadingCoalitions" />

        <div
          v-else-if="coalitions.length > 0 && selectedType === 'presidential'"
          class="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          <ElectionsDashboardCardsLegislativeCoalitionHeadCard
            v-for="c in displayedPresidentialCoalitions"
            :key="c.id"
            :coalition="c"
            :show-round2-badge="isPresidential2Rounds"
            @select="goToCoalition"
          />
        </div>

        <div
          v-else-if="coalitions.length > 0"
          :class="
            legislativeViewType === 'list'
              ? 'grid grid-cols-1 gap-2 md:grid-cols-2'
              : 'grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          "
        >
          <template v-if="legislativeViewType === 'list'">
            <ElectionsDashboardCardsLegislativeCoalitionListCard
              v-for="c in coalitions"
              :key="c.id"
              :coalition="c"
              @select="goToCoalition"
            />
          </template>
          <template v-else-if="legislativeViewType === 'head'">
            <ElectionsDashboardCardsLegislativeCoalitionHeadCard
              v-for="c in coalitions"
              :key="c.id"
              :coalition="c"
              @select="goToCoalition"
            />
          </template>
          <template v-else-if="legislativeViewType === 'ballot'">
            <ElectionsDashboardCardsLegislativeCoalitionBallotCard
              v-for="c in coalitions"
              :key="c.id"
              :coalition="c"
              @select="goToCoalition"
            />
          </template>
        </div>

        <ElectionsDashboardEmptyStateCoalitions v-else />
      </template>
    </div>
  </div>
</template>
