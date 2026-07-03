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
} = usePresidentDetail(slug);

watchEffect(() => {
  if (!pending.value && error.value) {
    throw createError({ statusCode: 404, statusMessage: 'Président introuvable', fatal: true });
  }
});

/* ------------------------------- Helpers --------------------------------- */

const { formatPeriod, formatDuration, year, isSafeUrl, documentUrl } = useLeaderFormat();

const pmUrl = (pm: LeaderBrief) => `/senegal/premiers-ministres/${pm.slug}`;
const govUrl = (g: GovernmentBrief) => `/gouvernement-senegal/${g.slug}`;

/* --------------------------------- SEO ----------------------------------- */

const title = computed(() => {
  const t = term.value;
  if (!t) return 'Président du Sénégal | Vie Publique Sénégal';
  const end = t.end_date ? year(t.end_date) : 'présent';
  return `${t.president.full_name} - Président du Sénégal (${year(t.start_date)}–${end}) | Vie Publique Sénégal`;
});

const description = computed(() => {
  const t = term.value;
  if (!t) return '';
  const bio = profile.value?.short_bio;
  if (bio) return bio.length > 160 ? `${bio.slice(0, 157)}…` : bio;
  const end = t.end_date ? year(t.end_date) : null;
  const period = end
    ? `a dirigé le Sénégal de ${year(t.start_date)} à ${end}`
    : `est président du Sénégal depuis ${year(t.start_date)}`;
  return `${t.president.full_name} ${period}. Il a formé ${t.stats.governments_count} gouvernements avec ${t.stats.pm_count} Premiers ministres.`;
});

const url = computed(() => `${siteUrl}/senegal/presidents/${slug.value}`);
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
    jobTitle: 'Président de la République du Sénégal',
    worksFor: { '@type': 'Organization', name: 'République du Sénégal' },
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
      key: 'ld-president',
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
          { label: 'Présidents', to: '/senegal/presidents' },
          { label: profile?.full_name || 'Président' },
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
        <!-- Hero -->
        <LeaderHero
          :name="profile.full_name"
          :photo="profile.photo"
          role-label="Président de la République"
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

        <!-- Bio -->
        <LeaderBioFacts :profile="profile" />

        <!-- Biographie -->
        <LeaderAccordion v-if="profile.long_bio" title="Biographie">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="prose prose-sm max-w-none dark:prose-invert" v-html="profile.long_bio" />
        </LeaderAccordion>

        <!-- Décret d'investiture -->
        <section
          v-if="appointment?.source_document"
          class="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Investiture</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            <NuxtLink
              :to="documentUrl(appointment.source_document)"
              class="font-medium text-sky-600 hover:underline dark:text-sky-400"
              >{{ appointment.source_document.title }}</NuxtLink
            >
          </p>
        </section>

        <!-- Gouvernements formés -->
        <LeaderAccordion title="Gouvernements formés" :count="term.governments.length">
          <ol class="space-y-2">
            <li
              v-for="g in [...term.governments].reverse()"
              :key="g.id"
              class="rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <div class="flex items-center justify-between gap-2">
                <NuxtLink
                  :to="govUrl(g)"
                  class="group flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-sky-600 dark:text-white dark:hover:text-sky-400"
                >
                  <span class="truncate">{{ g.name }}</span>
                  <UIcon
                    name="i-heroicons-chevron-right"
                    class="size-4 flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-600 dark:text-gray-500 dark:group-hover:text-sky-400"
                  />
                </NuxtLink>
                <span class="text-xs text-gray-400 dark:text-gray-500">{{
                  formatPeriod(g.start_date, g.end_date)
                }}</span>
              </div>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                <template v-if="g.prime_minister">
                  PM :
                  <NuxtLink
                    :to="pmUrl(g.prime_minister)"
                    class="text-sky-600 hover:underline dark:text-sky-400"
                    >{{ g.prime_minister.full_name }}</NuxtLink
                  >
                </template>
                <span v-else class="italic">Présidence directe</span>
              </p>
            </li>
          </ol>
        </LeaderAccordion>

        <!-- PMs nommés -->
        <LeaderAccordion
          v-if="term.prime_ministers.length"
          title="Premiers ministres nommés"
          :count="term.prime_ministers.length"
        >
          <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <li v-for="pm in term.prime_ministers" :key="pm.id">
              <LeaderPersonCard :person="pm" :to="pmUrl(pm)" />
            </li>
          </ul>
        </LeaderAccordion>

        <!-- Nav prev/next -->
        <LeaderPrevNext base-path="/senegal/presidents" :prev="prev" :next="next" />
      </div>
    </main>
  </div>
</template>
