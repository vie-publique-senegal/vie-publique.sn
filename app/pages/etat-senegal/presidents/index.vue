<script setup lang="ts">
import type { PresidentialTerm } from '~~/types/leader-history';

const { siteName, siteUrl, themeColor, keywords } = useSiteMetadata();

const { terms, total, current, loading: pending, error } = usePresidents();

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

const formatTermPeriod = (t: PresidentialTerm): string => {
  const start = formatMonthYear(t.start_date);
  if (t.end_date === null) return `depuis ${start}`;
  return `${start} - ${formatMonthYear(t.end_date)}`;
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

const presidentUrl = (t: PresidentialTerm) => `/etat-senegal/presidents/${t.president.slug}`;

// Présentation chronologique récent → ancien
const orderedTerms = computed(() => [...terms.value].reverse());

/* --------------------------------- SEO ----------------------------------- */

const title = 'Présidents du Sénégal';
const description = computed(
  () =>
    `Découvrez tous les présidents du Sénégal depuis 1960 : mandats, gouvernements et Premiers ministres nommés.`,
);
const url = `${siteUrl}/etat-senegal/presidents`;
const image = computed(() => {
  const photo = current.value?.president.photo ?? terms.value[0]?.president.photo;
  return photo ? `${siteUrl}${useCmsImage(photo)}` : `${siteUrl}/nomination-3.png`;
});

const itemListSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Présidents de la République du Sénégal',
  numberOfItems: orderedTerms.value.length,
  itemListElement: orderedTerms.value.map((t, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'Person',
      name: t.president.full_name,
      url: `${siteUrl}${presidentUrl(t)}`,
      ...(t.president.photo ? { image: `${siteUrl}${useCmsImage(t.president.photo)}` } : {}),
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
  keywords: [
    ...keywords,
    'présidents sénégal',
    'présidents république sénégal',
    'Senghor',
    'Abdou Diouf',
    'Abdoulaye Wade',
    'Macky Sall',
    'Bassirou Diomaye Faye',
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
      key: 'ld-presidents',
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(itemListSchema.value)),
    },
  ],
});
</script>

<template>
  <div class="min-h-screen pb-20 dark:bg-gray-900/95">
    <div class="container mx-auto px-4 pt-2">
      <AppBreadcrumb :items="[{ label: 'État du Sénégal', to: '/etat-senegal' }, { label: 'Présidents' }]" />
    </div>

    <header
      class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:bg-gray-900/95"
    >
      <div class="container mx-auto flex items-center justify-between px-4 py-3">
        <div>
          <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            Présidents de la République du Sénégal
          </h1>
          <p class="text-xs text-gray-500 dark:text-gray-400">Depuis l'indépendance en 1960</p>
        </div>
        <span
          class="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
        >
          {{ total }} présidents
        </span>
      </div>
    </header>

    <main class="container mx-auto max-w-3xl px-4 pt-6">
      <!-- Loading -->
      <div v-if="pending" class="space-y-4">
        <USkeleton v-for="n in 5" :key="n" class="h-28 w-full rounded-xl" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-sm font-medium text-gray-900 dark:text-white">Erreur de chargement</p>
        <UButton color="sky" variant="soft" size="sm" class="mt-4" @click="$router.go(0)">
          Réessayer
        </UButton>
      </div>

      <!-- Timeline -->
      <ol v-else class="relative space-y-4 border-l-2 border-gray-300 dark:border-gray-600">
        <li v-for="(t, index) in orderedTerms" :key="t.president.id" class="relative pl-8">
          <span
            class="absolute left-0 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-xs font-bold text-white dark:border-gray-900"
            :class="t.end_date === null ? 'ring-2 ring-sky-300 dark:ring-sky-700' : ''"
            aria-hidden="true"
          >
            {{ orderedTerms.length - index }}
          </span>
          <NuxtLink
            :to="presidentUrl(t)"
            prefetch
            class="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-gray-700 dark:bg-gray-800"
          >
            <CmsImage
              v-if="t.president.photo"
              :src="t.president.photo"
              :alt="t.president.full_name"
              class="size-16 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-600"
              loading="lazy"
              :width="64"
              :height="64"
            />
            <div
              v-else
              class="flex aspect-square size-16 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-lg font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
            >
              {{ initials(t.president.full_name) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h2 class="truncate text-base font-semibold text-gray-900 dark:text-white">
                  {{ t.president.full_name }}
                </h2>
                <span
                  v-if="t.end_date === null"
                  class="inline-flex flex-shrink-0 items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"
                >
                  En exercice
                </span>
              </div>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ formatTermPeriod(t) }} · {{ formatDuration(t.stats.duration_days) }}
              </p>
              <p class="mt-1 text-xs text-gray-600 dark:text-gray-300">
                {{ t.stats.governments_count }} gouvernement{{
                  t.stats.governments_count > 1 ? 's' : ''
                }}
                · {{ t.stats.pm_count }} Premier{{ t.stats.pm_count > 1 ? 's' : '' }} ministre{{
                  t.stats.pm_count > 1 ? 's' : ''
                }}
              </p>
            </div>
          </NuxtLink>
        </li>
      </ol>
    </main>
  </div>
</template>
