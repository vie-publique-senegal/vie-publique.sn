<script setup lang="ts">
import { formatFollowers } from '#shared/social-networks';
import type { VpLink, VpLinkSection, VpLinksResponse } from '~~/types/vp-link';

// Page « tous nos liens » : remplace le Linktree. Cible du QR code imprimé sur les
// t-shirts et supports de com → vitrine courte des PRODUITS VP (site, apps, …),
// pas un plan du site. Contenu piloté par /api/liens (JSON, puis Directus `vp_links`).

const { siteUrl } = useSiteMetadata();
const router = useRouter();
const { trackLinkClick } = useAnalytics();

const { data } = await useFetch<VpLinksResponse>('/api/liens', { key: 'vp-links' });

const links = computed(() => data.value?.data ?? []);

const bySection = (section: VpLinkSection) =>
  links.value.filter((link) => link.section === section);

const featured = computed(() => bySection('featured'));
const apps = computed(() => bySection('app'));
const socials = computed(() => bySection('social'));

// Blocs affichés en liste sous les apps, dans cet ordre (vides = masqués)
const listSections = computed(() =>
  (
    [
      { key: 'products', title: 'Nos autres produits' },
      { key: 'social', title: 'Suivez-nous' },
      { key: 'about', title: "L'association" },
    ] as { key: VpLinkSection; title: string }[]
  )
    .map((section) => ({ ...section, links: bySection(section.key) }))
    .filter((section) => section.links.length > 0),
);

// Réseaux : le nombre d'abonnés tient lieu de description
const linkDescription = (link: VpLink) =>
  link.followers ? `${formatFollowers(link.followers)} abonnés` : link.description;

const isAbsolute = (url: string) => /^https?:\/\//.test(url);

// Un chemin interne qui n'est pas une page Vue (`/docs/…` = route Nitro) doit
// être chargé en navigation classique, sinon vue-router cherche une page absente.
const isVueRoute = (url: string) => !isAbsolute(url) && router.resolve(url).matched.length > 0;

const linkAttrs = (link: VpLink) =>
  isAbsolute(link.url)
    ? { to: link.url, external: true, target: '_blank', rel: 'noopener noreferrer' }
    : { to: link.url, external: !isVueRoute(link.url) };

const title = 'Tous nos liens';
const description =
  "Retrouvez les produits de Vie Publique Sénégal : le site vie-publique.sn, l'application mobile Android et iPhone, la chaîne YouTube, la newsletter et nos réseaux sociaux.";

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogUrl: `${siteUrl}/liens`,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
});
</script>

<template>
  <div class="mx-auto min-h-screen max-w-md px-4 pb-16 pt-8">
    <!-- En-tête -->
    <header class="text-center">
      <!-- Pas de logo : il est déjà dans la barre de navigation -->
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Vie Publique Sénégal</h1>
      <p class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        L'information publique du Sénégal, en accès libre.
      </p>

      <nav v-if="socials.length" aria-label="Réseaux sociaux" class="mt-5">
        <ul class="flex flex-wrap items-center justify-center gap-1">
          <li v-for="social in socials" :key="social.id">
            <a
              :href="social.url"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="social.title"
              :title="social.title"
              class="flex h-11 w-11 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              @click="trackLinkClick(social.id, social.section)"
            >
              <UIcon :name="social.icon || 'i-heroicons-link'" class="h-5 w-5" />
            </a>
          </li>
        </ul>
      </nav>
    </header>

    <!-- Mis en avant -->
    <!-- Même style que les blocs « Nos autres produits » : la mise en avant tient
         à la position en tête de page, pas à la couleur -->
    <ul
      v-if="featured.length"
      class="mt-8 divide-y divide-gray-100 overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 dark:divide-gray-700 dark:bg-gray-800 dark:ring-gray-700"
    >
      <li v-for="link in featured" :key="link.id">
        <NuxtLink
          v-bind="linkAttrs(link)"
          class="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
          @click="trackLinkClick(link.id, link.section)"
        >
          <UIcon
            :name="link.icon || 'i-heroicons-link'"
            class="h-5 w-5 flex-shrink-0 text-sky-600 dark:text-sky-400"
          />
          <span class="min-w-0 flex-1">
            <span class="block font-medium text-gray-900 dark:text-white">{{ link.title }}</span>
            <span
              v-if="link.description"
              class="block truncate text-sm text-gray-500 dark:text-gray-400"
            >
              {{ link.description }}
            </span>
          </span>
          <UIcon name="i-heroicons-chevron-right" class="h-4 w-4 flex-shrink-0 text-gray-400" />
        </NuxtLink>
      </li>
    </ul>

    <!-- Application mobile : badges officiels des stores -->
    <section v-if="apps.length" class="mt-8" aria-labelledby="liens-app">
      <h2
        id="liens-app"
        class="mb-3 text-center text-sm font-semibold text-gray-900 dark:text-white"
      >
        Téléchargez l'application mobile
      </h2>
      <div class="grid grid-cols-2 gap-3">
        <a
          v-for="app in apps"
          :key="app.id"
          :href="app.url"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center transition-transform hover:scale-105"
          @click="trackLinkClick(app.id, app.section)"
        >
          <img v-if="app.image" :src="app.image" :alt="app.title" class="h-12 w-auto" />
          <span
            v-else
            class="w-full rounded-lg bg-gray-900 px-3 py-3 text-center text-sm font-medium text-white dark:bg-gray-700"
          >
            {{ app.title }}
          </span>
        </a>
      </div>
    </section>

    <!-- Blocs de liens -->
    <section v-for="section in listSections" :key="section.key" class="mt-8">
      <h2
        class="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
      >
        {{ section.title }}
      </h2>
      <ul
        class="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 dark:divide-gray-700 dark:bg-gray-800 dark:ring-gray-700"
      >
        <li v-for="link in section.links" :key="link.id">
          <NuxtLink
            v-bind="linkAttrs(link)"
            class="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            @click="trackLinkClick(link.id, link.section)"
          >
            <UIcon
              :name="link.icon || 'i-heroicons-link'"
              class="h-5 w-5 flex-shrink-0 text-sky-600 dark:text-sky-400"
            />
            <span class="min-w-0 flex-1">
              <span class="block font-medium text-gray-900 dark:text-white">{{ link.title }}</span>
              <span
                v-if="linkDescription(link)"
                class="block truncate text-sm text-gray-500 dark:text-gray-400"
              >
                {{ linkDescription(link) }}
              </span>
            </span>
            <UIcon
              :name="
                isAbsolute(link.url) ? 'i-heroicons-arrow-up-right' : 'i-heroicons-chevron-right'
              "
              class="h-4 w-4 flex-shrink-0 text-gray-400"
            />
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
