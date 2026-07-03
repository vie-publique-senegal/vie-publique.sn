<script setup lang="ts">
import type { Government, GovernmentWithStats } from '~~/types/government';

const { siteName, siteUrl, keywords, themeColor } = useSiteMetadata();

const {
  governments,
  byPresidency,
  presidents,
  q,
  president,
  updateFilters,
  loading: pending,
  error,
} = useGovernmentHistory();

/* --------------------- Recherche & filtres (URL) ------------------------- */

// Champ de recherche local synchronisé avec le query param `?q=` (debounce 300ms).
const searchInput = ref(q.value);
watch(q, (value) => {
  if (value !== searchInput.value) searchInput.value = value;
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(searchInput, (value) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    updateFilters({ q: value.trim() }, 'replace');
  }, 200);
});
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

// Filtre présidence via le query param `?president=` (changement volontaire → push).
const selectPresident = (slug: string) => {
  updateFilters({ president: president.value === slug ? '' : slug }, 'push');
};

const clearFilters = () => {
  searchInput.value = '';
  updateFilters({ q: '', president: '' }, 'push');
};

const hasActiveFilters = computed(() => Boolean(q.value || president.value));
const noResults = computed(() => !pending.value && !error.value && governments.value.length === 0);

const title = 'Historique des gouvernements du Sénégal depuis 1960 | Vie Publique Sénégal';
const description =
  "Frise chronologique de tous les gouvernements du Sénégal depuis l'indépendance en 1960 : présidents, premiers ministres, décrets de nomination et composition, de Senghor à Bassirou Diomaye Faye.";
const url = `${siteUrl}/gouvernement-senegal/historique`;
const image = `${siteUrl}/nomination-3.png`;

/* ------------------------------- Helpers --------------------------------- */

const MONTHS_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

const formatMonthYear = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

const formatPeriod = (gov: Government): string => {
  const start = formatMonthYear(gov.start_date);
  if (gov.end_date === null) return `depuis ${start}`;
  return `${start} - ${formatMonthYear(gov.end_date)}`;
};

const formatDuration = (gov: Government): string => {
  const start = new Date(gov.start_date).getTime();
  const end = gov.end_date ? new Date(gov.end_date).getTime() : Date.now();
  const days = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
  if (days < 31) return `${days} jour${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} an${years > 1 ? 's' : ''}`;
  return `${years} an${years > 1 ? 's' : ''} et ${rem} mois`;
};

const presidencyLabel = (slug: string, name: string | undefined): string => {
  return name || slug;
};

/* --------------------------------- SEO ----------------------------------- */

const itemListSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Historique des gouvernements du Sénégal',
  description,
  numberOfItems: governments.value.length,
  itemListElement: governments.value.map((g, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: g.name,
    url: `${siteUrl}/gouvernement-senegal/${g.slug}`,
  })),
}));

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Annuaires',
      item: `${siteUrl}/annuaires`,
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Gouvernement du Sénégal',
      item: `${siteUrl}/gouvernement-senegal`,
    },
    {
      '@type': 'ListItem',
      position: 4,
      name: 'Historique',
      item: url,
    },
  ],
};

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogImage: image,
  ogUrl: url,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: image,
  keywords: [
    ...keywords,
    'historique gouvernements sénégal',
    'gouvernements sénégal depuis 1960',
    'premiers ministres sénégal',
    'présidents sénégal',
    'Senghor',
    'Abdou Diouf',
    'Abdoulaye Wade',
    'Macky Sall',
    'Bassirou Diomaye Faye',
    'remaniements ministériels sénégal',
  ].join(', '),
});

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: [{ rel: 'canonical', href: url }],
  meta: [
    { name: 'theme-color', content: themeColor },
    { name: 'author', content: siteName },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
    { name: 'robots', content: 'index, follow' },
  ],
  script: [
    {
      type: 'application/ld+json',
      children: computed(() => JSON.stringify(itemListSchema.value)),
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify(breadcrumbSchema),
    },
  ],
});

const govUrl = (gov: GovernmentWithStats) => `/gouvernement-senegal/${gov.slug}`;

