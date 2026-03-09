<script setup lang="ts">
import { useElectoralFormatting } from '~/composables/elections/dashboard/useElectoralFormatting';
import { useCoalitionVideos } from '~/composables/elections/dashboard/useCoalitionVideos';
import { useIntersectionObserver } from '@vueuse/core';
import type { Candidate } from '~~/types/candidate';

interface Props {
  candidate?: Candidate; // Backward compatibility
  candidates?: Candidate[];
  coalitionName?: string;
  coalitionId?: string | number | null;
}

const props = defineProps<Props>();

const appConfig = useAppConfig();
const isBenin = computed(() => appConfig.vpsnElections?.country?.name === 'Bénin');

// Normalize candidates: either we have a list (new), or a single candidate (old)
const normalizedCandidates = computed(() => {
  if (props.candidates && props.candidates.length > 0) return props.candidates;
  if (props.candidate) return [props.candidate];
  return [];
});

const mainCandidate = computed(() => normalizedCandidates.value[0]);
const secondCandidate = computed(() => normalizedCandidates.value.length > 1 ? normalizedCandidates.value[1] : null);
const hasTicket = computed(() => isBenin.value && secondCandidate.value);

const { formatDate, calculateAge, getYoutubeEmbedUrl } = useElectoralFormatting();

const activeTab = ref(0);
const isManualClick = ref(false);

const items = [
  { id: 'portrait', label: 'Portrait', icon: 'i-heroicons-user-circle' },
  { id: 'programme', label: 'Programme', icon: 'i-heroicons-document-text' },
  { id: 'videos', label: 'Vidéos de Campagne', icon: 'i-heroicons-video-camera' }
]

const { videos, loading: videosLoading } = useCoalitionVideos(computed(() => props.coalitionId));

const age = computed(() => calculateAge(mainCandidate.value?.birthdate || null));

