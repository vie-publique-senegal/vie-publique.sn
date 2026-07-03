<script setup lang="ts">
import type { LeaderBrief, PrimeMinisterialTerm } from '~~/types/leader-history';

const { siteName, siteUrl, themeColor, keywords } = useSiteMetadata();

const { terms, gaps, total, current, loading: pending, error } = usePrimeMinisters();

const route = useRoute();
const router = useRouter();

// Filtre par président (slug) via URL
const presidentFilter = computed(() => (route.query.president as string) ?? '');

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

const formatMonthYear = (dateStr: string | null): string => {
  if (!dateStr) return 'aujourd’hui';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

const formatDuration = (days: number): string => {
  if (days < 31) return `${days} jour${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} an${years > 1 ? 's' : ''}`;
  return `${years} an${years > 1 ? 's' : ''} et ${rem} mois`;
};

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const pmUrl = (pm: LeaderBrief) => `/senegal/premiers-ministres/${pm.slug}`;
const presUrl = (p: LeaderBrief) => `/senegal/presidents/${p.slug}`;

// Présidents disponibles (pour le filtre), dérivés des terms
const presidentOptions = computed(() => {
  const map = new Map<string, string>();
  for (const t of terms.value) for (const p of t.presidents) map.set(p.slug, p.full_name);
  return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
});

// Liste filtrée, récent → ancien
const orderedTerms = computed<PrimeMinisterialTerm[]>(() => {
  let list = [...terms.value];
  if (presidentFilter.value) {
    list = list.filter((t) => t.presidents.some((p) => p.slug === presidentFilter.value));
  }
  return list.reverse();
});

const setPresident = (slug: string) => {
  const q = { ...route.query };
  if (slug) q.president = slug;
  else delete q.president;
  router.push({ query: q });
};

/* --------------------------------- SEO ----------------------------------- */

const title = 'Premiers ministres du Sénégal depuis 1960 | Vie Publique Sénégal';
const description = computed(
  () =>
    `Liste complète des ${total.value} Premiers ministres du Sénégal depuis 1960 avec leurs mandats, périodes d'exercice et présidents tutélaires.`,
);
const url = `${siteUrl}/senegal/premiers-ministres`;
const image = computed(() => {
  const photo = current.value?.prime_minister.photo ?? terms.value[0]?.prime_minister.photo;
  return photo ? `${siteUrl}${useCmsImage(photo)}` : `${siteUrl}/nomination-3.png`;
});

const itemListSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Premiers ministres du Sénégal',
  numberOfItems: orderedTerms.value.length,
  itemListElement: orderedTerms.value.map((t, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'Person',
      name: t.prime_minister.full_name,
      url: `${siteUrl}${pmUrl(t.prime_minister)}`,
      ...(t.prime_minister.photo
        ? { image: `${siteUrl}${useCmsImage(t.prime_minister.photo)}` }
        : {}),
    },
  })),
}));

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
  keywords: [...keywords, 'premiers ministres sénégal', 'liste premiers ministres sénégal'].join(
    ', ',
  ),
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
      key: 'ld-pms',
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(itemListSchema.value)),
    },
  ],
});
</script>

<template>
  <div class="min-h-screen pb-20 dark:bg-gray-900/95">
    <div class="container mx-auto px-4 pt-2">
      <AppBreadcrumb :items="[{ label: 'Sénégal' }, { label: 'Premiers ministres' }]" />
    </div>

    <header
      class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95"
    >
      <div class="container mx-auto flex items-center justify-between px-4 py-3">
        <div>
          <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            Premiers ministres du Sénégal
          </h1>
          <p class="text-xs text-gray-500 dark:text-gray-400">Depuis l'indépendance en 1960</p>
        </div>
        <span
          class="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
        >
          {{ total }} PM
        </span>
      </div>
    </header>

    <main class="container mx-auto max-w-3xl px-4 pt-6">
      <!-- Filtre président -->
      <div v-if="!pending && presidentOptions.length" class="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
          :class="
            !presidentFilter
              ? 'bg-sky-600 text-white dark:bg-sky-500'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          "
          @click="setPresident('')"
        >
          Tous
        </button>
        <button
          v-for="p in presidentOptions"
          :key="p.slug"
          type="button"
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
          :class="
            presidentFilter === p.slug
              ? 'bg-sky-600 text-white dark:bg-sky-500'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          "
          @click="setPresident(p.slug)"
        >
          {{ p.name }}
        </button>
      </div>

      <div v-if="pending" class="space-y-4">
        <USkeleton v-for="n in 5" :key="n" class="h-24 w-full rounded-xl" />
      </div>

      <div v-else-if="error" class="py-12 text-center">
        <p class="text-sm font-medium text-gray-900 dark:text-white">Erreur de chargement</p>
        <UButton color="sky" variant="soft" size="sm" class="mt-4" @click="$router.go(0)"
          >Réessayer</UButton
        >
      </div>

      <ol v-else class="relative space-y-4 border-l-2 border-gray-300 dark:border-gray-600">
        <li v-for="(t, index) in orderedTerms" :key="t.prime_minister.id" class="relative pl-8">
          <span
            class="absolute left-0 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-xs font-bold text-white dark:border-gray-900"
            :class="t.end_date === null ? 'ring-2 ring-sky-300 dark:ring-sky-700' : ''"
            aria-hidden="true"
          >
            {{ orderedTerms.length - index }}
          </span>
          <NuxtLink
            :to="pmUrl(t.prime_minister)"
            prefetch
            class="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <CmsImage
              v-if="t.prime_minister.photo"
              :src="t.prime_minister.photo"
              :alt="t.prime_minister.full_name"
              class="size-14 flex-shrink-0 rounded-full object-cover"
              loading="lazy"
              :width="56"
              :height="56"
            />
            <div
              v-else
              class="flex aspect-square size-14 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
            >
              {{ initials(t.prime_minister.full_name) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h2 class="truncate text-base font-semibold text-gray-900 dark:text-white">
                  {{ t.prime_minister.full_name }}
                </h2>
                <span
                  v-if="t.end_date === null"
                  class="inline-flex flex-shrink-0 items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  >En exercice</span
                >
              </div>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ formatMonthYear(t.start_date) }} - {{ formatMonthYear(t.end_date) }} ·
                {{ formatDuration(t.stats.duration_days) }}
              </p>
              <p class="mt-1 truncate text-xs text-gray-600 dark:text-gray-300">
                Sous : {{ t.presidents.map((p) => p.full_name).join(', ') }}
              </p>
            </div>
          </NuxtLink>
        </li>

        <!-- Périodes sans PM -->
        <li v-for="(gap, i) in gaps" :key="`gap-${i}`" class="relative pl-8">
          <span
            class="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gray-300 dark:border-gray-900 dark:bg-gray-600"
            aria-hidden="true"
          />
          <div
            class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400"
          >
            <span class="italic">{{ gap.label }}</span> · {{ formatMonthYear(gap.start_date) }} -
            {{ formatMonthYear(gap.end_date) }} ·
            <NuxtLink
              :to="presUrl(gap.president)"
              class="text-sky-600 hover:underline dark:text-sky-400"
              >{{ gap.president.full_name }}</NuxtLink
            >
          </div>
        </li>
      </ol>
    </main>
  </div>
</template>
