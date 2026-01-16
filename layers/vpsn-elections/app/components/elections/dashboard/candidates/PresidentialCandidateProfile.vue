<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core';
import { useCoalitionVideos } from '../../../../composables/elections/dashboard/useCoalitionVideos';
import { useElectoralFormatting } from '../../../../composables/elections/dashboard/useElectoralFormatting';
import type { Candidate } from '../../../../types';

interface Props {
  candidate: Candidate;
  coalitionName?: string;
  coalitionId?: string | number | null;
}

const props = defineProps<Props>();

const { getCmsAsset, formatDate, calculateAge, getYoutubeEmbedUrl } = useElectoralFormatting();

const activeTab = ref(0);
const isManualClick = ref(false);

const items = [
  { id: 'portrait', label: 'Portrait', icon: 'i-heroicons-user-circle' },
  { id: 'programme', label: 'Programme', icon: 'i-heroicons-document-text' },
  { id: 'videos', label: 'Vidéos de Campagne', icon: 'i-heroicons-video-camera' },
];

const { videos, loading: videosLoading } = useCoalitionVideos(computed(() => props.coalitionId));

const age = computed(() => calculateAge(props.candidate.birthdate || null));

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
const getAssetUrl = (assetId: string, slug: string) => {
  return useCmsFile(`${assetId}/${slug}.pdf`);
};
</script>

