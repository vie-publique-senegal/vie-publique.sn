<script setup lang="ts">
import { formatNumber } from '#shared/format';
import { normalizeGeoName } from '#shared/geo-name';
import { useCollectionPageSeo } from '~/composables/collectivites/useCollectionPageSeo';
import { useCommunesGeo } from '~/composables/collectivites/useCommunesGeo';

const { siteUrl } = useSiteMetadata();
const route = useRoute();
const router = useRouter();

// ── Référentiel géo réel (Directus) - cf. server/utils/collectivites-geo.ts
// `departements` (liste plate des 46) ne sert qu'au compteur du repère qui ouvre
// le hub : le SÉLECTEUR de département, lui, est dérivé de la région choisie
// (drill-down, cf. plus bas).
const { communes, regions, departements, total } = useCommunesGeo();

// ── État UI initialisé depuis route.query DE FAÇON SYNCHRONE (règle SSR CLAUDE.md)
type ViewMode = 'cartes' | 'liste' | 'carte';
const VIEWS: { key: ViewMode; label: string; icon: string }[] = [
  { key: 'cartes', label: 'Cartes', icon: 'i-heroicons-squares-2x2-20-solid' },
  { key: 'liste', label: 'Liste', icon: 'i-heroicons-list-bullet-20-solid' },
  { key: 'carte', label: 'Carte', icon: 'i-heroicons-map-20-solid' },
];

const view = ref<ViewMode>(
  VIEWS.some((v) => v.key === route.query.vue) ? (route.query.vue as ViewMode) : 'cartes',
);
const q = ref((route.query.q as string) || '');
const region = ref((route.query.region as string) || '');
const departement = ref((route.query.departement as string) || '');
const type = ref((route.query.type as string) || '');
const page = ref(Math.max(1, parseInt(route.query.page as string) || 1));

// Nombre d'éléments par page pour les vues « Cartes » et « Liste ». La vue
// « Carte » n'est pas paginée : une carte tronquée n'aurait pas de sens.
const PAGE_SIZE = 24;

// Miroir de l'état dans l'URL (filtres partageables)
watch([view, q, region, departement, type, page], () => {
  router.replace({
    query: {
      ...(view.value !== 'cartes' && { vue: view.value }),
      ...(q.value && { q: q.value }),
      ...(region.value && { region: region.value }),
      ...(departement.value && { departement: departement.value }),
      ...(type.value && { type: type.value }),
      ...(page.value > 1 && { page: String(page.value) }),
    },
  });
});

// Recherche insensible aux accents (« thies » doit trouver « Thiès »).
// `normalizeGeoName` replie aussi tirets et espaces multiples des deux côtés de
// la comparaison : le référentiel contient des noms à double espace, qu'une
// simple suppression d'accents ne rattrapait pas (« Ousmane  SARR »).
const normalize = (value: string) => normalizeGeoName(value);

const filtered = computed(() => {
  const query = normalize(q.value.trim());
  return communes.value.filter((c) => {
    if (query) {
      const hay = normalize(
        `${c.nom} ${c.maire?.nom ?? ''} ${c.region} ${c.departement} ${c.arrondissement ?? ''}`,
      );
      if (!hay.includes(query)) return false;
    }
    if (region.value && c.region !== region.value) return false;
    if (departement.value && c.departement !== departement.value) return false;
    if (type.value && c.type !== type.value) return false;
    return true;
  });
});

// ── Drill-down : le sélecteur de département ne propose que les départements
// de la région choisie (46 départements bruts sont inexploitables au doigt).
const departementsDisponibles = computed(() => {
  const source = region.value
    ? communes.value.filter((c) => c.region === region.value)
    : communes.value;
  return [...new Set(source.map((c) => c.departement).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'fr'),
  );
});

// Changer de région invalide un département d'une autre région : on le vide
// plutôt que de laisser un couple région/département qui ne renvoie rien.
watch(region, () => {
  if (departement.value && !departementsDisponibles.value.includes(departement.value)) {
    departement.value = '';
  }
});

