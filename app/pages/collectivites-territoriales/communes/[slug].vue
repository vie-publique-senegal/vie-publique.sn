<script setup lang="ts">
import { getCommune } from '#shared/communes';
import {
  getCommuneTabPath,
  getVisibleCommuneTabs,
  type CommuneTab,
} from '~/composables/collectivites/communeTabs';

const route = useRoute();

const commune = getCommune(route.params.slug as string);
if (!commune) {
  throw createError({ statusCode: 404, statusMessage: 'Commune introuvable', fatal: true });
}

const visibleTabs = getVisibleCommuneTabs(commune.tabsMasques);

// Anciens liens `?tab=budget` (query) → URL canonique par chemin (/communes/<slug>/budget).
const legacyTab = visibleTabs.find((t) => t.key === route.query.tab && t.path);
if (legacyTab) {
  await navigateTo(getCommuneTabPath(commune.slug, legacyTab), {
    redirectCode: 301,
    replace: true,
  });
}

const isActiveTab = (tab: CommuneTab) => route.path === getCommuneTabPath(commune!.slug, tab);

const share = () => {
  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator.share({ title: commune.nom, url: window.location.href });
  }
};
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
            <NuxtLink
              :to="getCommuneTabPath(commune.slug, visibleTabs[0])"
              class="inline-flex items-center gap-2 rounded-md bg-white/95 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-white"
            >
              <UIcon name="i-heroicons-map-pin" class="size-4" />
              Localiser
            </NuxtLink>
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

    <!-- ─── Barre d'onglets (liens réels, indexables) ──────────────── -->
    <div
      class="sticky top-0 z-30 -mx-4 mt-2 border-b border-gray-100 bg-white px-4 dark:border-gray-700 dark:bg-gray-900"
    >
      <nav class="scrollbar-hide flex gap-5 overflow-x-auto" aria-label="Sections de la fiche">
        <NuxtLink
          v-for="t in visibleTabs"
          :key="t.key"
          :to="getCommuneTabPath(commune.slug, t)"
          class="shrink-0 whitespace-nowrap border-b-2 px-1 py-3 text-sm transition-colors"
          :class="
            isActiveTab(t)
              ? 'border-primary-600 font-medium text-gray-900 dark:text-white'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          "
          :aria-current="isActiveTab(t) ? 'page' : undefined"
        >
          {{ t.label }}
        </NuxtLink>
      </nav>
    </div>

    <!-- ─── Contenu de l'onglet actif (route enfant) ──────────────── -->
    <section class="py-8">
      <NuxtPage />
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
