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
  <div class="container mx-auto px-4 py-8">
    <AppBreadcrumb
      class="mb-6 text-xs"
      :items="[
        { label: 'Élections', to: '/elections-senegal' },
        { label: currentElection?.name || 'Élection', to: candidatsUrl },
        { label: 'Candidats', to: candidatsUrl },
        { label: candidateName },
      ]"
    />

    <div v-if="pending" class="space-y-4">
      <USkeleton class="h-72 w-full rounded-2xl" />
      <USkeleton class="h-56 w-full rounded-2xl" />
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
      class="rounded-2xl border bg-white py-20 text-center dark:border-gray-800 dark:bg-gray-900"
    >
      <UIcon
        name="i-heroicons-user-circle"
        class="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-700"
      />
      <h1 class="mb-2 text-2xl font-black">Profil introuvable</h1>
      <p class="mb-6 text-sm text-gray-500">
        Le candidat demandé n'existe pas ou n'est pas encore publié pour cette élection.
      </p>
      <UButton :to="candidatsUrl" icon="i-heroicons-arrow-left" variant="soft"
        >Retour aux candidats</UButton
      >
    </div>

    <div v-else class="space-y-6">
      <UCard :ui="{ body: { padding: 'p-4 md:p-6' } }">
        <div class="flex items-start gap-4 md:gap-6">
          <div
            class="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 md:h-36 md:w-36"
          >
            <CmsImage
              v-if="candidate.photo"
              :src="candidate.photo"
              :alt="candidateName"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center">
              <UIcon name="i-heroicons-user" class="h-10 w-10 text-gray-300 dark:text-gray-700" />
            </div>
          </div>

          <div class="min-w-0 flex-1">
            <p
              class="text-primary-600 dark:text-primary-400 text-xs font-semibold uppercase tracking-wide"
            >
              Profil candidat
            </p>
            <h1
              class="mt-1 text-xl font-bold leading-snug text-gray-900 dark:text-white md:text-3xl"
            >
              {{ candidate.first_name }} {{ candidate.last_name }}
            </h1>
            <p
              v-if="coalition?.name"
              class="mt-1 truncate text-sm text-gray-500 dark:text-gray-400"
            >
              {{ coalition.name }}
            </p>
          </div>
        </div>

        <dl class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-6 md:gap-4">
          <div v-if="candidate.profession">
            <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Profession</dt>
            <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
              {{ candidate.profession }}
            </dd>
          </div>
          <div v-if="coalition?.name">
            <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Coalition</dt>
            <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
              {{ coalition.name }}
            </dd>
          </div>
          <div v-if="birthDisplay">
            <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Naissance</dt>
            <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
              {{ birthDisplay }}
            </dd>
          </div>
          <div v-if="candidate.voter_number">
            <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">N° électeur</dt>
            <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
              {{ candidate.voter_number }}
            </dd>
          </div>
        </dl>

        <div
          v-if="candidate.facebook || candidate.twitter || candidate.linkedin"
          class="mt-4 flex flex-wrap items-center gap-2"
        >
          <UButton
            v-if="candidate.facebook"
            :to="candidate.facebook"
            target="_blank"
            variant="ghost"
            icon="i-simple-icons-facebook"
            size="sm"
            class="shrink-0"
            >Facebook</UButton
          >
          <UButton
            v-if="candidate.twitter"
            :to="candidate.twitter"
            target="_blank"
            variant="ghost"
            icon="i-simple-icons-x"
            size="sm"
            class="shrink-0"
            >Twitter/X</UButton
          >
          <UButton
            v-if="candidate.linkedin"
            :to="candidate.linkedin"
            target="_blank"
            variant="ghost"
            icon="i-simple-icons-linkedin"
            size="sm"
            class="shrink-0"
            >LinkedIn</UButton
          >
        </div>
      </UCard>

      <UCard :ui="{ body: { padding: 'p-4 md:p-6' } }">
        <div class="mb-4 flex items-center gap-2">
          <UIcon name="i-heroicons-identification" class="text-primary-600 h-5 w-5" />
          <h2 class="text-lg font-bold text-gray-900 dark:text-white md:text-xl">Biographie</h2>
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
      </UCard>
    </div>
  </div>
</template>
