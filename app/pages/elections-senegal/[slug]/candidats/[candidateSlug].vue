<script setup lang="ts">
import { useElectoralCandidateProfile } from '~/composables/elections/dashboard/useElectoralCandidateProfile';
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';

const route = useRoute();

const electionSlug = computed(() => route.params.slug as string);
const candidateSlug = computed(() => route.params.candidateSlug as string);

const { selectedYear, selectedType, currentElection } = useElectoralDashboard();

const type = computed(() => selectedType.value || String(route.params.type || ''));
const year = computed(() => selectedYear.value || Number(route.params.year || 0));

const { candidate, coalition, pending, error } = useElectoralCandidateProfile({
  slug: candidateSlug,
  year,
  type,
});

const candidateName = computed(() => {
  if (!candidate.value) return 'Profil candidat';
  return `${candidate.value.first_name || ''} ${candidate.value.last_name || ''}`.trim();
});

const formatBirthDate = (rawDate?: string | null) => {
  if (!rawDate) return '';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
};

const birthDisplay = computed(() => {
  if (!candidate.value) return '';
  const birthDate = formatBirthDate(candidate.value.birthdate || null);
  const birthPlace =
    typeof candidate.value.birthplace === 'string' ? candidate.value.birthplace.trim() : '';
  if (birthDate && birthPlace) return `${birthDate} à ${birthPlace}`;
  return birthDate || birthPlace || '';
});

const candidateBio = computed(() => {
  if (!candidate.value) return '';
  const longBio =
    typeof (candidate.value as any).long_bio === 'string'
      ? (candidate.value as any).long_bio.trim()
      : '';
  const shortBio =
    typeof (candidate.value as any).short_bio === 'string'
      ? (candidate.value as any).short_bio.trim()
      : '';
  const legacyBio =
    typeof (candidate.value as any).biography === 'string'
      ? (candidate.value as any).biography.trim()
      : '';
  return longBio || shortBio || legacyBio || '';
});

const candidateBioHtml = computed(() => {
  const bio = candidateBio.value;
  if (!bio) return '';
  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(bio);
  if (hasHtmlTags) return bio;
  const escaped = bio
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
});

const candidatsUrl = computed(() => `/elections-senegal/${electionSlug.value}/candidats`);

const { siteUrl } = useSiteMetadata();

const canonicalUrl = computed(
  () => `${siteUrl}/elections-senegal/${electionSlug.value}/candidats/${candidateSlug.value}`,
);

// Photo du candidat en image de partage quand elle existe (URL absolue requise)
const ogImageUrl = computed(() => {
  const photo = candidate.value?.photo ? String(candidate.value.photo) : '';
  if (!photo) return `${siteUrl}/og-image.png`;
  return photo.startsWith('http') ? photo : `${siteUrl}${photo.startsWith('/') ? '' : '/'}${photo}`;
});

useSeoMeta({
  title: () => `${candidateName.value} - Profil candidat | Vie-Publique SN`,
  description: () =>
    candidateBio.value
      ? `${candidateName.value} - ${candidateBio.value.slice(0, 155)}`
      : `${candidateName.value} - Profil candidat sur Vie-Publique SN`,
  ogTitle: () => `${candidateName.value} - Profil candidat`,
  ogDescription: () =>
    candidateBio.value
      ? candidateBio.value.slice(0, 200)
      : `${candidateName.value} - Profil candidat sur Vie-Publique SN`,
  ogImage: () => ogImageUrl.value,
  twitterCard: 'summary_large_image',
  twitterImage: () => ogImageUrl.value,
});