// Scrollspy Logic
const sections = ref<HTMLElement[]>([]);

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
      behavior: 'smooth'
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
          const minRatio = isMobile ? 0.1 : 0.2;
          if (isIntersecting && !isManualClick.value && intersectionRatio >= minRatio) {
            activeTab.value = index;
          }
        },
        {
          rootMargin: isMobile ? '-120px 0px -60% 0px' : '-180px 0px -40% 0px',
          threshold: [0.1, 0.2, 0.3]
        }
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
    <UCard class="overflow-hidden shadow-xl mb-6" :ui="{ body: { padding: 'p-0' } }">
      <div class="grid md:grid-cols-5 gap-0">
        <!-- Photo(s) du candidat / Ticket -->
        <div 
          class="md:col-span-2 relative aspect-square md:aspect-auto overflow-hidden bg-gray-100 dark:bg-gray-900 border-r dark:border-gray-800"
          :class="{ 'grid grid-cols-2': hasTicket }"
        >
          <!-- Premier Candidat (Président) -->
          <div class="relative h-full w-full">
            <CmsImage
              v-if="mainCandidate?.photo"
              :src="mainCandidate.photo"
              class="h-full w-full object-cover"
              :alt="`${mainCandidate.first_name} ${mainCandidate.last_name}`"
            />
            <div v-else class="h-full w-full flex items-center justify-center">
              <UIcon name="i-heroicons-user" class="h-20 w-20 text-gray-300" />
            </div>
            <div v-if="hasTicket" class="absolute bottom-0 left-0 right-0 bg-primary-600/90 text-white text-[10px] font-black uppercase tracking-widest p-1 text-center">
              Président
            </div>
          </div>

          <!-- Second Candidat (Vice-Président) -->
          <div v-if="hasTicket" class="relative h-full w-full border-l dark:border-gray-800">
            <CmsImage
              v-if="secondCandidate?.photo"
              :src="secondCandidate.photo"
              class="h-full w-full object-cover"
              :alt="`${secondCandidate.first_name} ${secondCandidate.last_name}`"
            />
            <div v-else class="h-full w-full flex items-center justify-center">
              <UIcon name="i-heroicons-user" class="h-20 w-20 text-gray-300" />
            </div>
            <div class="absolute bottom-0 left-0 right-0 bg-gray-800/90 text-white text-[10px] font-black uppercase tracking-widest p-1 text-center">
              Vice-Président
            </div>
          </div>
        </div>

        <!-- Informations du candidat -->
        <div class="md:col-span-3 p-8 space-y-6 flex flex-col justify-center">
          <div v-if="!hasTicket">
            <p class="text-sm font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-2">
              Candidat Présidentiel
            </p>
            <h2 class="text-5xl font-black text-gray-900 dark:text-white uppercase leading-none">
              {{ mainCandidate?.first_name }}<br />{{ mainCandidate?.last_name }}
            </h2>
          </div>

          <!-- Affichage Ticket (Bénin) -->
          <div v-else>
            <p class="text-sm font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-4">
              Ticket Présidentiel
            </p>
            <div class="space-y-4">
               <div>
                 <p class="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Candidat au poste de Président</p>
                 <h3 class="text-2xl font-black text-gray-900 dark:text-white uppercase leading-none">
                  {{ mainCandidate?.first_name }} {{ mainCandidate?.last_name }}
                 </h3>
               </div>
               <div class="w-12 h-0.5 bg-gray-200 dark:bg-gray-800"></div>
               <div>
                 <p class="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Candidat au poste de Vice-Président</p>
                 <h3 class="text-2xl font-black text-gray-900 dark:text-white uppercase leading-none">
                  {{ secondCandidate?.first_name }} {{ secondCandidate?.last_name }}
                 </h3>
               </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2 border-t dark:border-gray-800">
            <div v-if="mainCandidate?.profession" class="flex items-start gap-3">
              <UIcon name="i-heroicons-briefcase" class="h-5 w-5 text-primary-500 mt-0.5" />
              <div>
                <p class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Profession {{ hasTicket ? '(P)' : '' }}</p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">{{ mainCandidate.profession }}</p>
              </div>
            </div>

            <div v-if="hasTicket && secondCandidate?.profession" class="flex items-start gap-3">
              <UIcon name="i-heroicons-briefcase" class="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Profession (VP)</p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">{{ secondCandidate.profession }}</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon name="i-heroicons-flag" class="h-5 w-5 text-primary-500 mt-0.5" />
              <div>
                <p class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Coalition</p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">{{ coalitionName }}</p>
              </div>
            </div>

            <div v-if="mainCandidate?.birthdate || mainCandidate?.birthplace" class="flex items-start gap-3">
              <UIcon name="i-heroicons-cake" class="h-5 w-5 text-primary-500 mt-0.5" />
              <div>
                <p class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Naissance {{ hasTicket ? '(P)' : '' }}</p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">
                  <template v-if="mainCandidate?.birthdate">{{ formatDate(mainCandidate.birthdate) }}</template>
                  <template v-if="mainCandidate?.birthdate && mainCandidate?.birthplace"> à </template>
                  <template v-if="mainCandidate?.birthplace">{{ mainCandidate.birthplace }}</template>
                  <span v-if="age" class="ml-2 text-primary-600 dark:text-primary-400">({{ age }} ans)</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Socials -->
          <div v-if="mainCandidate?.facebook || mainCandidate?.twitter" class="flex gap-4 pt-4">
            <UButton v-if="mainCandidate?.facebook" icon="i-simple-icons-facebook" color="gray" variant="ghost" size="sm" :to="mainCandidate.facebook" target="_blank" class="rounded-full" />
            <UButton v-if="mainCandidate?.twitter" icon="i-simple-icons-x" color="gray" variant="ghost" size="sm" :to="mainCandidate.twitter" target="_blank" class="rounded-full" />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Navigation Tabs -->
    <div class="sticky top-[80px] md:top-[124px] z-40 bg-gray-50/95 backdrop-blur-md dark:bg-gray-950/95 py-4 -mx-4 px-4">
      <div class="bg-white dark:bg-gray-900 p-1 rounded-xl shadow-lg ring-1 ring-gray-200 dark:ring-gray-800 flex gap-1 max-w-2xl mx-auto">
        <button
          v-for="(item, index) in items"
          :key="index"
          @click="scrollToSection(item.id, index)"
          class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm"
          :class="activeTab === index ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'"
        >
          <UIcon :name="item.icon" class="h-4 w-4" />
          <span :class="activeTab === index ? 'inline' : 'hidden sm:inline'">{{ item.label }}</span>
        </button>
      </div>
    </div>

    <!-- Content Sections -->
    <div class="mt-8 space-y-12 pb-32">
      <!-- Portrait -->
      <section :id="items[0].id" class="scroll-mt-40">
        <UCard class="border-t-4 border-t-primary-500 p-8">
          <div v-if="mainCandidate?.biography" class="prose prose-sm dark:prose-invert max-w-none">
            <h3 class="text-2xl font-black uppercase mb-6 flex items-center gap-3">
              <UIcon :name="items[0].icon" class="text-primary-600" /> Portrait {{ hasTicket ? 'du Président' : '' }}
            </h3>
            <p class="text-lg italic text-gray-700 dark:text-gray-300">"{{ mainCandidate.biography }}"</p>
          </div>
          
          <div v-if="hasTicket && secondCandidate?.biography" class="prose prose-sm dark:prose-invert max-w-none mt-12 pt-12 border-t dark:border-gray-800">
            <h3 class="text-2xl font-black uppercase mb-6 flex items-center gap-3">
              <UIcon :name="items[0].icon" class="text-gray-400" /> Portrait du Vice-Président
            </h3>
            <p class="text-lg italic text-gray-700 dark:text-gray-300">"{{ secondCandidate.biography }}"</p>
          </div>
        </UCard>
      </section>

      <!-- Programme -->
      <section :id="items[1].id" class="scroll-mt-40">
        <UCard class="border-t-4 border-t-primary-500 p-0 overflow-hidden">
          <div class="p-8 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center gap-3">
            <UIcon :name="items[1].icon" class="h-6 w-6 text-primary-600" />
            <h3 class="text-2xl font-black uppercase m-0">Programme Électoral</h3>
          </div>
          <div v-if="mainCandidate?.documents?.file" class="p-8">
            <ClientOnly>
              <PdfViewer
                :source="getAssetUrl(mainCandidate.documents.file, mainCandidate.documents.slug)"
                :download-name="`${mainCandidate.documents.slug}.pdf`"
              />
            </ClientOnly>
          </div>
          <div v-else class="text-center py-20">
             <UIcon name="i-heroicons-document-text" class="h-12 w-12 text-gray-300 mx-auto" />
             <p class="text-gray-500 mt-4">Programme non disponible pour le moment.</p>
          </div>
        </UCard>
      </section>

      <!-- Vidéos -->
      <section :id="items[2].id" class="scroll-mt-40">
        <UCard class="border-t-4 border-t-primary-500 p-8">
          <h3 class="text-2xl font-black uppercase mb-8 flex items-center gap-3">
            <UIcon :name="items[2].icon" class="text-primary-600" /> Vidéos de Campagne
          </h3>
          <div v-if="videosLoading" class="grid md:grid-cols-2 gap-8">
            <USkeleton v-for="i in 2" :key="i" class="h-64 rounded-2xl" />
          </div>
          <div v-else-if="videos.length" class="grid md:grid-cols-2 gap-8">
            <div v-for="video in videos" :key="video.id" class="group space-y-4">
              <div class="aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-100 dark:border-gray-800">
                <iframe v-if="getYoutubeEmbedUrl(video.url_youtube)" :src="getYoutubeEmbedUrl(video.url_youtube)" class="w-full h-full" allowfullscreen></iframe>
              </div>
              <p class="font-bold italic">"{{ video.title }}"</p>
            </div>
          </div>
          <div v-else class="text-center py-20">
            <UIcon name="i-heroicons-video-camera-slash" class="h-12 w-12 text-gray-300 mx-auto" />
            <p class="text-gray-500 mt-4">Aucune vidéo de campagne disponible.</p>
          </div>
        </UCard>
      </section>
    </div>
  </div>
</template>

<style scoped>
.scroll-mt-40 { scroll-margin-top: 180px; }
@media (max-width: 768px) { .scroll-mt-40 { scroll-margin-top: 140px; } }
</style>
