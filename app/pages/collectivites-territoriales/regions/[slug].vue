<script setup lang="ts">
import { formatNumber } from '#shared/format';
import { normalizeGeoName } from '#shared/geo-name';
import { useRegionGeo } from '~/composables/collectivites/useRegionsGeo';

// Page d'une région : ses départements (le pas suivant) puis toutes ses
// collectivités (ce que cherche « communes de la région de … »). Au plus 57
// lignes : tout tient dans le HTML indexé, sans pagination.
const route = useRoute();
const { siteName, siteUrl, themeColor } = useSiteMetadata();

const slug = computed(() => route.params.slug as string);

const { region, departements, communes, autresRegions } = await useRegionGeo(slug);

if (!region.value) {
  throw createError({ statusCode: 404, statusMessage: 'Région introuvable', fatal: true });
}

const nom = computed(() => region.value?.nom ?? '');

// ── Recherche dans la région (département, commune, maire) ────────
// `normalizeGeoName` plutôt qu'un repli d'accents maison : il replie AUSSI les
// tirets et les espaces multiples des deux côtés de la comparaison. Sans ça,
// « Ousmane SARR » ne trouvait pas « Ousmane  SARR » (double espace en base) et
// « joal-fadhiouth » ne trouvait pas « Joal-Fadhiouth ».
const router = useRouter();
const normalize = (value: string) => normalizeGeoName(value);

// État lu depuis `route.query` DE FAÇON SYNCHRONE : le rendu serveur d'un
// `?q=…` partagé doit déjà être filtré (règle « listes filtrées & SSR »).
const q = ref((route.query.q as string) || '');
const query = computed(() => normalize(q.value.trim()));

watch(q, () => {
  router.replace({ query: { ...(q.value && { q: q.value }) } });
});

const communesFiltrees = computed(() => {
  if (!query.value) return communes.value;
  return communes.value.filter((c) =>
    normalize(`${c.nom} ${c.departement} ${c.arrondissement ?? ''} ${c.maire?.nom ?? ''}`).includes(
      query.value,
    ),
  );
});

// Un département reste affiché s'il porte le terme cherché ou si l'une de ses
// communes y répond : les deux tables racontent alors la même recherche.
const departementsFiltres = computed(() => {
  if (!query.value) return departements.value;
  const slugsTrouves = new Set(communesFiltrees.value.map((c) => c.departementSlug));
  return departements.value.filter(
    (d) => normalize(d.nom).includes(query.value) || slugsTrouves.has(d.slug),
  );
});

const reperes = computed(() => {
  const reg = region.value;
  if (!reg) return [];
  return [
    {
      key: 'departements',
      valeur: formatNumber(reg.nbDepartements),
      libelle: ` département${reg.nbDepartements > 1 ? 's' : ''}`,
    },
    {
      key: 'collectivites',
      valeur: formatNumber(reg.nbCollectivites),
      libelle: ` collectivité${reg.nbCollectivites > 1 ? 's' : ''}`,
    },
    ...(reg.population !== null
      ? [
          {
            key: 'population',
            valeur: formatNumber(reg.population),
            // Cumul explicitement partiel quand toutes les communes ne sont pas
            // renseignées : mieux vaut le dire qu'afficher un total qui paraît
            // complet.
            libelle:
              reg.avecPopulation === reg.nbCollectivites
                ? ` habitants (RGPH ${reg.populationAnnee})`
                : ` habitants (RGPH ${reg.populationAnnee}, sur ${reg.avecPopulation} des ${reg.nbCollectivites} collectivités)`,
          },
        ]
      : []),
  ];
});

// « Maire » ne s'affiche que si la région a au moins un maire au référentiel.
const colonnesCommunes = computed<('departement' | 'maire' | 'population')[]>(() =>
  communes.value.some((c) => c.maire)
    ? ['departement', 'maire', 'population']
    : ['departement', 'population'],
);

// ── SEO (en dernier — helpers et computeds déclarés avant) ─────────
const pageUrl = computed(
  () => `${siteUrl}/collectivites-territoriales/regions/${region.value?.slug}`,
);
const pageTitle = computed(() => `Région de ${nom.value} : départements et communes`);
const pageDescription = computed(() => {
  const reg = region.value;
  if (!reg) return '';
  const habitants =
    reg.population !== null ? `, ${formatNumber(reg.population)} habitants recensés` : '';
  return `Les ${reg.nbDepartements} départements et ${reg.nbCollectivites} collectivités de la région de ${reg.nom}${habitants}. Maire et population de chaque commune.`;
});

