<script setup lang="ts">
import type { GovernmentBrief, LeaderBrief } from '~~/types/leader-history';

const route = useRoute();
const slug = computed(() => route.params.slug as string);

const { siteName, siteUrl, themeColor } = useSiteMetadata();

const {
  term,
  profile,
  appointment,
  prev,
  next,
  loading: pending,
  error,
} = usePrimeMinisterDetail(slug);

watchEffect(() => {
  if (!pending.value && error.value) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Premier ministre introuvable',
      fatal: true,
    });
  }
});

/* ------------------------------- Helpers --------------------------------- */

const { formatPeriod, formatDuration, year, isSafeUrl, documentUrl } = useLeaderFormat();

const presUrl = (p: LeaderBrief) => `/senegal/presidents/${p.slug}`;
const govUrl = (g: GovernmentBrief) => `/gouvernement-senegal/${g.slug}`;

/* --------------------------------- SEO ----------------------------------- */

const title = computed(() => {
  const t = term.value;
  if (!t) return 'Premier ministre du Sénégal | Vie Publique Sénégal';
  const end = t.end_date ? year(t.end_date) : 'présent';
  return `${t.prime_minister.full_name} - Premier ministre du Sénégal (${year(t.start_date)}–${end}) | Vie Publique Sénégal`;
});

const description = computed(() => {
  const t = term.value;
  if (!t) return '';
  const bio = profile.value?.short_bio;
  if (bio) return bio.length > 160 ? `${bio.slice(0, 157)}…` : bio;
  return `${t.prime_minister.full_name} a été Premier ministre du Sénégal, ${formatPeriod(t.start_date, t.end_date)}, sous ${t.presidents.map((p) => p.full_name).join(' et ')}. ${t.stats.governments_count} gouvernements dirigés.`;
});

const url = computed(() => `${siteUrl}/senegal/premiers-ministres/${slug.value}`);
const image = computed(() =>
  profile.value?.photo
    ? `${siteUrl}${useCmsImage(profile.value.photo)}`
    : `${siteUrl}/nomination-3.png`,
);

const personSchema = computed(() => {
  const p = profile.value;
  if (!p) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${url.value}#person`,
    name: p.full_name,
    url: url.value,
    ...(p.photo ? { image: `${siteUrl}${useCmsImage(p.photo)}` } : {}),
    ...(p.birthdate ? { birthDate: p.birthdate } : {}),
    ...(p.birthplace ? { birthPlace: { '@type': 'Place', name: p.birthplace } } : {}),
    jobTitle: 'Premier ministre du Sénégal',
    worksFor: { '@type': 'GovernmentOrganization', name: 'République du Sénégal' },
    ...(p.short_bio ? { description: p.short_bio } : {}),
    ...(isSafeUrl(p.website) ? { sameAs: [p.website] } : {}),
  };
});

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
});

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: [{ rel: 'canonical', href: url }],
  meta: [
    { name: 'theme-color', content: themeColor },
    { name: 'author', content: siteName },
    { property: 'og:type', content: 'profile' },
    { property: 'og:site_name', content: siteName },
    { name: 'robots', content: 'index, follow' },
  ],
  script: [
    {
      key: 'ld-pm',
      type: 'application/ld+json',
      innerHTML: computed(() => (personSchema.value ? JSON.stringify(personSchema.value) : '')),
    },
  ],
});
</script>

<template>
  <div class="min-h-screen pb-20 dark:bg-gray-900/95">
    <div class="container mx-auto px-4 pt-2">
      <AppBreadcrumb
        :items="[
          { label: 'Sénégal' },
          { label: 'Premiers ministres', to: '/senegal/premiers-ministres' },
          { label: profile?.full_name || 'Premier ministre' },
        ]"
      />
    </div>

    <main class="container mx-auto max-w-3xl px-4 pt-4">
      <div v-if="pending" class="space-y-6">
        <USkeleton class="h-48 w-full rounded-2xl" />
        <USkeleton class="h-24 w-full rounded-xl" />
        <USkeleton class="h-40 w-full rounded-xl" />
      </div>

      <div v-else-if="term && profile" class="space-y-8">
        <LeaderHero
          :name="profile.full_name"
          :photo="profile.photo"
          role-label="Premier ministre"
          :period="formatPeriod(term.start_date, term.end_date)"
          :duration="formatDuration(term.stats.duration_days)"
          :is-current="term.end_date === null"
        />

        <!-- Résumé -->
        <p
          v-if="profile.short_bio"
          class="text-base leading-relaxed text-gray-600 dark:text-gray-300"
        >
          {{ profile.short_bio }}
        </p>

        <LeaderBioFacts :profile="profile" />

        <!-- Biographie -->
        <LeaderAccordion v-if="profile.long_bio" title="Biographie">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="prose prose-sm max-w-none dark:prose-invert" v-html="profile.long_bio" />
        </LeaderAccordion>

        <section
          v-if="appointment?.source_document"
          class="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Nomination</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            <NuxtLink
              :to="documentUrl(appointment.source_document)"
              class="font-medium text-sky-600 hover:underline dark:text-sky-400"
              >{{ appointment.source_document.title }}</NuxtLink
            >
          </p>
        </section>

        <LeaderAccordion title="Gouvernements dirigés" :count="term.governments.length">
          <ol class="space-y-2">
            <li
              v-for="g in [...term.governments].reverse()"
              :key="g.id"
              class="rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <div class="flex items-center justify-between gap-2">
                <NuxtLink
                  :to="govUrl(g)"
                  class="text-sm font-semibold text-gray-900 hover:text-sky-600 hover:underline dark:text-white dark:hover:text-sky-400"
                  >{{ g.name }}</NuxtLink
                >
                <span class="text-xs text-gray-400 dark:text-gray-500">{{
                  formatPeriod(g.start_date, g.end_date)
                }}</span>
              </div>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Président :
                <NuxtLink
                  :to="presUrl(g.president)"
                  class="text-sky-600 hover:underline dark:text-sky-400"
                  >{{ g.president.full_name }}</NuxtLink
                >
              </p>
            </li>
          </ol>
        </LeaderAccordion>

        <LeaderAccordion
          v-if="term.presidents.length > 1"
          title="Présidents sous qui il a servi"
          :count="term.presidents.length"
        >
          <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <li v-for="p in term.presidents" :key="p.id">
              <LeaderPersonCard :person="p" :to="presUrl(p)" />
            </li>
          </ul>
        </LeaderAccordion>

        <LeaderPrevNext base-path="/senegal/premiers-ministres" :prev="prev" :next="next" />
      </div>
    </main>
  </div>
</template>
