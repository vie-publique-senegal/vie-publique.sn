<script setup lang="ts">
import { useElectoralCandidateProfile } from '~/composables/elections/dashboard/useElectoralCandidateProfile';
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import type { Candidate } from '~~/types/candidate';

const route = useRoute();

const electionSlug = computed(() => route.params.slug as string);
const candidateSlug = computed(() => route.params.candidateSlug as string);

const { selectedYear, selectedType, currentElection } = useElectoralDashboard();

const type = computed(() => selectedType.value || String(route.params.type || ''));
const year = computed(() => selectedYear.value || Number(route.params.year || 0));

const { candidateData, candidate, coalition, pending, error } = useElectoralCandidateProfile({
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
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed);
};

const birthDisplay = computed(() => {
  if (!candidate.value) return '';
  const birthDate = formatBirthDate(candidate.value.birthdate || null);
  const birthPlace = typeof candidate.value.birthplace === 'string' ? candidate.value.birthplace.trim() : '';
  if (birthDate && birthPlace) return `${birthDate} à ${birthPlace}`;
  return birthDate || birthPlace || '';
});

const candidateBio = computed(() => {
  if (!candidate.value) return '';
  const longBio = typeof (candidate.value as any).long_bio === 'string' ? (candidate.value as any).long_bio.trim() : '';
  const shortBio = typeof (candidate.value as any).short_bio === 'string' ? (candidate.value as any).short_bio.trim() : '';
  const legacyBio = typeof (candidate.value as any).biography === 'string' ? (candidate.value as any).biography.trim() : '';
  return longBio || shortBio || legacyBio || '';
});

const candidateBioHtml = computed(() => {
  const bio = candidateBio.value;
  if (!bio) return '';
  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(bio);
  if (hasHtmlTags) return bio;
  const escaped = bio.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return escaped.split(/\n{2,}/).map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`).join('');
});

const candidatsUrl = computed(() => `/elections-senegal/${electionSlug.value}/candidats`);

useSeoMeta({
  title: () => `${candidateName.value} - Profil candidat | Vie-Publique SN`,
  description: () => candidateBio.value
    ? `${candidateName.value} - ${candidateBio.value.slice(0, 155)}`
    : `${candidateName.value} - Profil candidat sur Vie-Publique SN`,
  ogTitle: () => `${candidateName.value} - Profil candidat`,
  ogDescription: () => candidateBio.value
    ? candidateBio.value.slice(0, 200)
    : `${candidateName.value} - Profil candidat sur Vie-Publique SN`,
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
        { label: candidateName }
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

    <div v-else-if="!candidate" class="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800">
      <UIcon name="i-heroicons-user-circle" class="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
      <h1 class="text-2xl font-black mb-2">Profil introuvable</h1>
      <p class="text-sm text-gray-500 mb-6">Le candidat demandé n'existe pas ou n'est pas encore publié pour cette élection.</p>
      <UButton :to="candidatsUrl" icon="i-heroicons-arrow-left" variant="soft">Retour aux candidats</UButton>
    </div>

    <div v-else class="space-y-6">
      <UCard class="overflow-hidden" :ui="{ body: { padding: 'p-0' } }">
        <div class="grid md:grid-cols-5 gap-0">
          <div class="md:col-span-2 aspect-square md:aspect-auto bg-gray-100 dark:bg-gray-900 overflow-hidden">
            <CmsImage v-if="candidate.photo" :src="candidate.photo" :alt="candidateName" class="h-full w-full object-cover" />
            <div v-else class="h-full w-full flex items-center justify-center">
              <UIcon name="i-heroicons-user" class="h-24 w-24 text-gray-300 dark:text-gray-700" />
            </div>
          </div>

          <div class="md:col-span-3 p-6 md:p-8 space-y-5">
            <div>
              <p class="text-[11px] font-black uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-2">Profil candidat</p>
              <h1 class="text-3xl sm:text-4xl font-black uppercase leading-tight">{{ candidate.first_name }} {{ candidate.last_name }}</h1>
            </div>

            <div class="grid sm:grid-cols-2 gap-4">
              <div v-if="candidate.profession">
                <p class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Profession</p>
                <p class="font-semibold">{{ candidate.profession }}</p>
              </div>
              <div v-if="coalition?.name">
                <p class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Coalition</p>
                <p class="font-semibold">{{ coalition.name }}</p>
              </div>
              <div v-if="birthDisplay">
                <p class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Naissance</p>
                <p class="font-semibold">{{ birthDisplay }}</p>
              </div>
              <div v-if="candidate.voter_number">
                <p class="text-[10px] uppercase tracking-widest text-gray-500 font-bold">N° électeur</p>
                <p class="font-semibold">{{ candidate.voter_number }}</p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-2">
              <UButton v-if="candidate.facebook" :to="candidate.facebook" target="_blank" variant="ghost" icon="i-simple-icons-facebook" size="sm" class="shrink-0">Facebook</UButton>
              <UButton v-if="candidate.twitter" :to="candidate.twitter" target="_blank" variant="ghost" icon="i-simple-icons-x" size="sm" class="shrink-0">Twitter/X</UButton>
              <UButton v-if="candidate.linkedin" :to="candidate.linkedin" target="_blank" variant="ghost" icon="i-simple-icons-linkedin" size="sm" class="shrink-0">LinkedIn</UButton>
            </div>
          </div>
        </div>
      </UCard>

      <UCard :ui="{ body: { padding: 'p-6 md:p-8' } }">
        <div class="flex items-center gap-3 mb-4">
          <UIcon name="i-heroicons-identification" class="h-5 w-5 text-primary-600" />
          <h2 class="text-xl font-black uppercase">Biographie</h2>
        </div>
        <div v-if="candidateBioHtml" class="prose prose-sm dark:prose-invert max-w-none leading-relaxed" v-html="candidateBioHtml" />
        <p v-else class="text-sm text-gray-500">La biographie de {{ candidate.first_name }} {{ candidate.last_name }} n'est pas encore disponible.</p>
      </UCard>
    </div>
  </div>
</template>
