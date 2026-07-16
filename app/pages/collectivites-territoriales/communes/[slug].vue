<script setup lang="ts">
import type { Component } from 'vue';
import { getCommune, formatNumber } from '#shared/communes';
import TabApercu from '~/components/collectivites/tabs/Apercu.vue';
import TabMaire from '~/components/collectivites/tabs/Maire.vue';
import TabExecutif from '~/components/collectivites/tabs/Executif.vue';
import TabConseil from '~/components/collectivites/tabs/Conseil.vue';
import TabTerritoire from '~/components/collectivites/tabs/Territoire.vue';
import TabBudget from '~/components/collectivites/tabs/Budget.vue';
import TabProjets from '~/components/collectivites/tabs/Projets.vue';
import TabServices from '~/components/collectivites/tabs/Services.vue';
import TabDocuments from '~/components/collectivites/tabs/Documents.vue';
import TabActualites from '~/components/collectivites/tabs/Actualites.vue';
import TabContacts from '~/components/collectivites/tabs/Contacts.vue';

const route = useRoute();
const router = useRouter();
const { siteName, siteUrl, themeColor } = useSiteMetadata();

const commune = getCommune(route.params.slug as string);
if (!commune) {
  throw createError({ statusCode: 404, statusMessage: 'Commune introuvable', fatal: true });
}

// ── Onglets (?tab= lu de façon SYNCHRONE au setup — règle SSR CLAUDE.md) ──
const TABS: { key: string; label: string; component: Component }[] = [
  { key: 'apercu', label: 'Aperçu', component: TabApercu },
  { key: 'maire', label: 'Le Maire', component: TabMaire },
  { key: 'executif', label: 'Exécutif', component: TabExecutif },
  { key: 'conseil', label: 'Conseil', component: TabConseil },
  { key: 'territoire', label: 'Territoire', component: TabTerritoire },
  { key: 'budget', label: 'Budget', component: TabBudget },
  { key: 'projets', label: 'Projets', component: TabProjets },
  { key: 'services', label: 'Services', component: TabServices },
  { key: 'documents', label: 'Documents', component: TabDocuments },
  { key: 'actualites', label: 'Actualités', component: TabActualites },
  { key: 'contacts', label: 'Contacts', component: TabContacts },
];

const initialTab = TABS.findIndex((t) => t.key === route.query.tab);
const selectedTab = ref(initialTab >= 0 ? initialTab : 0);

watch(selectedTab, (i) => {
  router.replace({
    query: { ...route.query, tab: i > 0 ? TABS[i].key : undefined },
  });
});

const activeTab = computed(() => TABS[selectedTab.value] ?? TABS[0]);

// ── Actions du hero ────────────────────────────────────────────────
const share = () => {
  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator.share({ title: commune.nom, url: window.location.href });
  }
};

// ── SEO (déclaré en dernier — anti-TDZ) ────────────────────────────
const pageTitle = `${commune.nom} — Commune du Sénégal (${commune.region})`;
const pageDescription = `Fiche complète de la commune de ${commune.nom} (${commune.region}) : maire ${commune.maire.nom}, ${formatNumber(commune.population)} habitants, budget, conseil municipal et documents.`;
const pageUrl = `${siteUrl}/collectivites-territoriales/communes/${commune.slug}`;

useSeoMeta({
  title: pageTitle,
  ogTitle: pageTitle,
  description: pageDescription,
  ogDescription: pageDescription,
  ogImage: commune.photoCouverture,
  ogUrl: pageUrl,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterImage: commune.photoCouverture,
});