<template>
  <div class="relative">
    <!-- Card Info -->
    <UCard class="mb-6 overflow-hidden shadow-xl" :ui="{ body: { padding: 'p-0' } }">
      <div class="grid gap-0 md:grid-cols-5">
        <!-- Photo du candidat -->
        <div
          class="relative aspect-square overflow-hidden border-r bg-gray-100 md:col-span-2 md:aspect-auto dark:border-gray-800 dark:bg-gray-900"
        >
          <img
            v-if="candidate.photo"
            :src="getCmsAsset(candidate.photo)"
            class="h-full w-full object-cover"
            :alt="`${candidate.first_name} ${candidate.last_name}`"
          />
          <div v-else class="flex h-full w-full items-center justify-center">
            <UIcon name="i-heroicons-user" class="h-32 w-32 text-gray-300" />
          </div>
        </div>

        <!-- Informations du candidat -->
        <div class="flex flex-col justify-center space-y-8 p-8 md:col-span-3">
          <div>
            <p
              class="text-primary-600 dark:text-primary-400 mb-2 text-sm font-bold uppercase tracking-widest"
            >
              Candidat Présidentiel
            </p>
            <h2 class="text-5xl font-black uppercase leading-none text-gray-900 dark:text-white">
              {{ candidate.first_name }}<br />{{ candidate.last_name }}
            </h2>
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div v-if="candidate.profession" class="flex items-start gap-3">
              <UIcon name="i-heroicons-briefcase" class="text-primary-500 mt-0.5 h-5 w-5" />
              <div>
                <p
                  class="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500"
                >
                  Profession
                </p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">
                  {{ candidate.profession }}
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon name="i-heroicons-flag" class="text-primary-500 mt-0.5 h-5 w-5" />
              <div>
                <p
                  class="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500"
                >
                  Coalition
                </p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">{{ coalitionName }}</p>
              </div>
            </div>

            <div v-if="candidate.birthdate || candidate.birthplace" class="flex items-start gap-3">
              <UIcon name="i-heroicons-cake" class="text-primary-500 mt-0.5 h-5 w-5" />
              <div>
                <p
                  class="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500"
                >
                  Naissance
                </p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">
                  <template v-if="candidate.birthdate">{{
                    formatDate(candidate.birthdate)
                  }}</template>
                  <template v-if="candidate.birthdate && candidate.birthplace"> à </template>
                  <template v-if="candidate.birthplace">{{ candidate.birthplace }}</template>
                  <span v-if="age" class="text-primary-600 dark:text-primary-400 ml-2"
                    >({{ age }} ans)</span
                  >
                </p>
              </div>
            </div>

            <div v-if="candidate.voter_number" class="flex items-start gap-3">
              <UIcon name="i-heroicons-identification" class="text-primary-500 mt-0.5 h-5 w-5" />
              <div>
                <p
                  class="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500"
                >
                  N° Électeur
                </p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">
                  {{ candidate.voter_number }}
                </p>
              </div>
            </div>
          </div>

          <!-- Réseaux sociaux - Style bouton -->
          <div v-if="candidate.facebook || candidate.twitter" class="flex gap-4 pt-4">
            <UButton
              v-if="candidate.facebook"
              icon="i-simple-icons-facebook"
              color="gray"
              variant="ghost"
              size="sm"
              :to="candidate.facebook"
              target="_blank"
              class="flex h-10 w-10 items-center justify-center rounded-full p-0"
              title="Facebook"
            />
            <UButton
              v-if="candidate.twitter"
              icon="i-simple-icons-x"
              color="gray"
              variant="ghost"
              size="sm"
              :to="candidate.twitter"
              target="_blank"
              class="flex h-10 w-10 items-center justify-center rounded-full p-0"
              title="Twitter/X"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Sticky Tabs Navigation -->
    <div
      class="sticky top-[80px] z-40 -mx-4 bg-gray-50/95 px-4 py-4 backdrop-blur-md transition-all duration-300 md:top-[124px] dark:bg-gray-950/95"
    >
      <div
        class="mx-auto flex max-w-2xl gap-1 rounded-xl bg-white p-1 shadow-lg ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800"
      >
        <button
          v-for="(item, index) in items"
          :key="index"
          class="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-bold transition-all duration-300 sm:px-4 sm:text-sm"
          :class="
            activeTab === index
              ? 'bg-primary-600 text-white shadow-md'
              : 'hover:text-primary-600 dark:hover:text-primary-400 text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
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
    <div class="mt-8 space-y-12 pb-32">
      <!-- Portrait Section -->
      <section :id="items[0].id" class="scroll-mt-40">
        <UCard :ui="{ body: { padding: 'p-8' } }" class="border-t-primary-500 border-t-4">
          <div v-if="candidate.biography" class="prose prose-sm max-w-none dark:prose-invert">
            <div class="mb-6 flex items-center gap-3">
              <div class="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-2">
                <UIcon :name="items[0].icon" class="text-primary-600 h-6 w-6" />
              </div>
              <h3 class="m-0 text-2xl font-black uppercase text-gray-900 dark:text-white">
                Le Portrait
              </h3>
            </div>
            <p class="text-lg italic leading-relaxed text-gray-700 dark:text-gray-300">
              "{{ candidate.biography }}"
            </p>
          </div>
          <div v-else class="py-12 text-center">
            <UIcon name="i-heroicons-user-circle" class="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p class="text-gray-500">
              Le portrait de {{ candidate.first_name }} {{ candidate.last_name }} n'est pas
              disponible pour le moment.
            </p>
          </div>
        </UCard>
      </section>

      <!-- Programme Section -->
      <section :id="items[1].id" class="scroll-mt-40">
        <UCard
          :ui="{ body: { padding: 'p-0' } }"
          class="border-t-primary-500 overflow-hidden border-t-4"
        >
          <div
            class="flex items-center justify-between border-b bg-gray-50/50 p-8 dark:border-gray-800 dark:bg-gray-800/30"
          >
            <div class="flex items-center gap-3">
              <div class="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-2">
                <UIcon :name="items[1].icon" class="text-primary-600 h-6 w-6" />
              </div>
              <h3 class="m-0 text-2xl font-black uppercase text-gray-900 dark:text-white">
                Programme Électoral
              </h3>
            </div>
          </div>

          <div v-if="candidate.documents" class="p-4 md:p-8">
            <div v-if="candidate.documents.file" class="space-y-6">
              <!-- PDF Viewer Integration -->
              <ClientOnly>
                <div
                  class="overflow-hidden rounded-2xl border bg-gray-100 shadow-inner dark:border-gray-800 dark:bg-gray-900"
                >
                  <PdfViewer
                    :source="getAssetUrl(candidate.documents.file.id, candidate.documents.slug)"
                    :download-name="`${candidate.documents.slug}.pdf`"
                  />
                </div>
              </ClientOnly>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center space-y-4 py-20 text-center">
            <div class="rounded-full bg-orange-50 p-4 dark:bg-orange-900/20">
              <UIcon name="i-heroicons-document-text" class="h-12 w-12 text-orange-500" />
            </div>
            <h3 class="text-2xl font-black uppercase tracking-tight">Programme Non Disponible</h3>
            <p class="mx-auto max-w-sm text-gray-500 dark:text-gray-400">
              Le programme détaillé de {{ candidate.first_name }} {{ candidate.last_name }} n'est
              pas disponible pour le moment.
            </p>
          </div>
        </UCard>
      </section>

      <!-- Vidéos Section -->
      <section :id="items[2].id" class="scroll-mt-40">
        <UCard :ui="{ body: { padding: 'p-8' } }" class="border-t-primary-500 border-t-4">
          <div class="mb-8 flex items-center gap-3">
            <div class="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-2">
              <UIcon :name="items[2].icon" class="text-primary-600 h-6 w-6" />
            </div>
            <h3 class="m-0 text-2xl font-black uppercase text-gray-900 dark:text-white">
              Vidéos de Campagne
            </h3>
          </div>

          <div v-if="videosLoading" class="grid grid-cols-1 gap-8 md:grid-cols-2">
            <USkeleton v-for="i in 2" :key="i" class="h-64 w-full rounded-2xl" />
          </div>
          <div v-else-if="videos.length > 0" class="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div v-for="video in videos" :key="video.id" class="group space-y-4">
              <div
                class="aspect-video overflow-hidden rounded-2xl border-2 border-gray-100 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02] dark:border-gray-800"
              >
                <iframe
                  v-if="getYoutubeEmbedUrl(video.url_youtube)"
                  :src="getYoutubeEmbedUrl(video.url_youtube)"
                  class="h-full w-full"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
            class="rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50/50 py-20 text-center dark:border-gray-800 dark:bg-gray-800/20"
          >
            <UIcon
              name="i-heroicons-video-camera-slash"
              class="mx-auto mb-4 h-16 w-16 text-gray-200 dark:text-gray-800"
            />
            <p class="font-medium text-gray-500">
              Aucune vidéo de campagne de {{ candidate.first_name }} {{ candidate.last_name }} pour
              le moment.
            </p>
          </div>
        </UCard>
      </section>
    </div>
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
