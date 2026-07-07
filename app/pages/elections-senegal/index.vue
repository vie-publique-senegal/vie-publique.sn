<script setup lang="ts">
import { useElectoralCoalitions } from '~/composables/elections/dashboard/useElectoralCoalitions';
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useNews } from '~/composables/news/useNews';

const { config, loadingConfig } = useElectoralDashboard();

const election = computed(() => {
  if (!config.value?.elections) return null;

  // 1. En cours (Priorité absolue)
  const ongoing = config.value.elections.find(e => e.status === 'ongoing');
  if (ongoing) return ongoing;

  // 2. Terminé (Le plus récent) - PAR DÉFAUT
  const completed = config.value.elections
    .filter(e => e.status === 'completed')
    .sort((a, b) => new Date(b.election_date).getTime() - new Date(a.election_date).getTime())[0];
  if (completed) return completed;

  // 3. Programmé (Le plus proche)
  const scheduled = config.value.elections
    .filter(e => e.status === 'scheduled')
    .sort((a, b) => new Date(a.election_date).getTime() - new Date(b.election_date).getTime())[0];

  return scheduled;
});

const { coalitions } = useElectoralCoalitions({
  year: computed(() => election.value?.year),
  type: computed(() => election.value?.type),
  ranking: true,
  search: ref('')
});

const {
  articles: electionNews,
  loading: loadingNews,
  error: errorNews
} = useNews({
  category: 'Election',
  limit: 3,
  sort: '-date_published',
  syncUrl: false
});

const winningCoalition = computed(() => {
  if (election.value?.type !== 'presidential' || !coalitions.value?.length) return null;
  return [...coalitions.value].sort(
    (a, b) => (Number(b.pourcentage) || 0) - (Number(a.pourcentage) || 0)
  )[0];
});

const totalSeats = (c: { sieges?: number; sieges_departement?: number }) =>
  (Number(c.sieges) || 0) + (Number(c.sieges_departement) || 0);

const topLegislativeCoalitions = computed(() => {
  if (election.value?.type !== 'legislative' || !coalitions.value) return [];
  return [...coalitions.value].sort((a, b) => totalSeats(b) - totalSeats(a)).slice(0, 2);
});

const typeLabels: Record<string, string> = {
  presidential: 'Présidentielle',
  legislative: 'Législatives',
  locale: 'Locales'
};

const statusLabels: Record<string, string> = {
  ongoing: 'En cours',
  scheduled: 'Programmée',
  completed: 'Terminée'
};