const personSchema = computed(() => {
  if (!candidate.value) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: candidateName.value,
    url: canonicalUrl.value,
    ...(candidate.value.photo && { image: ogImageUrl.value }),
    ...(candidate.value.birthdate && { birthDate: candidate.value.birthdate }),
    ...(candidate.value.profession && { jobTitle: candidate.value.profession }),
    ...(coalition.value?.name && {
      affiliation: { '@type': 'Organization', name: coalition.value.name },
    }),
  };
});

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: computed(() =>
    personSchema.value
      ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(personSchema.value) }]
      : [],
  ),
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20 dark:bg-gray-900">
    <!-- Breadcrumb -->
    <div class="container mx-auto px-4 pt-4">
      <AppBreadcrumb
        class="text-xs"
        :items="[
          { label: 'Élections', to: '/elections-senegal' },
          { label: currentElection?.name || 'Élection', to: candidatsUrl },
          { label: 'Candidats', to: candidatsUrl },
          { label: candidateName },
        ]"
      />
    </div>

    <!-- Sticky header mobile (retour + nom + partage) -->
    <header
      class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95 md:relative md:border-0 md:bg-transparent md:backdrop-blur-none"
    >
      <div class="container mx-auto px-4 py-3 md:py-4">
        <div class="flex items-center gap-3">
          <NuxtLink
            :to="candidatsUrl"
            class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 md:hidden"
            aria-label="Retour aux candidats"
          >
            <UIcon name="i-heroicons-arrow-left" class="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </NuxtLink>
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-sm font-semibold text-gray-900 dark:text-white md:text-lg">
              {{ candidateName }}
            </h1>
          </div>
          <SocialShare v-if="candidate" :title="candidateName" :url="canonicalUrl" />
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4 py-4">
      <div v-if="pending" class="space-y-4 md:flex md:gap-6 md:space-y-0">
        <div class="md:w-1/3">
          <USkeleton class="h-72 w-full rounded-2xl" />
        </div>
        <div class="md:w-2/3">
          <USkeleton class="h-56 w-full rounded-2xl" />
        </div>
      </div>

      <UAlert
        v-else-if="error"
        color="red"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        title="Impossible de charger ce profil"
        description="Une erreur est survenue lors du chargement des informations du candidat."
      />

      <div
        v-else-if="!candidate"
        class="rounded-2xl bg-white py-20 text-center ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      >
        <UIcon
          name="i-heroicons-user-circle"
          class="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-700"
        />
        <h2 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Profil introuvable</h2>
        <p class="mb-6 text-sm text-gray-500">
          Le candidat demandé n'existe pas ou n'est pas encore publié pour cette élection.
        </p>
        <UButton :to="candidatsUrl" icon="i-heroicons-arrow-left" variant="soft"
          >Retour aux candidats</UButton
        >
      </div>

      <div v-else class="space-y-4 md:flex md:gap-6 md:space-y-0">
        <!-- Carte profil - sticky sur desktop -->
        <div class="md:w-1/3">
          <div class="md:sticky md:top-20">
            <div
              class="rounded-2xl bg-white p-4 ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
            >
              <div class="flex flex-col items-center text-center">
                <CmsImage
                  v-if="candidate.photo"
                  :src="candidate.photo"
                  :quality="50"
                  :alt="candidateName"
                  class="mb-4 w-full rounded-xl object-cover"
                />
                <div
                  v-else
                  class="mb-4 flex h-40 w-40 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
                >
                  <UIcon
                    name="i-heroicons-user"
                    class="h-16 w-16 text-gray-300 dark:text-gray-600"
                  />
                </div>

                <p class="text-xl font-bold capitalize text-gray-900 dark:text-white">
                  {{ (candidate.first_name || '').toLowerCase() }}
                  <span class="tracking-wider">{{
                    (candidate.last_name || '').toUpperCase()
                  }}</span>
                </p>

                <div
                  class="mt-2 flex flex-col items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400"
                >
                  <div v-if="birthDisplay" class="flex items-center gap-2">
                    <UIcon name="i-heroicons-cake" class="h-4 w-4 shrink-0" />
                    <span>{{ birthDisplay }}</span>
                  </div>
                  <div v-if="candidate.profession" class="flex items-center gap-2 capitalize">
                    <UIcon name="i-heroicons-briefcase" class="h-4 w-4 shrink-0" />
                    <span>{{ candidate.profession.toLowerCase() }}</span>
                  </div>
                </div>

                <div
                  v-if="candidate.facebook || candidate.twitter || candidate.linkedin"
                  class="mt-3 flex items-center justify-center gap-5"
                >
                  <ULink
                    v-if="candidate.facebook"
                    :to="candidate.facebook"
                    target="_blank"
                    aria-label="Facebook"
                    class="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <UIcon name="i-simple-icons-facebook" class="h-6 w-6" />
                  </ULink>
                  <ULink
                    v-if="candidate.twitter"
                    :to="candidate.twitter"
                    target="_blank"
                    aria-label="Twitter/X"
                    class="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <UIcon name="i-simple-icons-x" class="h-6 w-6" />
                  </ULink>
                  <ULink
                    v-if="candidate.linkedin"
                    :to="candidate.linkedin"
                    target="_blank"
                    aria-label="LinkedIn"
                    class="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <UIcon name="i-simple-icons-linkedin" class="h-6 w-6" />
                  </ULink>
                </div>

                <div
                  v-if="coalition?.name"
                  class="bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 mt-4 inline-block rounded-full px-3 py-1 text-sm font-medium"
                >
                  {{ coalition.name }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contenu principal -->
        <div class="space-y-4 md:w-2/3">
          <section
            class="rounded-2xl bg-white p-4 ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 md:p-6"
          >
            <div class="mb-3 flex items-center gap-2">
              <UIcon name="i-heroicons-identification" class="text-primary-600 h-5 w-5" />
              <h2 class="text-sm font-bold text-gray-900 dark:text-white md:text-base">
                Biographie
              </h2>
            </div>
            <div
              v-if="candidateBioHtml"
              class="prose prose-sm max-w-none leading-relaxed dark:prose-invert"
              v-html="candidateBioHtml"
            />
            <p v-else class="text-sm text-gray-500">
              La biographie de {{ candidate.first_name }} {{ candidate.last_name }} n'est pas encore
              disponible.
            </p>
          </section>
        </div>
      </div>
    </main>

    <ScrollToTopButton />
  </div>
</template>