// Niveaux du référentiel : la « commune d'arrondissement » n'existe pas, les
// communes de Dakar/Pikine/Guédiawaye/Rufisque/Thiès sont des communes de plein
// exercice rattachées à une ville.
const TYPES = ['Commune', 'Ville'];

// Les trois sélecteurs rendus en pilules dans l'en-tête collant.
const FILTRES = [
  { key: 'region', label: 'Région', model: region, options: computed(() => regions.value) },
  {
    key: 'departement',
    label: 'Département',
    model: departement,
    options: departementsDisponibles,
  },
  { key: 'type', label: 'Statut', model: type, options: computed(() => TYPES) },
];

const hasActiveFilters = computed(() =>
  Boolean(region.value || departement.value || type.value || q.value),
);

// Tout changement de critère renvoie en page 1 : rester en page 7 d'un jeu de
// résultats qui n'en compte plus que 2 afficherait « aucun résultat » à tort.
watch([q, region, departement, type], () => {
  page.value = 1;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));

// Page hors limites (?page=999, ou filtrage qui réduit le jeu) : le recalage doit
// être SYNCHRONE, pas dans un watch - un watch ne s'exécute pas pendant le rendu
// serveur, qui afficherait donc « aucun résultat » à tort (règle « listes
// paginées » du CLAUDE.md). Le watch ci-dessous ne fait que réaligner l'URL.
const safePage = computed(() => Math.min(Math.max(1, page.value), totalPages.value));

watch([totalPages, page], () => {
  if (page.value !== safePage.value) page.value = safePage.value;
});

const paginated = computed(() =>
  filtered.value.slice((safePage.value - 1) * PAGE_SIZE, safePage.value * PAGE_SIZE),
);

// Changer de page remonte en haut : sinon on atterrit au milieu de la nouvelle
// liste, à hauteur des boutons de pagination. Défilement animé, sauf si le
// système demande de réduire les animations (accessibilité).
watch(page, () => {
  if (import.meta.server) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
});

const resetFilters = () => {
  q.value = '';
  region.value = '';
  departement.value = '';
  type.value = '';
  page.value = 1;
};

const totalPopulation = computed(() =>
  communes.value.reduce((sum, c) => sum + (c.population ?? 0), 0),
);

// Les repères qui correspondent à un hub SONT l'entrée du hub : « 14 régions »
// et « 46 départements » sont des liens. Les deux autres ne mènent nulle part —
// cette page EST la liste des 558 collectivités, et la population n'a pas de page.
const reperes = computed(() => [
  { key: 'total', value: total.value, label: 'collectivités référencées' },
  {
    key: 'regions',
    value: regions.value.length,
    label: 'régions',
    to: '/collectivites-territoriales/regions',
  },
  {
    key: 'departements',
    value: departements.value.length,
    label: 'départements',
    to: '/collectivites-territoriales/departements',
  },
  { key: 'population', value: totalPopulation.value, label: 'habitants (RGPH 2023)' },
]);

// ── SEO (en dernier - helpers et computeds déclarés avant) ─────────
useCollectionPageSeo({
  key: 'ld-collectivites',
  title: 'Collectivités territoriales du Sénégal : annuaire des communes',
  description:
    'Recherchez une commune, un maire, une région. Fiches complètes des collectivités territoriales du Sénégal : gouvernance locale, conseil municipal, budgets et documents officiels.',
  url: `${siteUrl}/collectivites-territoriales`,
  items: () =>
    communes.value.map((c) => ({
      name: c.nom,
      url: `${siteUrl}/collectivites-territoriales/communes/${c.slug}`,
    })),
  // Échantillon : sérialiser les 558 collectivités alourdirait le HTML de ~40 Ko
  // sans bénéfice (l'exhaustivité de l'indexation passe par le sitemap).
  maxItems: 100,
  keywords: [
    'collectivités territoriales Sénégal',
    'communes du Sénégal',
    'maires du Sénégal',
    'conseil municipal Sénégal',
    'mairie Sénégal',
  ],
});
</script>