useSeoMeta({
  title: pageTitle,
  ogTitle: pageTitle,
  description: pageDescription,
  ogDescription: pageDescription,
  ogUrl: pageUrl,
  ogType: 'website',
  twitterCard: 'summary_large_image',
});

const collectionPageSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: pageTitle.value,
  description: pageDescription.value,
  url: pageUrl.value,
  inLanguage: 'fr-SN',
  isPartOf: { '@type': 'WebSite', name: siteName, url: siteUrl },
  mainEntity: {
    '@type': 'ItemList',
    // Décrit ce qui est réellement affiché : toutes les communes sans recherche,
    // les résultats sinon.
    numberOfItems: communesFiltrees.value.length,
    itemListElement: communesFiltrees.value.map((commune, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: commune.nom,
      url: `${siteUrl}/collectivites-territoriales/communes/${commune.slug}`,
    })),
  },
}));

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: [{ rel: 'canonical', href: pageUrl }],
  meta: [
    // Une vue filtrée (`?q=…`) est un résultat de recherche : `noindex, follow`
    // (règle SEO §10), le canonical ramenant les signaux sur la page propre.
    { name: 'robots', content: () => (q.value ? 'noindex, follow' : 'index, follow') },
    { name: 'theme-color', content: themeColor },
  ],
  script: [
    {
      key: 'ld-region',
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(collectionPageSchema.value)),
    },
  ],
});
</script>

<template>
  <div v-if="region" class="min-h-screen pb-16">
    <div class="mx-auto max-w-7xl px-4 pt-2">
      <AppBreadcrumb
        :items="[
          { label: 'Collectivités territoriales', to: '/collectivites-territoriales' },
          { label: 'Régions', to: '/collectivites-territoriales/regions' },
          { label: region.nom },
        ]"
      />
    </div>

    <header class="mx-auto max-w-7xl px-4 pt-4">
      <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
        Région de {{ region.nom }}
      </h1>
      <p class="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Les {{ formatNumber(region.nbDepartements) }} départements et
        {{ formatNumber(region.nbCollectivites) }} collectivités de la région de {{ region.nom }}.
        Cliquez sur une commune pour ouvrir sa fiche : maire, population, contact de la mairie.
      </p>

      <!-- Recherche dans la région : département, commune, arrondissement ou
           maire. Les deux tables ci-dessous s'accordent sur le même terme. -->
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
          :placeholder="`Rechercher un département, une commune, un maire de la région de ${region.nom}…`"
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
    </header>

    <section class="mx-auto max-w-7xl px-4">
      <div
        class="mt-4 flex flex-wrap gap-6 border-b border-gray-100 py-4 text-sm dark:border-gray-700"
      >
        <div v-for="repere in reperes" :key="repere.key">
          <span class="font-bold text-gray-900 dark:text-white">{{ repere.valeur }}</span>
          <span class="text-gray-500 dark:text-gray-400">{{ repere.libelle }}</span>
        </div>

        <div v-if="q" class="text-gray-500 dark:text-gray-400">
          <span class="font-bold text-gray-900 dark:text-white">{{
            formatNumber(communesFiltrees.length)
          }}</span>
          commune{{ communesFiltrees.length > 1 ? 's' : '' }} trouvée{{
            communesFiltrees.length > 1 ? 's' : ''
          }}
        </div>
      </div>
    </section>

    <section v-if="departementsFiltres.length" class="mx-auto mt-6 max-w-7xl px-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        Départements de la région de {{ region.nom }}
      </h2>
      <CollectivitesDepartementsTable
        :departements="departementsFiltres"
        :columns="['collectivites', 'population']"
        class="mt-4"
      />
    </section>

    <section class="mx-auto mt-10 max-w-7xl px-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        Communes de la région de {{ region.nom }}
      </h2>

      <CollectivitesCommunesTable
        v-if="communesFiltrees.length"
        :communes="communesFiltrees"
        :columns="colonnesCommunes"
        class="mt-4"
      />

      <p v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {{
          communes.length === 0
            ? "Aucune collectivité n'est rattachée à cette région dans le référentiel."
            : 'Aucune commune de cette région ne correspond à cette recherche.'
        }}
      </p>
    </section>

    <!-- Maillage interne : les autres régions. -->
    <section v-if="autresRegions.length" class="mx-auto mt-10 max-w-7xl px-4">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Autres régions du Sénégal
      </h2>
      <div class="mt-3 flex flex-wrap gap-2">
        <NuxtLink
          v-for="autre in autresRegions"
          :key="autre.slug"
          :to="`/collectivites-territoriales/regions/${autre.slug}`"
          class="text-primary-600 dark:text-primary-400 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          {{ autre.nom }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