const electionDate = computed(() =>
  election.value
    ? new Date(election.value.election_date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : ''
);

const navigationLinks = computed(() => {
  const links = [
    {
      title: 'Guide Électoral',
      description: 'Comment voter ?',
      icon: 'i-heroicons-book-open',
      to: '/elections-senegal/guide-electoral',
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      hoverRing: 'md:hover:ring-blue-200'
    },
    {
      title: 'Législation',
      description: 'Textes de lois et décrets',
      icon: 'i-heroicons-scale',
      to: '/elections-senegal/legislation',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      hoverRing: 'md:hover:ring-emerald-200'
    },
    {
      title: 'Carte Électorale',
      description: 'Lieux et bureaux de vote',
      icon: 'i-heroicons-map',
      to: election.value
        ? `/elections-senegal/carte-electorale?type=${election.value.type}&year=${election.value.year}`
        : '/elections-senegal/carte-electorale',
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      hoverRing: 'md:hover:ring-purple-200'
    }
  ];

  if (election.value?.type === 'legislative' && election.value?.status === 'completed') {
    links.push({
      title: 'Députés élus',
      description: 'Annuaire des députés',
      icon: 'i-heroicons-users',
      to: '/assemblee-nationale/deputes',
      iconColor: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      hoverRing: 'md:hover:ring-orange-200'
    });
  }

  return links;
});

// SEO
const title = 'Élections au Sénégal | Résultats, candidats et carte électorale';
const description =
  'Suivez les élections au Sénégal : résultats officiels, coalitions et candidats, carte électorale, guide de l\'électeur et législation électorale.';

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterTitle: title,
  twitterDescription: description
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20 dark:bg-gray-900">
    <!-- Breadcrumb -->
    <div class="container mx-auto px-4 pt-4">
      <AppBreadcrumb :items="[{ label: 'Élections' }]" />
    </div>

    <!-- Header mobile-first -->
    <header class="container mx-auto px-4 py-3 md:py-6">
      <h1 class="text-xl font-bold text-gray-900 md:text-3xl dark:text-white">
        Élections au Sénégal
      </h1>
      <p class="mt-0.5 text-xs text-gray-500 md:mt-1 md:text-sm dark:text-gray-400">
        Résultats, candidats et ressources électorales
      </p>
    </header>

    <main class="container mx-auto px-4">
      <!-- Skeleton chargement -->
      <div
        v-if="loadingConfig"
        class="mb-6 animate-pulse rounded-2xl bg-white p-4 ring-1 ring-gray-200 md:p-6 dark:bg-gray-800 dark:ring-gray-700"
      >
        <div class="mb-4 flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div class="space-y-2">
            <div class="h-3 w-40 rounded bg-gray-200 dark:bg-gray-700" />
            <div class="h-2.5 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 md:gap-4">
          <div class="h-20 rounded-xl bg-gray-100 dark:bg-gray-700/50" />
          <div class="h-20 rounded-xl bg-gray-100 dark:bg-gray-700/50" />
          <div class="h-20 rounded-xl bg-gray-100 dark:bg-gray-700/50" />
        </div>
      </div>

      <!-- Hero Card : Élection en vedette -->
      <NuxtLink
        v-else-if="election"
        :to="election.slug ? `/elections-senegal/${election.slug}/resultats` : '/elections-senegal'"
        class="group mb-6 block rounded-2xl bg-white p-4 ring-1 ring-gray-200 transition-all active:scale-[0.99] md:p-6 md:hover:shadow-lg md:hover:ring-primary-300 dark:bg-gray-800 dark:ring-gray-700"
      >
        <!-- Header carte -->
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
              <UIcon name="i-heroicons-chart-bar" class="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 class="text-sm font-semibold text-gray-900 md:text-base dark:text-white">
                {{ election.name || `${typeLabels[election.type] || ''} ${election.year}` }}
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ electionDate }}</p>
            </div>
          </div>
          <UIcon
            name="i-heroicons-arrow-right"
            class="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 dark:text-gray-500"
          />
        </div>

        <!-- Badges statut / participation -->
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <UBadge
            :color="election.status === 'completed' ? 'green' : 'primary'"
            variant="subtle"
            size="xs"
          >
            {{ statusLabels[election.status] || election.status }}
          </UBadge>
          <span
            v-if="election.participation_rate"
            class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 md:text-xs dark:bg-blue-900/30 dark:text-blue-300"
          >
            <UIcon name="i-heroicons-chart-pie" class="h-3 w-3" />
            Participation {{ election.participation_rate }}%
          </span>
        </div>

        <!-- Résultat Présidentielle : vainqueur -->
        <div
          v-if="winningCoalition"
          class="flex items-center gap-4 rounded-xl bg-emerald-50 p-3 md:p-4 dark:bg-emerald-900/20"
        >
          <div class="relative shrink-0">
            <div
              v-if="winningCoalition.head_of_list?.photo"
              class="h-14 w-14 overflow-hidden rounded-full ring-2 ring-white md:h-16 md:w-16 dark:ring-gray-800"
            >
              <CmsImage :src="winningCoalition.head_of_list.photo" class="h-full w-full object-cover" />
            </div>
            <div
              v-else
              class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 md:h-16 md:w-16 dark:bg-emerald-900/40"
            >
              <UIcon name="i-heroicons-trophy" class="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span
              class="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
            >
              Élu
            </span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-medium uppercase tracking-wide text-emerald-600 md:text-xs dark:text-emerald-400">
              Président de la République
            </p>
            <p class="truncate text-sm font-bold text-gray-900 md:text-base dark:text-white">
              {{ winningCoalition.head_of_list?.first_name }} {{ winningCoalition.head_of_list?.last_name }}
            </p>
            <div class="mt-0.5 flex items-baseline gap-2">
              <span class="text-xl font-bold text-emerald-700 md:text-2xl dark:text-emerald-300">
                {{ winningCoalition.pourcentage ? winningCoalition.pourcentage.toFixed(2) + '%' : '--%' }}
              </span>
              <span class="text-[10px] text-gray-500 md:text-xs dark:text-gray-400">
                {{ winningCoalition.voix?.toLocaleString('fr-FR') || 0 }} voix
              </span>
            </div>
          </div>
        </div>

        <!-- Résultat Législatives : top 2 coalitions -->
        <div v-else-if="topLegislativeCoalitions.length" class="grid grid-cols-2 gap-2 md:gap-4">
          <div
            v-for="(coalition, idx) in topLegislativeCoalitions"
            :key="coalition.id"
            :class="idx === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-50 dark:bg-gray-700/30'"
            class="rounded-xl p-3"
          >
            <p
              :class="idx === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'"
              class="truncate text-[10px] font-medium md:text-xs"
            >
              {{ coalition.name }}
            </p>
            <p
              :class="idx === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white'"
              class="mt-1 text-lg font-bold md:text-2xl"
            >
              {{ totalSeats(coalition) }}
            </p>
            <p class="mt-0.5 text-[10px] text-gray-500 md:text-xs dark:text-gray-400">
              sièges · {{ coalition.voix?.toLocaleString('fr-FR') || 0 }} voix
            </p>
          </div>
        </div>

        <!-- CTA -->
        <p class="mt-4 text-xs font-medium text-primary-600 md:text-sm dark:text-primary-400">
          Voir le tableau de bord complet
        </p>
      </NuxtLink>

      <!-- Navigation Links - Mobile: liste verticale, Desktop: grille -->
      <div class="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-4">
        <NuxtLink
          v-for="link in navigationLinks"
          :key="link.title"
          :to="link.to"
          :class="link.hoverRing"
          class="group flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-gray-100 transition-all active:scale-[0.98] md:flex-col md:items-start md:gap-0 md:p-4 md:hover:shadow-md dark:bg-gray-800 dark:ring-gray-700"
        >
          <div
            :class="link.iconBg"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg md:mb-3"
          >
            <UIcon :name="link.icon" :class="link.iconColor" class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ link.title }}</h3>
            <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ link.description }}</p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="h-4 w-4 shrink-0 text-gray-300 md:hidden dark:text-gray-600"
          />
        </NuxtLink>
      </div>

      <!-- Section Actualités électorales -->
      <section class="mt-6 md:mt-8">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">
            Actualités Électorales
          </h2>
        </div>
        <div class="rounded-2xl bg-white p-4 ring-1 ring-gray-100 md:p-6 dark:bg-gray-800 dark:ring-gray-700">
          <NewsGrid
            :articles="electionNews"
            :loading="loadingNews"
            :error="errorNews"
            :limit="3"
            :show-view-all="true"
            empty-message="Aucune actualité électorale disponible pour le moment"
            view-all-text="Voir toutes les actualités"
            view-all-link="/actualites"
          />
        </div>
      </section>

      <!-- Note sources -->
      <p class="mt-8 border-t border-gray-200 pt-6 text-center text-[10px] text-gray-500 dark:border-gray-800">
        Toutes les informations sont issues de sources officielles : DGE, Conseil Constitutionnel.
      </p>
    </main>

    <ScrollToTopButton />
  </div>
</template>
