<script setup lang="ts">
import { useElectoralCoalitions } from '../../../composables/elections/dashboard/useElectoralCoalitions';
import { useElectoralDashboard } from '../../../composables/elections/dashboard/useElectoralDashboard';
import { useNews } from '../../../composables/news/useNews';


/**
 * ElectoralLandingView - Vue d'accueil des élections (Landing page).
 * Affiche l'élection en cours ou la plus récente et les liens d'accès rapide.
 */

const dashboard = useElectoralDashboard();
const { config, loadingConfig } = dashboard;

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

const { articles: electionNews, loading: loadingNews, error: errorNews } = useNews({
  category: 'Election',
  limit: 3,
  sort: '-date_published',
  syncUrl: false
});

const winningCoalition = computed(() => {
  if (!coalitions.value?.length || election.value?.type !== 'presidential') return null;
  return [...coalitions.value].sort((a, b) => (Number(b.pourcentage) || 0) - (Number(a.pourcentage) || 0))[0];
});

const topLegislativeCoalitions = computed(() => {
  if (election.value?.type !== 'legislative' || !coalitions.value) return [];
  return [...coalitions.value].sort((a, b) => {
        const totalA = (Number(a.sieges) || 0) + (Number((a as any).sieges_departement) || 0);
        const totalB = (Number(b.sieges) || 0) + (Number((b as any).sieges_departement) || 0);
        return totalB - totalA;
     }).slice(0, 2);
});

const appConfig = useAppConfig();
const country = appConfig.vpsnElections?.country || 'Sénégal';
const links = appConfig.vpsnElections?.links;

const quickLinks = [
  {
    title: "Guide Électoral",
    description: "Comment voter ?",
    icon: "i-heroicons-book-open",
    to: links?.guide || "/elections/guide",
    color: "text-blue-600",
    bg: "bg-blue-50"
  },
  {
    title: "Législation",
    description: "Textes de lois et décrets",
    icon: "i-heroicons-scale",
    to: links?.legislation || "/elections/legislation",
    color: "text-emerald-600",
    bg: "bg-emerald-50"
  },
  {
    title: "Carte Électorale",
    description: "Lieux et bureaux de vote",
    icon: "i-heroicons-map",
    to: links?.map || "/elections/carte",
    color: "text-purple-600",
    bg: "bg-purple-50"
  }
];

const getStatusLabel = (status: string) => {
    switch(status) {
        case 'ongoing': return 'En Cours';
        case 'scheduled': return 'Programmée';
        case 'completed': return 'Terminée';
        default: return status;
    }
};
</script>

