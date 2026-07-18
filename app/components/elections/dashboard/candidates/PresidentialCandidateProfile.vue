<script setup lang="ts">
import { useElectoralFormatting } from '~/composables/elections/dashboard/useElectoralFormatting';
import { useCoalitionVideos } from '~/composables/elections/dashboard/useCoalitionVideos';
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';
import { useIntersectionObserver } from '@vueuse/core';
import type { Candidate } from '~~/types/candidate';

interface Props {
  candidate: Candidate;
  coalitionName?: string;
  coalitionId?: string | number | null;
  year?: number;
  type?: string;
}

const props = defineProps<Props>();

const { formatDate, calculateAge, getYoutubeEmbedUrl } = useElectoralFormatting();
const { currentElection } = useElectoralDashboard();

const activeTab = ref(0);
const isManualClick = ref(false);

const items = [
  { id: 'portrait', label: 'Portrait', icon: 'i-heroicons-user-circle' },
  { id: 'programme', label: 'Programme', icon: 'i-heroicons-document-text' },
  { id: 'videos', label: 'Vidéos de Campagne', icon: 'i-heroicons-video-camera' },
];

const { videos, loading: videosLoading } = useCoalitionVideos(computed(() => props.coalitionId));

const age = computed(() => calculateAge(props.candidate.birthdate || null));

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
  const birthDate = formatBirthDate(props.candidate?.birthdate || null);
  const birthPlace =
    typeof props.candidate?.birthplace === 'string' ? props.candidate.birthplace.trim() : '';

  if (birthDate && birthPlace) return `${birthDate} à ${birthPlace}`;
  return birthDate || birthPlace || '';
});

