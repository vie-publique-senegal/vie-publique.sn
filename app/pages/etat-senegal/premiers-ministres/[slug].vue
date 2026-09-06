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

const presUrl = (p: LeaderBrief) => `/etat-senegal/presidents/${p.slug}`;
const govUrl = (g: GovernmentBrief) => `/gouvernement-senegal/${g.slug}`;

const govDurationDays = (g: GovernmentBrief): number => {
  const start = new Date(g.start_date).getTime();
  const end = g.end_date ? new Date(g.end_date).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
};

// Aucun membre importé pour ce gouvernement : composition indisponible.
const hasComposition = (g: GovernmentBrief): boolean => g.stats.total > 0;

// Fiche personnalité du PM (bio complète) : la page premiers-ministres ne
// montre plus la biographie elle-même, elle y renvoie.
const personUrl = computed(() =>
  profile.value ? `/personnalites/${profile.value.id}/${profile.value.slug}` : undefined,
);

/* --------------------------------- SEO ----------------------------------- */

const title = computed(() => {
  const t = term.value;
  if (!t) return 'Premier ministre du Sénégal';
  const end = t.end_date ? year(t.end_date) : 'présent';
  return `${t.prime_minister.full_name} - PM (${year(t.start_date)}–${end})`;
});

const description = computed(() => {
  const t = term.value;
  if (!t) return '';
  const bio = profile.value?.short_bio;
  if (bio) return bio.length > 160 ? `${bio.slice(0, 157)}…` : bio;
  return `${t.prime_minister.full_name} a été Premier ministre du Sénégal, ${formatPeriod(t.start_date, t.end_date)}, sous ${t.presidents.map((p) => p.full_name).join(' et ')}. ${t.stats.governments_count} gouvernements dirigés.`;
});

const url = computed(() => `${siteUrl}/etat-senegal/premiers-ministres/${slug.value}`);
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
          { label: 'État du Sénégal', to: '/etat-senegal' },
          { label: 'Premiers ministres', to: '/etat-senegal/premiers-ministres' },
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
          :name-to="personUrl"
        />

        <!-- Gouvernements dirigés : un bloc détaillé par gouvernement -->
        <section>
          <h2 class="mb-3 text-base font-semibold text-gray-900 dark:text-white">
            Gouvernements dirigés
            <span class="ml-1 text-sm font-normal text-gray-400 dark:text-gray-500"
              >({{ term.governments.length }})</span
            >
          </h2>
          <ol
            class="relative ml-3 space-y-4 border-l-2 border-gray-300 pt-2 dark:border-gray-600"
          >
            <li
              v-for="(g, index) in [...term.governments].reverse()"
              :key="g.id"
              class="relative pl-6 sm:pl-8"
            >
              <span
                class="absolute left-0 top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-[11px] font-bold text-white dark:border-gray-900 sm:size-7 sm:text-xs"
                :class="g.end_date === null ? 'ring-2 ring-sky-300 dark:ring-sky-700' : ''"
                aria-hidden="true"
              >
                {{ term.governments.length - index }}
              </span>

              <div
                class="rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40 sm:p-5"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
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
                    <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {{ formatPeriod(g.start_date, g.end_date) }} ·
                      {{ formatDuration(govDurationDays(g)) }}
                    </p>
                  </div>
                  <span
                    v-if="g.end_date === null"
                    class="inline-flex flex-shrink-0 items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  >
                    En exercice
                  </span>
                </div>

                <dl
                  class="mt-3 grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 dark:border-gray-700"
                  :class="hasComposition(g) ? 'sm:grid-cols-[1fr_auto_auto]' : ''"
                >
                  <div class="min-w-0">
                    <dt class="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                      Président
                    </dt>
                    <dd class="mt-0.5 truncate text-sm font-medium text-gray-900 dark:text-white">
                      <NuxtLink
                        :to="presUrl(g.president)"
                        class="text-sky-600 hover:text-sky-600 hover:underline dark:hover:text-sky-400"
                        >{{ g.president.full_name }}</NuxtLink
                      >
                    </dd>
                  </div>
                  <template v-if="hasComposition(g)">
                    <div class="flex gap-6 sm:contents">
                      <div>
                        <dt class="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                          Ministres
                        </dt>
                        <dd class="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                          {{ g.stats.total }}
                        </dd>
                      </div>
                      <div>
                        <dt class="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                          Femmes
                        </dt>
                        <dd class="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                          {{ g.stats.women }}
                        </dd>
                      </div>
                    </div>
                  </template>
                </dl>

                <div
                  v-if="g.pm_appointment_decree || g.formation_decree"
                  class="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-3 dark:border-gray-700"
                >
                  <NuxtLink
                    v-if="g.pm_appointment_decree"
                    :to="documentUrl(g.pm_appointment_decree)"
                    class="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                  >
                    Décret de nomination
                  </NuxtLink>
                  <NuxtLink
                    v-if="g.formation_decree"
                    :to="documentUrl(g.formation_decree)"
                    class="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                  >
                    Décret de formation
                  </NuxtLink>
                </div>

                <div class="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                  <NuxtLink
                    v-if="hasComposition(g)"
                    :to="govUrl(g)"
                    class="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                  >
                    Voir la composition complète
                    <UIcon name="i-heroicons-arrow-right" class="size-3.5" />
                  </NuxtLink>
                  <p v-else class="text-xs italic text-gray-400 dark:text-gray-500">
                    Données de composition de ce gouvernement pas encore disponibles
                  </p>
                </div>
              </div>
            </li>
          </ol>
        </section>

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

        <LeaderPrevNext base-path="/etat-senegal/premiers-ministres" :prev="prev" :next="next" />
      </div>
    </main>
  </div>
</template>
