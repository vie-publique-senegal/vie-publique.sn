<script setup lang="ts">
import type { DepartementAvecCommunes, DepartementGeo } from '~~/types/collectivite';
import { formatNumber } from '#shared/format';
import { normalizeGeoName } from '#shared/geo-name';
import { useDepartementsGeo } from '~/composables/collectivites/useDepartementsGeo';

// Hub des départements : page pivot entre l'annuaire (558 collectivités, filtres
// en query params non indexables) et les fiches communes. Elle donne 46 URLs
// stables et crawlables, chacune menant à une dizaine de fiches.
const { siteName, siteUrl, themeColor } = useSiteMetadata();

const route = useRoute();
const router = useRouter();

const { departements, total, totalCollectivites } = useDepartementsGeo();

// Recherche insensible aux accents (« thies » doit trouver « Thiès »).
// `normalizeGeoName` replie aussi tirets et espaces multiples des deux côtés de
// la comparaison — le référentiel contient des noms à double espace.
const normalize = (value: string) => normalizeGeoName(value);

// État lu depuis `route.query` DE FAÇON SYNCHRONE : le rendu serveur d'un
// `?q=…` partagé doit déjà être filtré (règle « listes filtrées & SSR »).
const q = ref((route.query.q as string) || '');
const query = computed(() => normalize(q.value.trim()));

// Miroir dans l'URL : une recherche se partage et survit à un rechargement.
watch(q, () => {
  router.replace({ query: { ...(q.value && { q: q.value }) } });
});

/** Communes (ou maires) du département qui répondent à la recherche en cours. */
const communesTrouvees = (departement: DepartementAvecCommunes) =>
  query.value
    ? departement.communes.filter((c) =>
        normalize(`${c.nom} ${c.maire ?? ''}`).includes(query.value),
      )
    : [];

// Chercher « Ndiaganiao » ou un nom de maire doit ramener SON département : le
// hub est aussi une façon de retrouver une commune quand on ne sait pas où elle
// est rattachée.
const filtered = computed(() => {
  if (!query.value) return departements.value;
  return departements.value.filter(
    (d) =>
      normalize(`${d.nom} ${d.region}`).includes(query.value) || communesTrouvees(d).length > 0,
  );
});

const HINT_MAX = 4;

// Quand la recherche a matché par commune, la ligne dit laquelle : sans ça, un
// « Mbour » en réponse à « Ndiaganiao » paraîtrait arbitraire. Indexé par slug
// pour que la table n'ait pas à connaître le type enrichi du hub.
const hints = computed(() => {
  const parSlug = new Map<string, string>();
  if (!query.value) return parSlug;

  for (const departement of filtered.value) {
    const trouvees = communesTrouvees(departement);
    if (trouvees.length === 0) continue;
    const noms = trouvees.slice(0, HINT_MAX).map((c) => c.nom);
    const reste = trouvees.length - noms.length;
    parSlug.set(
      departement.slug,
      `${noms.join(', ')}${reste > 0 ? ` et ${reste} autre${reste > 1 ? 's' : ''}` : ''}`,
    );
  }
  return parSlug;
});

const populationTotale = computed(() =>
  departements.value.reduce((sum, d) => sum + (d.population ?? 0), 0),
);

// ── SEO (en dernier - helpers et computeds déclarés avant) ─────────
const pageTitle = 'Départements du Sénégal : les communes de chaque département';
const pageDescription =
  'Les 46 départements du Sénégal, région par région. Pour chaque département : la liste de ses communes, leur maire et leur population au recensement 2023.';
const pageUrl = `${siteUrl}/collectivites-territoriales/departements`;

useSeoMeta({
  title: pageTitle,
  ogTitle: pageTitle,
  description: pageDescription,
  ogDescription: pageDescription,
  ogUrl: pageUrl,
  ogType: 'website',
  twitterCard: 'summary_large_image',
});