const decodeHtmlEntities = (text: string) =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&agrave;/g, 'à')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"');
const profileSlug = computed(() => {
  const rawSlug = (props.candidate as any)?.slug;
  if (typeof rawSlug === 'string' && rawSlug.trim()) {
    return rawSlug.trim().toLowerCase();
  }

  return `${props.candidate?.first_name || ''} ${props.candidate?.last_name || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
});

const profileUrl = computed(() => {
  const electionSlug = currentElection.value?.slug;
  if (!electionSlug || !profileSlug.value) return null;
  return `/elections-senegal/${electionSlug}/candidats/${profileSlug.value}`;
});

const portraitText = computed(() => {
  const shortBio =
    typeof (props.candidate as any)?.short_bio === 'string'
      ? (props.candidate as any).short_bio.trim()
      : '';
  const legacyBio =
    typeof (props.candidate as any)?.biography === 'string'
      ? (props.candidate as any).biography.trim()
      : '';
  const source = shortBio || legacyBio;
  if (!source) return '';

  return decodeHtmlEntities(source)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
});

// Scrollspy Logic
const sections = ref<HTMLElement[]>([]);
const setSectionRef = (el: any) => {
  if (el) sections.value.push(el);
};

onBeforeUpdate(() => {
  sections.value = [];
});

const scrollToSection = (id: string, index: number) => {
  isManualClick.value = true;
  activeTab.value = index;
  const element = document.getElementById(id);
  if (element) {
    const isMobile = window.innerWidth < 768;
    const offset = isMobile ? 140 : 180;
    const bodyRect = document.body.getBoundingClientRect().top;
    const elementRect = element.getBoundingClientRect().top;
    const elementPosition = elementRect - bodyRect;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  }

  // Reset manual click after animation
  setTimeout(() => {
    isManualClick.value = false;
  }, 1000);
};

// Intersection Observer for scrollspy
onMounted(() => {
  const isMobile = window.innerWidth < 768;

  items.forEach((item, index) => {
    const el = document.getElementById(item.id);
    if (el) {
      useIntersectionObserver(
        el,
        ([{ isIntersecting, intersectionRatio }]) => {
          // Sur mobile, on est plus souple sur l'intersection
          const minRatio = isMobile ? 0.1 : 0.2;

          if (isIntersecting && !isManualClick.value && intersectionRatio >= minRatio) {
            activeTab.value = index;
          }
        },
        {
          // RootMargin: haut, droite, bas, gauche
          // On réduit la zone de capture sur mobile pour éviter les chevauchements
          rootMargin: isMobile ? '-120px 0px -60% 0px' : '-180px 0px -40% 0px',
          threshold: [0.1, 0.2, 0.3],
        },
      );
    }
  });
});

// Fonction pour obtenir l'URL de l'asset via le nouveau proxy
// URL du fichier programme (même construction que les pages documents)
const programFileUrl = computed(() => {
  const doc = (props.candidate as any)?.documents;
  if (!doc?.file) return '';
  return useCmsFile(`${doc.file}/${doc.slug}.pdf`);
});

// État du viewer PDF plein écran
const showPdfViewer = ref(false);
</script>

<template>
  <div class="relative">
    <!-- Card Info (compacte : photo vignette + infos, mobile-first) -->
    <UCard class="mb-4 overflow-hidden" :ui="{ body: { padding: 'p-4 md:p-6' } }">
      <div class="flex items-start gap-4 md:gap-6">
        <!-- Photo du candidat -->
        <div
          class="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900 md:h-40 md:w-40"
        >
          <CmsImage
            v-if="candidate.photo"
            :src="candidate.photo"
            class="h-full w-full object-cover"
            :alt="`${candidate.first_name} ${candidate.last_name}`"
          />
          <div v-else class="flex h-full w-full items-center justify-center">
            <UIcon name="i-heroicons-user" class="h-10 w-10 text-gray-300" />
          </div>
        </div>

        <!-- Informations du candidat -->
        <div class="min-w-0 flex-1">
          <p
            class="text-primary-600 dark:text-primary-400 text-xs font-semibold uppercase tracking-wide"
          >
            Candidat présidentiel
          </p>
          <h2 class="mt-1 text-xl font-bold leading-snug text-gray-900 dark:text-white md:text-3xl">
            {{ candidate.first_name }} {{ candidate.last_name }}
          </h2>
          <p v-if="coalitionName" class="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
            {{ coalitionName }}
          </p>

          <div
            class="mt-3 hidden flex-wrap gap-x-6 gap-y-1.5 text-sm text-gray-600 dark:text-gray-400 md:flex"
          >
            <span v-if="candidate.profession" class="flex items-center gap-1.5">
              <UIcon name="i-heroicons-briefcase" class="text-primary-500 h-4 w-4 shrink-0" />
              {{ candidate.profession }}
            </span>
            <span v-if="birthDisplay" class="flex items-center gap-1.5">
              <UIcon name="i-heroicons-cake" class="text-primary-500 h-4 w-4 shrink-0" />
              {{ birthDisplay }}<span v-if="age">&nbsp;({{ age }} ans)</span>
            </span>
          </div>

          <!-- Réseaux sociaux -->
          <div
            v-if="candidate.facebook || candidate.twitter || candidate.linkedin"
            class="mt-3 flex gap-1"
          >
            <UButton
              v-if="candidate.facebook"
              icon="i-simple-icons-facebook"
              color="gray"
              variant="ghost"
              size="xs"
              :to="candidate.facebook"
              target="_blank"
              title="Facebook"
            />
            <UButton
              v-if="candidate.twitter"
              icon="i-simple-icons-x"
              color="gray"
              variant="ghost"
              size="xs"
              :to="candidate.twitter"
              target="_blank"
              title="Twitter/X"
            />
            <UButton
              v-if="candidate.linkedin"
              icon="i-simple-icons-linkedin"
              color="gray"
              variant="ghost"
              size="xs"
              :to="candidate.linkedin"
              target="_blank"
              title="LinkedIn"
            />
          </div>
        </div>
      </div>

      <!-- Détails repliés sous la photo sur mobile -->
      <div
        class="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-gray-600 dark:text-gray-400 md:hidden"
      >
        <span v-if="candidate.profession" class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-briefcase" class="text-primary-500 h-4 w-4 shrink-0" />
          {{ candidate.profession }}
        </span>
        <span v-if="birthDisplay" class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-cake" class="text-primary-500 h-4 w-4 shrink-0" />
          {{ birthDisplay }}<span v-if="age">&nbsp;({{ age }} ans)</span>
        </span>
      </div>
    </UCard>

    <!-- Tabs Navigation -->
    <div class="py-4">
      <div class="mx-auto flex max-w-2xl gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        <button
          v-for="(item, index) in items"
          :key="index"
          class="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-bold transition-all duration-300 sm:px-4 sm:text-sm"
          :class="
            activeTab === index
              ? 'bg-primary-600 text-white shadow-md'
              : 'hover:text-primary-600 dark:hover:text-primary-400 text-gray-500 hover:bg-white dark:text-gray-400 dark:hover:bg-gray-700'
          "
          @click="scrollToSection(item.id, index)"
        >
          <UIcon :name="item.icon" class="h-4 w-4 shrink-0" />
          <span
            class="truncate transition-all duration-200"
            :class="activeTab === index ? 'inline' : 'hidden sm:inline'"
          >
            {{ item.label }}
          </span>
        </button>
      </div>
    </div>

    <!-- Scrollable Content Sections -->
    <div class="mt-4 space-y-6 pb-16">
      <!-- Portrait Section -->
      <section :id="items[0].id" class="scroll-mt-40">
        <UCard :ui="{ body: { padding: 'p-4 md:p-6' } }">
          <div v-if="portraitText" class="prose prose-sm max-w-none dark:prose-invert">
            <div class="mb-4 flex items-center gap-2">
              <UIcon :name="items[0].icon" class="text-primary-600 h-5 w-5" />
              <h3 class="m-0 text-base font-bold text-gray-900 dark:text-white md:text-lg">
                Portrait
              </h3>
            </div>
            <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300 md:text-base">
              {{ portraitText }}
            </p>
            <div v-if="profileUrl" class="mt-4">
              <UButton
                :to="profileUrl"
                variant="soft"
                color="primary"
                size="sm"
                icon="i-heroicons-chevron-right"
              >
                Voir le profil complet
              </UButton>
            </div>
          </div>
          <div v-else class="py-10 text-center">
            <UIcon name="i-heroicons-user-circle" class="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p class="text-sm text-gray-500">
              Le portrait de {{ candidate.first_name }} {{ candidate.last_name }} n'est pas
              disponible pour le moment.
            </p>
          </div>
        </UCard>
      </section>

      <!-- Programme Section -->
      <section :id="items[1].id" class="scroll-mt-40">
        <UCard :ui="{ body: { padding: 'p-0' } }" class="overflow-hidden">
          <div class="flex items-center gap-2 border-b p-4 dark:border-gray-800 md:p-6">
            <UIcon :name="items[1].icon" class="text-primary-600 h-5 w-5" />
            <h3 class="m-0 text-base font-bold text-gray-900 dark:text-white md:text-lg">
              Programme électoral
            </h3>
          </div>

          <div v-if="candidate.documents?.file" class="space-y-6 p-4 md:p-6">
            <!-- PDF Viewer Integration (même viewer que les pages documents ; Lazy pour ne
                 jamais évaluer pdfjs côté SSR) -->
            <ClientOnly>
              <LazyPdfViewerInline
                :src="programFileUrl"
                max-height="700px"
                @open-fullscreen="showPdfViewer = true"
              />
            </ClientOnly>
          </div>
          <div v-else class="flex flex-col items-center justify-center space-y-3 py-10 text-center">
            <div class="rounded-full bg-orange-50 p-3 dark:bg-orange-900/20">
              <UIcon name="i-heroicons-document-text" class="h-8 w-8 text-orange-500" />
            </div>
            <h4 class="text-base font-bold text-gray-900 dark:text-white">
              Programme non disponible
            </h4>
            <p class="mx-auto max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Le programme détaillé de {{ candidate.first_name }} {{ candidate.last_name }} n'est
              pas disponible pour le moment.
            </p>
          </div>
        </UCard>
      </section>

      <!-- Vidéos Section -->
      <section :id="items[2].id" class="scroll-mt-40">
        <UCard :ui="{ body: { padding: 'p-4 md:p-6' } }">
          <div class="mb-4 flex items-center gap-2">
            <UIcon :name="items[2].icon" class="text-primary-600 h-5 w-5" />
            <h3 class="m-0 text-base font-bold text-gray-900 dark:text-white md:text-lg">
              Vidéos de campagne
            </h3>
          </div>

          <div v-if="videosLoading" class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <USkeleton v-for="i in 2" :key="i" class="h-64 w-full rounded-2xl" />
          </div>
          <div v-else-if="videos.length > 0" class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div v-for="video in videos" :key="video.id" class="group space-y-4">
              <div
                class="aspect-video overflow-hidden rounded-2xl border-2 border-gray-100 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02] dark:border-gray-800"
              >
                <iframe
                  v-if="getYoutubeEmbedUrl(video.url_youtube)"
                  :src="getYoutubeEmbedUrl(video.url_youtube)"
                  class="h-full w-full"
                  frameborder="0"
                  allow="
                    accelerometer;
                    autoplay;
                    clipboard-write;
                    encrypted-media;
                    gyroscope;
                    picture-in-picture;
                  "
                  allowfullscreen
                ></iframe>
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800"
                >
                  <div class="p-4 text-center">
                    <UIcon
                      name="i-heroicons-exclamation-triangle"
                      class="mx-auto mb-2 h-12 w-12 text-gray-300"
                    />
                    <p class="text-xs text-gray-500">URL vidéo invalide</p>
                  </div>
                </div>
              </div>
              <div class="px-2">
                <p
                  v-if="video.title"
                  class="line-clamp-1 font-bold italic text-gray-900 dark:text-white"
                >
                  "{{ video.title }}"
                </p>
                <p
                  v-if="video.date"
                  class="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
                >
                  Diffusé le {{ formatDate(video.date) }}
                </p>
              </div>
            </div>
          </div>
          <div
            v-else-if="!videosLoading"
            class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center dark:border-gray-800 dark:bg-gray-800/20"
          >
            <UIcon
              name="i-heroicons-video-camera-slash"
              class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-700"
            />
            <p class="text-sm text-gray-500">
              Aucune vidéo de campagne de {{ candidate.first_name }} {{ candidate.last_name }} pour
              le moment.
            </p>
          </div>
        </UCard>
      </section>
    </div>

    <!-- Visionneuse PDF plein écran -->
    <ClientOnly>
      <LazyPdfViewerModal
        v-if="showPdfViewer && programFileUrl"
        :src="programFileUrl"
        :title="candidate.documents?.title || 'Programme électoral'"
        @close="showPdfViewer = false"
      />
    </ClientOnly>
  </div>
</template>

<style scoped>
/* Smooth scroll behavior specifically for this component */
.scroll-mt-40 {
  scroll-margin-top: 180px;
}

@media (max-width: 768px) {
  .scroll-mt-40 {
    scroll-margin-top: 140px;
  }
}
</style>