// Nœud d'entité propre à la page : la mairie (GovernmentOrganization).
// Le BreadcrumbList est émis par <AppBreadcrumb> — ne pas en ajouter un 2e.
const mairieSchema = {
  '@context': 'https://schema.org',
  '@type': 'GovernmentOrganization',
  name: `Mairie de ${commune.nom}`,
  url: commune.mairie.siteWeb || pageUrl,
  telephone: commune.mairie.telephone,
  email: commune.mairie.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: commune.mairie.adresse,
    addressLocality: commune.nom,
    addressRegion: commune.region,
    addressCountry: 'SN',
  },
  location: {
    '@type': 'Place',
    geo: {
      '@type': 'GeoCoordinates',
      latitude: commune.latitude,
      longitude: commune.longitude,
    },
  },
  areaServed: commune.nom,
  parentOrganization: { '@type': 'GovernmentOrganization', name: 'République du Sénégal' },
};

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: [{ rel: 'canonical', href: pageUrl }],
  meta: [
    { name: 'robots', content: 'index, follow' },
    { name: 'theme-color', content: themeColor },
    { property: 'og:site_name', content: siteName },
  ],
  script: [
    {
      key: 'ld-mairie',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(mairieSchema),
    },
  ],
});
</script>

<template>
  <div v-if="commune" class="min-h-screen pb-16">
    <AppBreadcrumb
      :items="[
        { label: 'Collectivités territoriales', to: '/collectivites-territoriales' },
        { label: commune.nom },
      ]"
      class="px-4"
    />

    <!-- ─── Hero photo ─────────────────────────────────────────────── -->
    <section class="relative mt-2 h-[40vh] min-h-[320px] w-full overflow-hidden rounded-lg">
      <img :src="commune.photoCouverture" :alt="commune.nom" class="h-full w-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
      <div class="absolute inset-0 flex items-end">
        <div class="w-full px-4 pb-6 text-white md:px-8">
          <div class="text-xs uppercase tracking-widest opacity-90">
            {{ commune.region }} › {{ commune.departement }}
          </div>
          <h1 class="mt-2 text-3xl font-bold leading-tight md:text-5xl">{{ commune.nom }}</h1>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-if="commune.chefLieu"
              class="rounded-full bg-sky-600 px-3 py-1 text-xs font-medium"
            >
              Chef-lieu
            </span>
            <span class="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              {{ commune.type }}
            </span>
            <span class="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              {{ commune.codeAdministratif }}
            </span>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-md bg-white/95 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-white"
              @click="selectedTab = 0"
            >
              <UIcon name="i-heroicons-map-pin" class="size-4" />
              Localiser
            </button>
            <a
              v-if="commune.mairie.telephone"
              :href="`tel:${commune.mairie.telephone.replace(/\s/g, '')}`"
              class="inline-flex items-center gap-2 rounded-md bg-white/95 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-white"
            >
              <UIcon name="i-heroicons-phone" class="size-4" />
              Téléphoner
            </a>
            <a
              v-if="commune.mairie.siteWeb"
              :href="commune.mairie.siteWeb"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-2 rounded-md bg-white/95 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-white"
            >
              <UIcon name="i-heroicons-globe-alt" class="size-4" />
              Site web
            </a>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-md bg-white/95 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-white"
              @click="share"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="size-4" />
              Partager
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Bandeau KPI ────────────────────────────────────────────── -->
    <CollectivitesCommuneKpiStrip :commune="commune" class="mt-4 rounded-lg" />

    <!-- ─── Barre d'onglets (scrollable mobile, sans scrollbar) ────── -->
    <div
      class="sticky top-0 z-30 -mx-4 mt-2 border-b border-gray-100 bg-white/90 px-4 backdrop-blur dark:border-gray-700 dark:bg-gray-900/90"
    >
      <nav class="scrollbar-hide flex gap-1 overflow-x-auto py-2" aria-label="Sections de la fiche">
        <button
          v-for="(t, i) in TABS"
          :key="t.key"
          type="button"
          class="whitespace-nowrap rounded-md px-4 py-2 text-sm transition"
          :class="
            selectedTab === i
              ? 'bg-primary-600 text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
          "
          @click="selectedTab = i"
        >
          {{ t.label }}
        </button>
      </nav>
    </div>

    <!-- ─── Contenu de l'onglet actif ──────────────────────────────── -->
    <section class="py-8">
      <component :is="activeTab.component" :commune="commune" />
    </section>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