<template>
  <div class="min-h-screen pb-20">
    <div class="container mx-auto px-4 max-w-5xl py-12 space-y-8">
      <!-- Hero Section -->
      <section class="text-center mb-8">
        <div class="mx-auto max-w-4xl">
          <h1 class="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
            Élections {{ country }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            Retrouvez ci-dessous les informations de la dernière élection
            <span v-if="election" class="font-bold text-primary-600 lowercase">
              {{ election.type === 'presidential' ? 'présidentielle' : election.type === 'legislative' ? 'législative' : election.type === 'locale' ? 'locale' : '' }}
            </span>
            ainsi que l'ensemble des ressources électorales.
          </p>
        </div>
      </section>

      <!-- Featured Election Card -->
      <div v-if="loadingConfig" class="bg-white dark:bg-gray-900 rounded-3xl p-12 border shadow-sm text-center animate-pulse">
          <UIcon name="i-heroicons-arrow-path" class="h-10 w-10 animate-spin text-primary-500 mx-auto mb-4" />
          <p class="text-gray-400 font-bold uppercase tracking-widest text-xs">Synchronisation des données...</p>
      </div>

      <template v-else-if="election">
        <div class="bg-white dark:bg-gray-900 rounded-3xl border shadow-sm overflow-hidden transition-all hover:shadow-md group">
          <div class="flex flex-col lg:flex-row">
            <!-- Left Panel -->
            <div class="flex-1 p-6 lg:p-8 flex flex-col justify-center space-y-4">
              <div class="flex wrap items-center gap-3">
                <UBadge :color="election.status === 'completed' ? 'green' : 'primary'" variant="subtle" class="rounded-full font-black uppercase text-[10px]">
                  {{ getStatusLabel(election.status) }}
                </UBadge>
                <div class="flex items-center gap-1.5 text-gray-400 font-bold text-[10px] uppercase">
                  <UIcon name="i-heroicons-calendar" class="h-3.5 w-3.5" />
                  {{ new Date(election.election_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) }}
                </div>
              </div>
              <h2 class="text-2xl lg:text-3xl font-black uppercase tracking-tighter text-gray-900 dark:text-white leading-tight">
                {{ election.name }}
              </h2>
            </div>

            <!-- Right Panel: Results -->
            <div class="lg:w-[380px] bg-gray-50 dark:bg-gray-800/50 border-t lg:border-t-0 lg:border-l p-6 flex flex-col justify-center relative overflow-hidden">
                <div v-if="election.type === 'presidential' && winningCoalition" class="flex flex-row items-center gap-5">
                   <div class="relative">
                      <div v-if="winningCoalition?.head_of_list?.photo" class="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white shadow-md">
                         <CmsImage :src="winningCoalition.head_of_list.photo" class="w-full h-full object-cover" />
                      </div>
                      <div class="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase">Élu</div>
                   </div>
                   <div class="flex-1 min-w-0">
                      <p class="text-[9px] font-black uppercase text-gray-400 mb-1">Candidat élu</p>
                      <h3 class="text-lg font-black text-gray-900 dark:text-white leading-none mb-1.5">
                         {{ winningCoalition.head_of_list?.first_name }} {{ winningCoalition.head_of_list?.last_name }}
                      </h3>
                      <span class="text-3xl font-black text-emerald-600">{{ winningCoalition.pourcentage?.toFixed(2) }}%</span>
                   </div>
                </div>

                <div v-if="election.type === 'legislative' && topLegislativeCoalitions.length > 0" class="space-y-4">
                   <p class="text-[9px] font-black uppercase text-gray-400">Coalitions en tÃªte</p>
                   <div v-for="(c, idx) in topLegislativeCoalitions" :key="c.id" class="flex items-center justify-between">
                      <span class="text-xs font-bold truncate">{{ c.name }}</span>
                      <span class="text-lg font-black">{{ (Number(c.sieges) || 0) + (Number((c as any).sieges_departement) || 0) }} sièges</span>
                   </div>
                </div>
            </div>
          </div>
          <NuxtLink :to="`${links?.dashboard}/${election.type}/${election.year}?tab=resultats`" class="block p-4 bg-slate-50 dark:bg-gray-800/50 border-t text-center text-sm font-black uppercase tracking-widest text-gray-500 hover:text-primary-600 transition-all">
            Voir le tableau de bord complet <UIcon name="i-heroicons-arrow-right" class="ml-2 inline-block h-4 w-4" />
          </NuxtLink>
        </div>

        <!-- Quick Access -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <NuxtLink v-for="link in quickLinks" :key="link.title" :to="link.to" class="flex items-center gap-5 p-6 bg-white dark:bg-gray-900 rounded-2xl border shadow-sm hover:shadow-lg transition-all group">
            <div :class="[link.bg, link.color]" class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <UIcon :name="link.icon" class="w-6 h-6" />
            </div>
            <div>
              <h3 class="text-sm font-black uppercase group-hover:text-primary-600">{{ link.title }}</h3>
              <p class="text-xs text-gray-400">{{ link.description }}</p>
            </div>
          </NuxtLink>
        </div>

        <!-- News Integration -->
        <section v-if="electionNews?.length" class="mt-8">
            <h3 class="text-xl font-semibold mb-6">Actualités Électorales</h3>
            <NewsGrid :articles="electionNews" :loading="loadingNews" :error="errorNews" :limit="3" :show-view-all="true" view-all-link="/actualites" />
        </section>
      </template>
    </div>
  </div>
</template>

