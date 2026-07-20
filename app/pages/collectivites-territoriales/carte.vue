<script setup lang="ts">
import { COMMUNES, REGIONS, formatNumber } from '#shared/communes';

definePageMeta({ layout: 'fullscreen' });

const route = useRoute();
const router = useRouter();
const { siteUrl, themeColor } = useSiteMetadata();

// Filtre région lu de façon synchrone depuis l'URL (SSR-correct + partageable)
const region = ref((route.query.region as string) || '');

watch(region, (r) => {
  router.replace({ query: r ? { region: r } : {} });
});

const filtered = computed(() =>
  region.value ? COMMUNES.filter((c) => c.region === region.value) : COMMUNES,
);

const regionOptions = [
  { label: 'Toutes les régions', value: '' },
  ...REGIONS.map((r) => ({ label: r, value: r })),
];

// ── SEO ────────────────────────────────────────────────────────────
const pageTitle = 'Carte interactive des communes du Sénégal';
const pageDescription =
  'Explorez les collectivités territoriales du Sénégal sur une carte interactive. Cliquez sur une commune pour ouvrir sa fiche complète.';
const pageUrl = `${siteUrl}/collectivites-territoriales/carte`;

useSeoMeta({
  title: pageTitle,
  ogTitle: pageTitle,
  description: pageDescription,
  ogDescription: pageDescription,
  ogUrl: pageUrl,
  ogType: 'website',
});

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: [{ rel: 'canonical', href: pageUrl }],
  meta: [
    { name: 'robots', content: 'index, follow' },
    { name: 'theme-color', content: themeColor },
  ],
});
</script>

<template>
  <div class="relative h-full min-h-[480px] w-full">
    <CollectivitesCommunesMap :communes="filtered" height="100%" class="!rounded-none !ring-0" />

    <!-- Panneau de contrôle superposé -->
    <div
      class="custom-shadow absolute left-4 top-4 z-[1000] w-[calc(100%-2rem)] max-w-sm rounded-lg bg-white/95 p-4 backdrop-blur dark:bg-gray-800/95"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-bold text-gray-900 dark:text-white">
            Carte des collectivités territoriales
          </h1>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ formatNumber(filtered.length) }} collectivité{{
              filtered.length > 1 ? 's' : ''
            }}
            affichée{{ filtered.length > 1 ? 's' : '' }} - cliquez sur une commune pour ouvrir sa
            fiche.
          </p>
        </div>
        <NuxtLink
          to="/collectivites-territoriales"
          class="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          title="Retour à l'annuaire"
        >
          <UIcon name="i-heroicons-x-mark" class="size-5" />
        </NuxtLink>
      </div>
      <label class="mt-3 flex flex-col text-xs text-gray-500 dark:text-gray-400">
        <span class="mb-1 uppercase tracking-wider">Filtrer par région</span>
        <USelect v-model="region" :options="regionOptions" />
      </label>
      <div class="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span class="inline-block h-3 w-3 rounded-full bg-sky-600 opacity-70" />
        Commune (rayon proportionnel à la population)
      </div>
    </div>
  </div>
</template>
