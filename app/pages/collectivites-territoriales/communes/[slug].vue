<script setup lang="ts">
import { getCommuneTabPath, getVisibleCommuneTabs } from '~/composables/collectivites/communeTabs';
import { useCommuneGeo } from '~/composables/collectivites/useCommunesGeo';
import type { CommuneTab } from '~/composables/collectivites/communeTabs';

const route = useRoute();
const { siteUrl } = useSiteMetadata();

const slug = computed(() => route.params.slug as string);

// Source unique : le référentiel géo (558 collectivités). Aucune donnée de
// démonstration ne subsiste dans ce module.
const { commune } = await useCommuneGeo(slug);

if (!commune.value) {
  throw createError({ statusCode: 404, statusMessage: 'Commune introuvable', fatal: true });
}

// Onglets dérivés des données disponibles : une commune sans maire n'a pas
// d'onglet « Le maire », et l'URL correspondante n'existe pas non plus.
const visibleTabs = computed(() => (commune.value ? getVisibleCommuneTabs(commune.value) : []));

const isActiveTab = (tab: CommuneTab) => route.path === getCommuneTabPath(commune.value!.slug, tab);

const pageUrl = computed(
  () => `${siteUrl}/collectivites-territoriales/communes/${commune.value?.slug}`,
);

// Le fil d'ariane passe par le département : c'est le niveau intermédiaire réel
// entre l'annuaire et la fiche, et il ouvre le hub qui liste les communes
// voisines. Omis si le référentiel ne rattache la collectivité à aucun
// département (chaîne `parent` incomplète) - pas de lien vers une page absente.
const breadcrumbItems = computed(() => [
  { label: 'Collectivités territoriales', to: '/collectivites-territoriales' },
  ...(commune.value?.departementSlug
    ? [
        {
          label: `Département de ${commune.value.departement}`,
          to: `/collectivites-territoriales/departements/${commune.value.departementSlug}`,
        },
      ]
    : []),
  { label: commune.value?.nom ?? '' },
]);
</script>

<template>
  <div v-if="commune" class="min-h-screen pb-16">
    <div class="mx-auto max-w-7xl px-4 pt-2">
      <AppBreadcrumb :items="breadcrumbItems" />
    </div>

    <!-- ─── Hero ───────────────────────────────────────────────────────
         Photo de couverture du profil d'entité quand elle existe, aplat sobre
         sinon : aucune illustration d'archive à la place d'un visuel réel. -->
    <section
      class="relative mt-2 flex h-[40vh] min-h-[300px] w-full items-end overflow-hidden rounded-lg"
      :class="!commune.photoCouverture && 'bg-gradient-to-br from-sky-700 to-sky-900'"
    >
      <CmsImage
        v-if="commune.photoCouverture"
        :src="commune.photoCouverture"
        :alt="`${commune.type} de ${commune.nom}`"
        loading="eager"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <div
        v-if="commune.photoCouverture"
        class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10"
      />

      <div class="relative w-full px-4 pb-6 text-white md:px-8">
        <CmsImage
          v-if="commune.logo"
          :src="commune.logo"
          :alt="`Logo de ${commune.nom}`"
          :width="56"
          :height="56"
          class="h-14 w-14 shrink-0 rounded-lg bg-white/90 object-contain p-1"
        />

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
          <span
            v-if="commune.arrondissement"
            class="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur"
          >
            Arrondissement de {{ commune.arrondissement }}
          </span>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <a
            v-if="commune.contact?.telephone"
            :href="`tel:${commune.contact.telephone.replace(/\s/g, '')}`"
            class="inline-flex items-center gap-2 rounded-md bg-white/95 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-white"
          >
            <UIcon name="i-heroicons-phone" class="size-4" />
            Téléphoner
          </a>
          <a
            v-if="commune.contact?.siteWeb"
            :href="commune.contact.siteWeb"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-2 rounded-md bg-white/95 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-white"
          >
            <UIcon name="i-heroicons-globe-alt" class="size-4" />
            Site web
          </a>
          <SocialShare :title="`${commune.nom} - ${commune.type} du Sénégal`" :url="pageUrl" />
        </div>
      </div>
    </section>

    <!-- ─── Bandeau de repères ─────────────────────────────────────── -->
    <CollectivitesCommuneKpiStrip :commune="commune" class="mt-2" />

    <!-- ─── Barre d'onglets (liens réels, indexables) ──────────────── -->
    <div
      v-if="visibleTabs.length > 1"
      class="sticky top-0 z-30 mt-2 border-b border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-900"
    >
      <nav
        class="scrollbar-hide mx-auto flex max-w-7xl gap-5 overflow-x-auto px-4"
        aria-label="Sections de la fiche"
      >
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
    <section class="mx-auto max-w-7xl px-4 py-8">
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