<template>
  <div class="min-h-screen pb-16">
    <div class="container mx-auto px-4 pt-2">
      <AppBreadcrumb :items="[{ label: 'Collectivités territoriales' }]" />
    </div>

    <!-- ─── En-tête sticky (titre + compteur + recherche) ──────────── -->
    <header
      class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95"
    >
      <div class="mx-auto max-w-7xl px-4 py-3">
        <div class="flex items-center justify-between">
          <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            Collectivités territoriales
          </h1>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ formatNumber(filtered.length) }} commune{{ filtered.length > 1 ? 's' : '' }}
          </span>
        </div>
        <p class="mt-1 hidden text-sm text-gray-500 dark:text-gray-400 sm:block">
          Fiches complètes de chaque commune : gouvernance locale, conseil municipal, données
          territoriales, budget, projets et documents publics.
        </p>

        <CollectivitesSearchInput
          v-model="q"
          placeholder="Rechercher une commune, un maire, une région…"
          class="mt-3"
        />

        <!-- Filtres + bascule de vue, dans l'en-tête collant : on doit pouvoir
             filtrer et changer de vue à n'importe quel moment du défilement,
             sans remonter. Les filtres défilent horizontalement sur mobile. -->
        <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div
            class="scrollbar-hide -mx-4 flex shrink-0 items-center gap-2 overflow-x-auto px-4 py-1"
          >
            <div v-for="f in FILTRES" :key="f.key" class="relative shrink-0">
              <select
                :value="f.model.value"
                :aria-label="f.label"
                class="appearance-none rounded-full border-0 bg-gray-100 py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-500"
                @change="f.model.value = ($event.target as HTMLSelectElement).value"
              >
                <option value="">{{ f.label }} : toutes</option>
                <option v-for="o in f.options.value" :key="o" :value="o">{{ o }}</option>
              </select>
              <UIcon
                name="i-heroicons-chevron-down"
                class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
              />
            </div>

            <button
              v-if="hasActiveFilters"
              type="button"
              class="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-gray-500 underline-offset-2 hover:underline dark:text-gray-400"
              @click="resetFilters"
            >
              Réinitialiser
            </button>
          </div>

          <div
            class="inline-flex w-full rounded-lg p-0.5 ring-1 ring-gray-200 dark:ring-gray-700 sm:w-auto"
            role="tablist"
            aria-label="Mode d'affichage"
          >
            <button
              v-for="v in VIEWS"
              :key="v.key"
              type="button"
              role="tab"
              :aria-selected="view === v.key"
              class="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition sm:flex-none sm:px-4"
              :class="
                view === v.key
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              "
              @click="view = v.key"
            >
              <UIcon :name="v.icon" class="h-4 w-4 shrink-0" />
              {{ v.label }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- ─── Repères chiffrés ───────────────────────────────────────── -->
    <section class="mx-auto max-w-7xl px-4">
      <CollectivitesStatStrip :items="reperes" />
    </section>

    <!-- ─── Résultats ──────────────────────────────────────────────── -->
    <section class="mx-auto mt-4 max-w-7xl px-4">
      <div v-if="view === 'cartes'" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <CollectivitesCommuneCard v-for="c in paginated" :key="c.slug" :commune="c" />
      </div>
      <CollectivitesCommunesTable v-else-if="view === 'liste'" :communes="paginated" />
      <!-- La carte reçoit l'ensemble filtré : paginer des points serait absurde. -->
      <CollectivitesCommunesMap v-else :communes="filtered" height="72vh" />

      <p
        v-if="filtered.length === 0"
        class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        Aucune commune ne correspond à ces critères.
      </p>

      <!-- Pagination (vues Cartes et Liste) - même style que /documents/public -->
      <div v-else-if="view !== 'carte' && totalPages > 1" class="mt-8 flex justify-center">
        <UPagination
          v-model="page"
          :total="filtered.length"
          :page-count="PAGE_SIZE"
          size="sm"
          :ui="{
            wrapper: 'flex items-center gap-1',
            rounded: 'rounded-lg',
          }"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Rangée de filtres défilable sans barre visible (même règle que /documents/public). */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