// Nœud d'entité propre à la page (le BreadcrumbList est émis par <AppBreadcrumb>).
// Il décrit ce qui est RÉELLEMENT affiché : sans recherche, les 46 départements.
const collectionPageSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: pageTitle,
  description: pageDescription,
  url: pageUrl,
  inLanguage: 'fr-SN',
  isPartOf: { '@type': 'WebSite', name: siteName, url: siteUrl },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: filtered.value.length,
    // 46 items : la liste tient entière, contrairement à l'annuaire des communes.
    itemListElement: filtered.value.map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `Département de ${d.nom}`,
      url: `${siteUrl}/collectivites-territoriales/departements/${d.slug}`,
    })),
  },
}));

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: [{ rel: 'canonical', href: pageUrl }],
  meta: [
    // Une vue filtrée (`?q=…`) est un résultat de recherche : `noindex, follow`
    // (règle SEO §10 du CLAUDE.md), le canonical ramenant les signaux sur la
    // page propre. Le hub sans paramètre reste, lui, pleinement indexable.
    { name: 'robots', content: () => (q.value ? 'noindex, follow' : 'index, follow') },
    { name: 'theme-color', content: themeColor },
  ],
  script: [
    {
      key: 'ld-departements',
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(collectionPageSchema.value)),
    },
  ],
});
</script>

<template>
  <div class="min-h-screen pb-16">
    <div class="mx-auto max-w-7xl px-4 pt-2">
      <AppBreadcrumb
        :items="[
          { label: 'Collectivités territoriales', to: '/collectivites-territoriales' },
          { label: 'Départements' },
        ]"
      />
    </div>

    <header class="mx-auto max-w-7xl px-4 pt-4">
      <!-- Même échelle de titre que l'annuaire du module : les deux pages sont
           du même rang, un H1 plus gros ici les ferait paraître hiérarchisées. -->
      <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
        Les départements du Sénégal
      </h1>
      <p class="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Choisissez un département pour voir la liste de ses communes, leur maire et leur population.
        Le découpage et les populations proviennent du référentiel officiel (recensement 2023).
      </p>

      <!-- Recherche : département, région, mais aussi commune et maire - on
           retrouve ainsi le département d'une commune sans savoir où elle est
           rattachée. -->
      <div class="group relative mt-4">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <UIcon
            name="i-heroicons-magnifying-glass-20-solid"
            class="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-gray-500"
          />
        </div>
        <input
          type="search"
          :value="q"
          placeholder="Rechercher un département, une région, une commune, un maire…"
          class="block w-full rounded-xl border-0 bg-gray-100 py-3 pl-11 pr-10 text-sm text-gray-900 ring-1 ring-transparent transition-all placeholder:text-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-gray-800/80 dark:focus:ring-gray-500 sm:py-2.5"
          @input="q = ($event.target as HTMLInputElement).value"
        />
        <button
          v-if="q"
          type="button"
          aria-label="Effacer la recherche"
          class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          @click="q = ''"
        >
          <span
            class="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600"
          >
            <UIcon
              name="i-heroicons-x-mark-20-solid"
              class="h-3.5 w-3.5 text-gray-600 dark:text-gray-300"
            />
          </span>
        </button>
      </div>

      <!-- Repères chiffrés (même bandeau que l'annuaire) -->
      <div
        class="mt-4 flex flex-wrap gap-6 border-b border-gray-100 py-4 text-sm dark:border-gray-700"
      >
        <div>
          <span class="font-bold text-gray-900 dark:text-white">{{ formatNumber(total) }}</span>
          <span class="text-gray-500 dark:text-gray-400"> départements</span>
        </div>
        <div>
          <span class="font-bold text-gray-900 dark:text-white">{{
            formatNumber(totalCollectivites)
          }}</span>
          <span class="text-gray-500 dark:text-gray-400"> collectivités rattachées</span>
        </div>
        <div>
          <span class="font-bold text-gray-900 dark:text-white">{{
            formatNumber(populationTotale)
          }}</span>
          <span class="text-gray-500 dark:text-gray-400"> habitants (RGPH 2023)</span>
        </div>
        <div v-if="q" class="text-gray-500 dark:text-gray-400">
          <span class="font-bold text-gray-900 dark:text-white">{{
            formatNumber(filtered.length)
          }}</span>
          résultat{{ filtered.length > 1 ? 's' : '' }}
        </div>
      </div>
    </header>

    <section class="mx-auto mt-6 max-w-7xl px-4">
      <CollectivitesDepartementsTable
        :departements="filtered"
        :hint="(d: DepartementGeo) => hints.get(d.slug) ?? null"
      />

      <p
        v-if="filtered.length === 0"
        class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        {{
          departements.length === 0
            ? "Le référentiel des départements n'est pas disponible pour le moment."
            : 'Aucun département ne correspond à cette recherche.'
        }}
      </p>
    </section>
  </div>
</template>
