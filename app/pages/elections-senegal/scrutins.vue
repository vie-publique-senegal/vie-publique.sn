<script setup lang="ts">
/**
 * Historique des scrutins : liste toutes les élections publiées (terminées,
 * en cours, programmées) avec lien vers leur tableau de bord.
 */
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';

const { config, loadingConfig } = useElectoralDashboard();

const route = useRoute();
const router = useRouter();
const itemsPerPage = 10;
const currentPage = ref(Math.max(1, Number(route.query.page) || 1));
const searchQuery = ref((route.query.q as string) || '');

watch(currentPage, (page) => {
  router.replace({ query: { ...route.query, page: page > 1 ? String(page) : undefined } });
});

// Comparaison insensible à la casse ET aux accents (ex: "legislatives" doit
// matcher "Législatives").
const normalizeSearchable = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

watch(searchQuery, (q) => {
  currentPage.value = 1;
  router.replace({ query: { ...route.query, q: q || undefined, page: undefined } });
});

const typeLabels: Record<string, string> = {
  presidential: 'Présidentielle',
  legislative: 'Législatives',
  locale: 'Locales',
};

const statusMeta: Record<string, { label: string; color: string }> = {
  ongoing: { label: 'En cours', color: 'primary' },
  scheduled: { label: 'Programmée', color: 'blue' },
  completed: { label: 'Terminée', color: 'green' },
};

const formatCount = (value?: number | null) =>
  value === null || value === undefined ? null : Number(value).toLocaleString('fr-FR');

// Chiffres clés affichables par scrutin (seuls les champs renseignés sortent)
const statsOf = (e: any) => {
  const stats: { label: string; value: string }[] = [];
  if (e.participation_rate)
    stats.push({ label: 'Participation', value: `${e.participation_rate}%` });
  if (e.registered_voters)
    stats.push({ label: 'Inscrits', value: formatCount(e.registered_voters)! });
  if (e.voters_count) stats.push({ label: 'Votants', value: formatCount(e.voters_count)! });
  if (Number(e.rounds) === 2) stats.push({ label: 'Tours', value: '2' });
  return stats.slice(0, 3);
};

const elections = computed(() =>
  [...(config.value?.elections || [])]
    .sort((a, b) => new Date(b.election_date).getTime() - new Date(a.election_date).getTime())
    .map((e) => ({
      ...e,
      typeLabel: typeLabels[e.type] || e.type,
      status: statusMeta[e.status] ? e.status : 'completed',
      dateLabel: new Date(e.election_date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      stats: statsOf(e),
      to: e.slug
        ? `/elections-senegal/${e.slug}/${e.status === 'completed' ? 'resultats' : 'candidats'}`
        : null,
    })),
);

const filteredElections = computed(() => {
  if (!searchQuery.value.trim()) return elections.value;

  const query = normalizeSearchable(searchQuery.value.trim());
  return elections.value.filter((e) => {
    const haystack = normalizeSearchable(
      `${e.name || ''} ${e.typeLabel} ${e.year} ${e.dateLabel}`,
    );
    return haystack.includes(query);
  });
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredElections.value.length / itemsPerPage)),
);

// Ramène la page dans les bornes si l'URL pointe vers une page qui n'existe plus
watch(
  totalPages,
  (pages) => {
    if (currentPage.value > pages) currentPage.value = pages;
  },
  { immediate: true },
);

const paginatedElections = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredElections.value.slice(start, start + itemsPerPage);
});

const NuxtLinkComponent = resolveComponent('NuxtLink');

const { siteUrl, siteName } = useSiteMetadata();
const url = `${siteUrl}/elections-senegal/scrutins`;

const title = 'Toutes les élections au Sénégal | Historique des scrutins';
const description =
  'Historique des scrutins au Sénégal : élections présidentielles, législatives et locales, avec résultats, candidats et documents officiels.';

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: url,
  twitterTitle: title,
  twitterDescription: description,
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
          { '@type': 'ListItem', position: 3, name: 'Tous les scrutins', item: url },
        ],
      }),
    },
  ],
});
</script>

