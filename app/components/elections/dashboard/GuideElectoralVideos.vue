<script setup lang="ts">
import {
  useGuideElectoral,
  type GuideVideo,
} from '~/composables/elections/guide/useGuideElectoral';

interface Props {
  /** Fixé par le dashboard d'un scrutin ; sans prop, la page gère le filtre type (+ sync URL). */
  typeElection?: string;
  defaultLanguage?: string;
}

const props = defineProps<Props>();

const selectedLanguage = ref(props.defaultLanguage || 'all');
const selectedType = ref('all');
const route = useRoute();
const router = useRouter();

const electionTypeLabels: Record<string, string> = {
  presidential: 'Présidentielles',
  legislative: 'Législatives',
  local: 'Locales',
};

if (!props.typeElection) {
  if (route.query.lang) selectedLanguage.value = route.query.lang as string;
  if (route.query.type) selectedType.value = route.query.type as string;

  watch(selectedLanguage, (newLang) => {
    router.replace({ query: { ...route.query, lang: newLang === 'all' ? undefined : newLang } });
  });

  watch(selectedType, (newType) => {
    router.replace({ query: { ...route.query, type: newType === 'all' ? undefined : newType } });
    // Repartir d'une langue valide pour le nouveau type sélectionné
    selectedLanguage.value = 'all';
  });
}

const { videos, loading, languages } = useGuideElectoral({
  type: computed(() => props.typeElection || 'all'),
});

// Types réellement présents dans les données (uniquement hors dashboard d'un scrutin)
const availableTypes = computed(() => {
  if (!videos.value) return [];
  const types = [...new Set(videos.value.map((v) => v.type_election))].filter(Boolean);
  return types.map((value) => ({ value, label: electionTypeLabels[value] || value }));
});

// Vidéos du type courant, utilisées pour déterminer les langues disponibles
const videosForSelectedType = computed(() => {
  if (!videos.value) return [];
  const effectiveType = props.typeElection || selectedType.value;
  if (!effectiveType || effectiveType === 'all') return videos.value;
  return videos.value.filter((v) => v.type_election === effectiveType);
});

// Langues réellement présentes pour le type courant (pas la liste des choix du schéma CMS)
const availableLanguages = computed(() => {
  const langs = [...new Set(videosForSelectedType.value.map((v) => v.langue))].filter(Boolean);
  return langs.map((value) => ({
    value,
    label: languages.value[value] || value.toUpperCase(),
  }));
});

const filteredVideos = computed(() => {
  if (!videos.value) return [];

  let filtered = videos.value;

  if (selectedLanguage.value !== 'all') {
    filtered = filtered.filter((v) => v.langue === selectedLanguage.value);
  }

  const effectiveType = props.typeElection || selectedType.value;
  if (effectiveType && effectiveType !== 'all') {
    filtered = filtered.filter((v) => v.type_election === effectiveType);
  }

  return filtered;
});

const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const videoTitle = (video: GuideVideo) =>
  video.titre || languages.value[video.langue] || video.langue?.toUpperCase() || '';

const selectedVideo = ref<GuideVideo | null>(null);

// Fermer la lightbox avec Échap
onMounted(() => {
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') selectedVideo.value = null;
  };
  window.addEventListener('keydown', onKeydown);
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
});
</script>

