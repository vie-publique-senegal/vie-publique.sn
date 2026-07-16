<script setup lang="ts">
import { COMMUNES, REGIONS, DEPARTEMENTS, PARTIS, formatNumber } from '#shared/communes';

const { siteName, siteUrl, themeColor, keywords } = useSiteMetadata();
const route = useRoute();
const router = useRouter();

// ── État UI initialisé depuis route.query DE FAÇON SYNCHRONE (règle SSR CLAUDE.md)
type ViewMode = 'cartes' | 'liste' | 'carte';
const VIEWS: { key: ViewMode; label: string }[] = [
  { key: 'cartes', label: 'Cartes' },
  { key: 'liste', label: 'Liste' },
  { key: 'carte', label: 'Carte' },
];

const view = ref<ViewMode>(
  VIEWS.some((v) => v.key === route.query.vue) ? (route.query.vue as ViewMode) : 'cartes',
);
const q = ref((route.query.q as string) || '');
const region = ref((route.query.region as string) || '');
const departement = ref((route.query.departement as string) || '');
const parti = ref((route.query.parti as string) || '');
const type = ref((route.query.type as string) || '');
const popMin = ref((route.query.popmin as string) || '');
const hasWeb = ref(route.query.web === '1');
const hasFb = ref(route.query.fb === '1');

// Miroir de l'état dans l'URL (filtres partageables)
watch([view, q, region, departement, parti, type, popMin, hasWeb, hasFb], () => {
  router.replace({
    query: {
      ...(view.value !== 'cartes' && { vue: view.value }),
      ...(q.value && { q: q.value }),
      ...(region.value && { region: region.value }),
      ...(departement.value && { departement: departement.value }),
      ...(parti.value && { parti: parti.value }),
      ...(type.value && { type: type.value }),
      ...(popMin.value && { popmin: popMin.value }),
      ...(hasWeb.value && { web: '1' }),
      ...(hasFb.value && { fb: '1' }),
    },
  });
});

// Recherche insensible aux accents (« thies » doit trouver « Thiès »)
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const filtered = computed(() => {
  const query = normalize(q.value.trim());
  return COMMUNES.filter((c) => {
    if (query) {
      const hay = normalize(`${c.nom} ${c.maire.nom} ${c.region} ${c.departement}`);
      if (!hay.includes(query)) return false;
    }
    if (region.value && c.region !== region.value) return false;
    if (departement.value && c.departement !== departement.value) return false;
    if (parti.value && c.maire.parti !== parti.value) return false;
    if (type.value && c.type !== type.value) return false;
    if (hasWeb.value && !c.mairie.siteWeb) return false;
    if (hasFb.value && !c.mairie.facebook) return false;
    if (popMin.value && c.population < Number(popMin.value)) return false;
    return true;
  });
});

const resetFilters = () => {
  q.value = '';
  region.value = '';
  departement.value = '';
  parti.value = '';
  type.value = '';
  popMin.value = '';
  hasWeb.value = false;
  hasFb.value = false;
};

const totalPopulation = COMMUNES.reduce((s, c) => s + c.population, 0);

// ── SEO (en dernier — helpers et computeds déclarés avant) ─────────
const pageTitle = 'Collectivités territoriales du Sénégal : annuaire des communes';
const pageDescription =
  'Recherchez une commune, un maire, une région. Fiches complètes des collectivités territoriales du Sénégal : gouvernance locale, conseil municipal, budgets et documents officiels.';
const pageUrl = `${siteUrl}/collectivites-territoriales`;

useSeoMeta({
  title: pageTitle,
  ogTitle: pageTitle,
  description: pageDescription,
  ogDescription: pageDescription,
  ogUrl: pageUrl,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  keywords: [
    ...keywords,
    'collectivités territoriales Sénégal',
    'communes du Sénégal',
    'maires du Sénégal',
    'conseil municipal Sénégal',
    'mairie Sénégal',
  ].join(', '),
});

// Nœud d'entité propre à la page (le BreadcrumbList est émis par <AppBreadcrumb>).
const collectionPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: pageTitle,
  description: pageDescription,
  url: pageUrl,
  inLanguage: 'fr-SN',
  isPartOf: { '@type': 'WebSite', name: siteName, url: siteUrl },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: COMMUNES.length,
    itemListElement: COMMUNES.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.nom,
      url: `${siteUrl}/collectivites-territoriales/communes/${c.slug}`,
    })),
  },
};

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: [{ rel: 'canonical', href: pageUrl }],
  meta: [
    { name: 'robots', content: 'index, follow' },
    { name: 'theme-color', content: themeColor },
  ],
  script: [
    {
      key: 'ld-collectivites',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(collectionPageSchema),
    },
  ],
});
</script>

<template>
  <div class="min-h-screen pb-16">
    <AppBreadcrumb :items="[{ label: 'Collectivités territoriales' }]" class="px-4" />

    <!-- ─── Hero éditorial (H1 unique + stats) ─────────────────────── -->
    <section class="mx-auto mt-4 max-w-3xl px-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
        L'annuaire des collectivités territoriales du Sénégal
      </h1>
      <p class="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400 md:text-base">
        Fiches complètes de chaque commune : gouvernance locale, conseil municipal, données
        territoriales, résultats électoraux, budget, projets et documents publics.
      </p>
      <div class="mt-6 flex flex-wrap gap-8 text-sm">
        <div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ formatNumber(COMMUNES.length) }}
          </div>
          <div class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Collectivités référencées
          </div>
        </div>
        <div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ formatNumber(REGIONS.length) }}
          </div>
          <div class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Régions couvertes
          </div>
        </div>
        <div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ formatNumber(totalPopulation) }}
          </div>
          <div class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Habitants
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Recherche + filtres + bascule de vue ───────────────────── -->
    <section class="mx-auto mt-8 max-w-7xl px-4">
      <CollectivitesCommunesFilters
        v-model:q="q"
        v-model:region="region"
        v-model:departement="departement"
        v-model:parti="parti"
        v-model:type="type"
        v-model:pop-min="popMin"
        v-model:has-web="hasWeb"
        v-model:has-fb="hasFb"
        :regions="REGIONS"
        :departements="DEPARTEMENTS"
        :partis="PARTIS"
        :count="filtered.length"
        @reset="resetFilters"
      >
        <template #actions>
          <div
            class="flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800"
          >
            <button
              v-for="v in VIEWS"
              :key="v.key"
              type="button"
              class="rounded-md px-4 py-2 text-sm transition"
              :class="
                view === v.key
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              "
              @click="view = v.key"
            >
              {{ v.label }}
            </button>
          </div>
        </template>
      </CollectivitesCommunesFilters>
    </section>

    <!-- ─── Résultats ──────────────────────────────────────────────── -->
    <section class="mx-auto mt-8 max-w-7xl px-4">
      <div v-if="view === 'cartes'" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <CollectivitesCommuneCard v-for="c in filtered" :key="c.slug" :commune="c" />
      </div>
      <CollectivitesCommunesTable v-else-if="view === 'liste'" :communes="filtered" />
      <CollectivitesCommunesMap v-else :communes="filtered" height="72vh" />

      <p
        v-if="filtered.length === 0"
        class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        Aucune commune ne correspond à ces critères.
      </p>
    </section>
  </div>
</template>