<template>
  <div class="min-h-screen pb-20 dark:bg-gray-900">
    <div class="container mx-auto px-4 pt-4">
      <AppBreadcrumb
        :items="[{ label: 'Élections', to: '/elections-senegal' }, { label: 'Tous les scrutins' }]"
      />
    </div>

    <header class="container mx-auto px-4 py-3 md:py-6">
      <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
        Toutes les élections
      </h1>
      <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        Historique des scrutins présidentiels, législatifs et locaux au Sénégal
      </p>
    </header>

    <main class="container mx-auto px-4">
      <!-- Recherche -->
      <div class="group relative mb-4 md:mb-6">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <UIcon
            name="i-heroicons-magnifying-glass-20-solid"
            class="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-gray-500"
          />
        </div>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Rechercher une élection..."
          class="block w-full rounded-xl border-0 bg-gray-100 py-3 pl-11 pr-10 text-sm text-gray-900 ring-1 ring-transparent transition-all placeholder:text-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 sm:py-2.5 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-gray-800/80 dark:focus:ring-gray-500"
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

      <!-- Skeleton chargement -->
      <div v-if="loadingConfig" class="space-y-2 md:space-y-3">
        <div
          v-for="i in 4"
          :key="i"
          class="h-20 animate-pulse rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        />
      </div>

      <!-- État vide : aucune élection en base -->
      <div
        v-else-if="!elections.length"
        class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      >
        <UIcon
          name="i-heroicons-archive-box"
          class="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
        />
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Aucune élection disponible pour le moment.
        </p>
      </div>

      <!-- État vide : recherche sans résultat -->
      <div
        v-else-if="!filteredElections.length"
        class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      >
        <UIcon
          name="i-heroicons-magnifying-glass"
          class="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
        />
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Aucune élection ne correspond à votre recherche.
        </p>
      </div>

      <!-- Cards des scrutins -->
      <div v-else class="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <component
          :is="election.to ? NuxtLinkComponent : 'div'"
          v-for="election in paginatedElections"
          :key="`${election.type}-${election.year}`"
          :to="election.to || undefined"
          class="group flex h-full flex-col rounded-2xl bg-white p-4 ring-1 ring-gray-200 transition-all dark:bg-gray-800 dark:ring-gray-700 md:p-5"
          :class="
            election.to ? 'md:hover:ring-primary-300 active:scale-[0.99] md:hover:shadow-lg' : ''
          "
        >
          <div class="flex items-center gap-3">
            <div
              class="bg-primary-100 dark:bg-primary-900/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            >
              <UIcon
                name="i-heroicons-chart-bar"
                class="text-primary-600 dark:text-primary-400 h-5 w-5"
              />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="truncate text-sm font-semibold text-gray-900 dark:text-white md:text-base">
                {{ election.name || `${election.typeLabel} ${election.year}` }}
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ election.typeLabel }} · {{ election.dateLabel }}
              </p>
            </div>
            <UBadge
              :color="statusMeta[election.status]?.color || 'gray'"
              variant="subtle"
              size="xs"
              class="shrink-0"
            >
              {{ statusMeta[election.status]?.label || election.status }}
            </UBadge>
          </div>

          <!-- Chiffres clés (affichés uniquement s'ils sont renseignés) -->
          <div
            v-if="election.stats.length"
            class="mt-3 grid gap-2"
            :class="
              election.stats.length === 1
                ? 'grid-cols-1'
                : election.stats.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
            "
          >
            <div
              v-for="stat in election.stats"
              :key="stat.label"
              class="rounded-xl bg-gray-50 p-2.5 dark:bg-gray-700/30"
            >
              <p
                class="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                {{ stat.label }}
              </p>
              <p class="mt-0.5 text-sm font-bold text-gray-900 dark:text-white md:text-base">
                {{ stat.value }}
              </p>
            </div>
          </div>

          <p
            v-if="election.to"
            class="text-primary-600 dark:text-primary-400 mt-auto flex items-center gap-1 pt-3 text-xs font-medium"
          >
            {{ election.status === 'completed' ? 'Voir les résultats' : 'Voir le tableau de bord' }}
            <UIcon
              name="i-heroicons-arrow-right"
              class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            />
          </p>
        </component>
      </div>

      <!-- Pagination -->
      <div v-if="filteredElections.length > itemsPerPage" class="mt-6 flex justify-center md:mt-8">
        <UPagination
          v-model="currentPage"
          :total="filteredElections.length"
          :page-count="itemsPerPage"
          size="sm"
          :ui="{
            wrapper: 'flex items-center gap-1',
            rounded: 'rounded-lg',
          }"
        />
      </div>
    </main>

    <ScrollToTopButton />
  </div>
</template>