<template>
  <div class="space-y-5">
    <!-- Lightbox vidéo -->
    <Teleport to="body">
      <div
        v-if="selectedVideo"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
        @click.self="selectedVideo = null"
      >
        <button
          type="button"
          class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="Fermer la vidéo"
          @click="selectedVideo = null"
        >
          <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
        </button>
        <div class="w-[92vw] max-w-5xl">
          <div class="relative w-full overflow-hidden rounded-2xl bg-black pb-[56.25%] shadow-2xl">
            <iframe
              v-if="getYouTubeVideoId(selectedVideo.url_youtube)"
              :src="`https://www.youtube.com/embed/${getYouTubeVideoId(selectedVideo.url_youtube)}?autoplay=1&rel=0`"
              class="absolute inset-0 h-full w-full border-0"
              allow="
                accelerometer;
                autoplay;
                clipboard-write;
                encrypted-media;
                gyroscope;
                picture-in-picture;
                web-share;
              "
              allowfullscreen
            />
          </div>
          <p class="mt-4 text-center text-base font-bold text-white">
            {{ videoTitle(selectedVideo) }}
          </p>
        </div>
      </div>
    </Teleport>

    <!-- Chargement -->
    <div v-if="loading" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <USkeleton v-for="i in 6" :key="i" class="aspect-video w-full rounded-xl" />
    </div>

    <template v-else>
      <!-- Filtre type (uniquement hors dashboard d'un scrutin, et si plusieurs types ont des vidéos) -->
      <div v-if="!props.typeElection && availableTypes.length > 1" class="flex flex-wrap items-center gap-2">
        <span class="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-400"
          >Type :</span
        >
        <button
          class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
          :class="
            selectedType === 'all'
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'hover:border-primary-400 border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
          "
          @click="selectedType = 'all'"
        >
          Tous
        </button>
        <button
          v-for="type in availableTypes"
          :key="type.value"
          class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
          :class="
            selectedType === type.value
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'hover:border-primary-400 border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
          "
          @click="selectedType = type.value"
        >
          {{ type.label }}
        </button>
      </div>

      <!-- Filtre langue (uniquement si plusieurs langues ont des vidéos pour le type courant) -->
      <div v-if="availableLanguages.length > 1" class="flex flex-wrap items-center gap-2">
        <span class="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-400"
          >Langue :</span
        >
        <button
          class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
          :class="
            selectedLanguage === 'all'
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'hover:border-primary-400 border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
          "
          @click="selectedLanguage = 'all'"
        >
          Toutes
        </button>
        <button
          v-for="lang in availableLanguages"
          :key="lang.value"
          class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
          :class="
            selectedLanguage === lang.value
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'hover:border-primary-400 border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
          "
          @click="selectedLanguage = lang.value"
        >
          {{ lang.label }}
        </button>
      </div>

      <!-- État vide -->
      <div v-if="filteredVideos.length === 0" class="flex flex-col items-center py-16 text-center">
        <UIcon
          name="i-heroicons-video-camera-slash"
          class="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
        />
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Aucune vidéo disponible pour cette sélection.
        </p>
      </div>

      <!-- Grille de vignettes (lecture en lightbox) -->
      <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button
          v-for="video in filteredVideos"
          :key="video.id"
          type="button"
          class="group overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition-all duration-300 hover:shadow-lg active:scale-[0.98] dark:border-gray-700 dark:bg-gray-900"
          @click="selectedVideo = video"
        >
          <div class="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-900">
            <img
              v-if="getYouTubeVideoId(video.url_youtube)"
              :src="`https://img.youtube.com/vi/${getYouTubeVideoId(video.url_youtube)}/hqdefault.jpg`"
              :alt="videoTitle(video)"
              class="h-full w-full scale-125 object-cover transition-transform duration-300 group-hover:scale-[1.35]"
              loading="lazy"
            />
            <div class="absolute inset-0 flex items-center justify-center">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 opacity-90 shadow-lg transition-opacity group-hover:opacity-100"
              >
                <UIcon name="i-heroicons-play-solid" class="ml-0.5 h-5 w-5 text-white" />
              </div>
            </div>
          </div>
          <div class="p-2.5">
            <h3 class="line-clamp-2 text-xs font-bold leading-snug text-gray-900 dark:text-white">
              {{ videoTitle(video) }}
            </h3>
            <p
              v-if="video.description"
              class="mt-1 line-clamp-2 text-[11px] text-gray-500 dark:text-gray-400"
            >
              {{ video.description }}
            </p>
          </div>
        </button>
      </div>
    </template>
  </div>
</template>