// Image du président pour l'en-tête d'accordéon (CMS).
const presidentPhoto = (photo: string | null | undefined) =>
  photo ? useCmsImage(photo) : '/unknown_member.webp';

// Accordéon : une seule présidence ouverte. Au chargement, la présidence en cours est dépliée.
const openPresidency = ref<string | null>(null);
const currentPresidencySlug = computed(
  () =>
    byPresidency.value.find((g) => g.endDate === null)?.presidentSlug ??
    byPresidency.value[0]?.presidentSlug ??
    null,
);
watch(
  currentPresidencySlug,
  (slug) => {
    if (openPresidency.value === null && slug) openPresidency.value = slug;
  },
  { immediate: true },
);

// Ouvrir automatiquement les présidences avec résultats de recherche
watch(
  [byPresidency, q, president],
  ([presidencies, searchQuery]) => {
    // Si recherche active et résultats, ouvrir la première présidence avec résultats
    if (searchQuery && presidencies.length > 0) {
      openPresidency.value = presidencies[0].presidentSlug;
    }
  },
  { immediate: true },
);

const togglePresidency = (slug: string) => {
  openPresidency.value = openPresidency.value === slug ? null : slug;
};
</script>

<template>
  <div class="min-h-screen pb-20 dark:bg-gray-900/95">
    <!-- Breadcrumb -->
    <div class="container mx-auto px-4 pt-2">
      <AppBreadcrumb
        :items="[
          { label: 'Annuaires', to: '/annuaires' },
          { label: 'Gouvernement', to: '/gouvernement-senegal' },
          { label: 'Historique' },
        ]"
      />
    </div>

    <!-- Sticky header -->
    <header
      class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95"
    >
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              Historique des gouvernements du Sénégal
            </h1>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Depuis l'indépendance en 1960
            </p>
          </div>
          <div class="hidden items-center gap-3 sm:flex">
            <span
              class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {{ governments.length }} gouvernements
            </span>
            <span
              class="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
            >
              {{ presidents.length }} présidences
            </span>
          </div>
        </div>
        <!-- Stats mobile -->
        <div class="mt-2 flex items-center gap-2 sm:hidden">
          <span
            class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            {{ governments.length }} gouvernements
          </span>
          <span
            class="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-600 dark:bg-sky-900/30 dark:text-sky-300"
          >
            {{ presidents.length }} présidences
          </span>
        </div>
      </div>
    </header>

    <main class="container mx-auto max-w-3xl px-4 pt-6">
      <!-- Barre de recherche + filtre présidence -->
      <div v-if="!error" class="mb-8 space-y-3">
        <div class="relative">
          <UIcon
            name="i-heroicons-magnifying-glass"
            class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            v-model="searchInput"
            type="search"
            aria-label="Rechercher un gouvernement ou un Premier Ministre"
            placeholder="Rechercher un gouvernement ou un Premier Ministre…"
            class="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <!-- Filtre par présidence (chips dérivées dynamiquement) -->
        <div
          v-if="presidents.length"
          class="flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrer par présidence"
        >
          <button
            type="button"
            class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            :class="
              !president
                ? 'bg-sky-600 text-white dark:bg-sky-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            "
            @click="updateFilters({ president: '' }, 'push')"
          >
            Toutes
          </button>
          <button
            v-for="p in presidents"
            :key="p.slug"
            type="button"
            class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            :class="
              president === p.slug
                ? 'bg-sky-600 text-white dark:bg-sky-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            "
            @click="selectPresident(p.slug)"
          >
            {{ p.full_name }}
            <span class="opacity-70">({{ p.count }})</span>
          </button>
        </div>

        <!-- Filtres actifs -->
        <div
          v-if="hasActiveFilters"
          class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
        >
          <span>{{ governments.length }} résultat{{ governments.length > 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="pending" class="space-y-6">
        <div v-for="n in 6" :key="n" class="flex gap-4">
          <USkeleton class="h-3 w-3 flex-shrink-0 rounded-full" />
          <div class="flex-1 space-y-3">
            <USkeleton class="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="py-12 text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
        >
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="h-8 w-8 text-red-600 dark:text-red-400"
          />
        </div>
        <p class="text-sm font-medium text-gray-900 dark:text-white">Erreur de chargement</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Impossible de charger l'historique des gouvernements
        </p>
        <UButton color="red" variant="soft" size="sm" class="mt-4" @click="$router.go(0)">
          Réessayer
        </UButton>
      </div>

      <!-- Aucun résultat -->
      <div v-else-if="noResults" class="py-12 text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
        >
          <UIcon
            name="i-heroicons-magnifying-glass"
            class="h-8 w-8 text-gray-400 dark:text-gray-500"
          />
        </div>
        <p class="text-sm font-medium text-gray-900 dark:text-white">Aucun gouvernement trouvé</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Aucun résultat ne correspond à votre recherche.
        </p>
        <UButton color="sky" variant="soft" size="sm" class="mt-4" @click="clearFilters">
          Réinitialiser
        </UButton>
      </div>

      <!-- Contenu : regroupement par présidence (accordéon, une seule ouverte) -->
      <div v-else class="space-y-4">
        <section
          v-for="group in byPresidency"
          :key="group.presidentSlug"
          class="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <!-- En-tête présidence (toggle accordéon) -->
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-gray-700/50"
            :aria-expanded="openPresidency === group.presidentSlug"
            @click="togglePresidency(group.presidentSlug)"
          >
            <img
              :src="presidentPhoto(group.president?.photo)"
              :alt="group.president?.full_name || 'Président'"
              class="size-11 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-600"
              loading="lazy"
            />
            <div class="min-w-0 flex-1">
              <h2 class="truncate text-base font-semibold text-gray-900 dark:text-white">
                {{ presidencyLabel(group.presidentSlug, group.president?.full_name) }}
              </h2>
              <p class="text-xs text-gray-400 dark:text-gray-500">
                {{ formatMonthYear(group.startDate) }} -
                {{ group.endDate ? formatMonthYear(group.endDate) : 'aujourd’hui' }}
                · {{ group.governments.length }} gouvernement{{
                  group.governments.length > 1 ? 's' : ''
                }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-chevron-down"
              class="size-5 flex-shrink-0 text-gray-400 transition-transform"
              :class="openPresidency === group.presidentSlug ? 'rotate-180' : ''"
            />
          </button>

          <!-- Frise verticale (corps de l'accordéon) -->
          <div v-show="openPresidency === group.presidentSlug" class="px-4 pb-4">
            <ol
              class="relative space-y-4 border-l-2 border-gray-300 pt-2 dark:border-gray-600"
            >
              <li v-for="(gov, index) in group.governments" :key="gov.id" class="relative pl-8">
                <!-- Numéro sur la frise -->
                <span
                  class="absolute left-0 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-xs font-bold text-white dark:border-gray-900"
                  :class="gov.end_date === null ? 'ring-2 ring-sky-300 dark:ring-sky-700' : ''"
                  aria-hidden="true"
                >
                  {{ group.governments.length - index }}
                </span>

                <div
                  class="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <NuxtLink
                        :to="govUrl(gov)"
                        class="group flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-sky-600 dark:text-white dark:hover:text-sky-400"
                      >
                        <span class="truncate">{{ gov.name }}</span>
                        <UIcon
                          name="i-heroicons-chevron-right"
                          class="size-4 flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-600 dark:text-gray-500 dark:group-hover:text-sky-400"
                        />
                      </NuxtLink>
                      <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {{ formatPeriod(gov) }} · {{ formatDuration(gov) }}
                      </p>
                    </div>
                    <span
                      v-if="gov.end_date === null"
                      class="inline-flex flex-shrink-0 items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    >
                      En exercice
                    </span>
                  </div>

                  <!-- Premier ministre / présidence directe -->
                  <p class="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    <template v-if="gov.prime_minister">
                      <span class="text-gray-400 dark:text-gray-500">Premier Ministre :</span>
                      {{ gov.prime_minister.full_name }}
                    </template>
                    <template v-else>
                      <span class="italic text-gray-400 dark:text-gray-500"
                        >Présidence directe (sans Premier Ministre)</span
                      >
                    </template>
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
