<script setup lang="ts">
/**
 * Annuaire des personnalités : hub (`/personnalites-senegal`) ET une sous-page par catégorie
 * de fonction (`/personnalites-senegal/ministre`, `/directeur-general`…). La base fait foi :
 * toute catégorie publiée de `public_position_categories` a sa page, sans changement de code ;
 * titre, meta et « Rôle et attributions » viennent de ses champs (repli générique si vides).
 */
import {
  fromCategoryUrlSlug,
  getPersonCategoryPath,
  type PositionCategoryInfo,
} from '#shared/personnalites-categories';
import {
  MANDATE_FILTER_LABELS,
  OFFICE_STATUS_FILTER_LABELS,
  type MandateFilter,
  type OfficeStatusFilter,
  type PublicPerson,
} from '~~/types/public-person';

definePageMeta({
  // Hub ↔ sous-page partagent ce fichier : remonter le composant au changement de chemin
  // (la catégorie fixée est lue au setup), pas au changement de query (filtres, pagination).
  key: (route) => route.path,
});

const { siteName, siteUrl, keywords, themeColor } = useSiteMetadata();
const route = useRoute();
const { $dateformat } = useNuxtApp();

const HUB_PATH = '/personnalites-senegal';

// Slug Directus de la sous-page (`directeur-general` → `directeur_general`), null sur le hub
const categorySlug = route.params.categorie ? fromCategoryUrlSlug(route.params.categorie) : null;
if (route.params.categorie && !categorySlug) {
  throw createError({ statusCode: 404, statusMessage: 'Page introuvable', fatal: true });
}

// Ancien filtre `?category=<slug>` → 301 vers la sous-page (en gardant les autres filtres)
const legacyCategory = route.query.category;
if (!categorySlug && typeof legacyCategory === 'string' && /^[a-z0-9_]+$/.test(legacyCategory)) {
  const { category: _category, ...query } = route.query;
  await navigateTo(
    { path: getPersonCategoryPath(legacyCategory)!, query },
    { redirectCode: 301, replace: true },
  );
}

// Référentiel des catégories (la base fait foi)
const { data: categories } = await useFetch<PositionCategoryInfo[]>(
  '/api/public-persons/categories',
  { key: 'position-categories' },
);
const categoryBySlug = computed(
  () => new Map((categories.value ?? []).map((category) => [category.slug, category])),
);
const category = computed(() =>
  categorySlug ? (categoryBySlug.value.get(categorySlug) ?? null) : null,
);
// Catégorie absente du référentiel → 404 (si le référentiel n'a pas pu être lu, on affiche
// quand même la liste filtrée plutôt qu'une fausse 404)
if (categorySlug && categories.value && !category.value) {
  throw createError({ statusCode: 404, statusMessage: 'Catégorie introuvable', fatal: true });
}
const isCategoryPage = !!categorySlug;

const basePath = getPersonCategoryPath(categorySlug) ?? HUB_PATH;
const url = `${siteUrl}${basePath}`;
const image = `${siteUrl}/nomination-3.png`;

const {
  persons,
  loading,
  error,
  currentPage,
  searchQuery,
  filterCategory,
  filterGender,
  filterMandate,
  filterStatus,
  totalItems,
  totalPages,
  totalsByCategory,
  totalsByGender,
  totalsByMandate,
  totalsByStatus,
  totalPersons,
  hasActiveFilters,
  resetFilters,
  setCurrentPage,
  setSearchQuery,
  setFilterGender,
  setFilterMandate,
  setFilterStatus,
} = usePublicPersons({ category: categorySlug ?? undefined });

// Libellé pluriel de la catégorie (titre), libellé singulier à défaut
const categoryLabel = computed(() => {
  if (!categorySlug) return '';
  const info = category.value ?? null;
  return info?.label_plural || info?.label || totalsByCategory.value[categorySlug]?.label || '';
});

// Nombre de personnes de la catégorie courante (0 tant que les stats ne sont pas chargées)
const categoryCount = computed(() =>
  categorySlug ? totalsByCategory.value[categorySlug]?.count || 0 : 0,
);

// Compteurs chargés (évite un noindex à tort tant qu'ils ne sont pas là)
const statsLoaded = computed(() => Object.keys(totalsByCategory.value).length > 0);

// Rôle et attributions (`role_description`), rédigé au CMS ; rien n'est affiché s'il est vide
const roleDescription = computed(() => category.value?.role_description ?? null);

// SEO — titre sans la marque (ajoutée par le titleTemplate). Champs `seo_*` de la catégorie,
// repli générique si vides.
const heading = computed(() =>
  isCategoryPage
    ? categoryLabel.value || 'Personnalités publiques'
    : 'Annuaire des personnalités publiques du Sénégal',
);
const title = computed(() =>
  isCategoryPage
    ? category.value?.seo_title || `${heading.value} au Sénégal : liste et nominations`
    : 'Annuaire des personnalités publiques au Sénégal',
);
const description = computed(() => {
  if (!isCategoryPage) {
    return 'Annuaire complet des personnalités publiques du Sénégal : ministres, directeurs généraux, PCA, ambassadeurs, gouverneurs et hauts fonctionnaires. Profils, fonctions et nominations.';
  }
  if (category.value?.seo_description) return category.value.seo_description;
  const count = categoryCount.value ? ` : ${categoryCount.value} personnalités` : '';
  return `${heading.value} au Sénégal${count}, avec leur fonction, leur structure et leur date de nomination.`;
});

// Pastilles de catégorie : toutes des liens vers leur sous-page (URL indexable) ;
// la pastille active ramène au hub. Le statut « plus en poste » est conservé (le compteur
// de la pastille porte sur lui) ; la vue par défaut garde une URL sans paramètre.
const chipQuery = computed(() =>
  filterStatus.value === 'former' ? { statut: filterStatus.value } : {},
);
const categoryChips = computed(() =>
  Object.entries(totalsByCategory.value).map(([slug, data]) => {
    const info = categoryBySlug.value.get(slug);
    const active = filterCategory.value === slug;
    return {
      slug,
      label: info?.label_plural || info?.label || data.label,
      count: data.count,
      active,
      to: { path: active ? HUB_PATH : getPersonCategoryPath(slug)!, query: chipQuery.value },
    };
  }),
);

// Pastille active hors écran (rangée défilante) → la ramener dans la zone visible, une fois
// la rangée rendue (elle n'existe pas tant que les compteurs ne sont pas chargés)
const categoryNav = ref<HTMLElement | null>(null);
const scrollActiveChipIntoView = () => {
  const nav = categoryNav.value;
  const chip = nav?.querySelector<HTMLElement>('[data-active-chip]');
  if (!nav || !chip) return;
  nav.scrollTo({ left: chip.offsetLeft - (nav.clientWidth - chip.offsetWidth) / 2 });
};
onMounted(() => {
  watch(
    () => categoryChips.value.length,
    () => nextTick(() => requestAnimationFrame(scrollActiveChipIntoView)),
    { immediate: true },
  );
});

// Changement de page : remonter en douceur en haut de la liste
const goToPage = (page: number) => {
  setCurrentPage(page);
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' });
};

// URL vers la fiche détail (déclarée avant le schéma qui l'utilise — anti-TDZ)
const getDetailUrl = (person: { id: number | string; slug?: string | null; full_name: string }) => {
  const slug =
    person.slug ||
    person.full_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  // URL propre (sans les filtres de la liste) : une seule URL crawlable par fiche.
  // Le retour à la liste filtrée passe par usePersonsListMemory (sessionStorage).
  return `/personnalites/${person.id}/${slug}`;
};

// Mémorise les filtres actifs pour le bouton « Retour » des fiches (client uniquement)
const { save: saveListUrl } = usePersonsListMemory();
watch(
  () => route.query,
  (q) => saveListUrl(basePath, q),
  { immediate: true, deep: true },
);

// Le total affiché porte sur le statut sélectionné (par défaut : en poste)
const totalCountSuffix = computed(() =>
  filterStatus.value === 'current' ? ' en poste' : ' plus en poste',
);

// Total : pas la somme hommes + femmes (les personnes sans `sexe`, ex. maires, en seraient exclues)
const totalCount = totalPersons;

// Reset page sur changement de recherche/filtres. Sur le hub, une recherche porte sur tout
// l'annuaire ; sur une sous-page, elle reste dans la catégorie.
watch(searchQuery, () => {
  if (!isCategoryPage) filterCategory.value = 'all';
  filterGender.value = 'all';
  currentPage.value = 1;
});

watch([filterCategory, filterGender, filterMandate, filterStatus], () => {
  currentPage.value = 1;
  scrollToTop();
});

// Changer de filtre depuis le milieu de la liste ramène en haut, en douceur (instantané si
// l'utilisateur a demandé à réduire les animations)
function scrollToTop() {
  if (!import.meta.client || window.scrollY === 0) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}

// Liste déroulante genre (libellé + compteur)
const genderOptions = computed(() => [
  { value: 'all', label: 'Hommes et femmes' },
  { value: 'male', label: `Hommes (${totalsByGender.value.maleCount})` },
  { value: 'female', label: `Femmes (${totalsByGender.value.femaleCount})` },
]);

// Liste déroulante en poste / plus en poste (dernière fonction connue en cours ou terminée)
const statusOptions = computed(() => [
  {
    value: 'current' as const,
    label: `${OFFICE_STATUS_FILTER_LABELS.current} (${totalsByStatus.value.current})`,
  },
  {
    value: 'former' as const,
    label: `${OFFICE_STATUS_FILTER_LABELS.former} (${totalsByStatus.value.former})`,
  },
]);

// Liste déroulante élu / nommé : « Non classés » n'apparaît que s'il en reste (le total,
// lui, les compte toujours — G19)
const mandateOptions = computed(() => {
  const options: Array<{ value: MandateFilter; label: string }> = [
    { value: 'all', label: 'Élus et nommés' },
    {
      value: 'elected',
      label: `${MANDATE_FILTER_LABELS.elected} (${totalsByMandate.value.elected})`,
    },
    {
      value: 'appointed',
      label: `${MANDATE_FILTER_LABELS.appointed} (${totalsByMandate.value.appointed})`,
    },
  ];
  if (totalsByMandate.value.unclassified > 0 || filterMandate.value === 'unclassified') {
    options.push({
      value: 'unclassified',
      label: `${MANDATE_FILTER_LABELS.unclassified} (${totalsByMandate.value.unclassified})`,
    });
  }
  return options;
});

// « Élu(e) le » pour un mandat électif, « Nommé(e) le » sinon (accord au genre)
const getAppointmentVerb = (person: PublicPerson) => {
  const elected = person.current_appointment?.category?.mandate_type === 'elected';
  const feminine = person.sexe === 'female';
  if (elected) return feminine ? 'Élue' : 'Élu';
  return feminine ? 'Nommée' : 'Nommé';
};

// Schema.org : CollectionPage + ItemList des personnes affichées. Le BreadcrumbList est émis
// par <AppBreadcrumb> (ne pas le dupliquer ici).
const collectionSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: heading.value,
  description: description.value,
  url,
  inLanguage: 'fr-SN',
  isPartOf: { '@type': 'WebSite', name: siteName, url: siteUrl },
  about: { '@type': 'Country', name: 'Sénégal' },
  mainEntity: {
    '@type': 'ItemList',
    name: heading.value,
    numberOfItems: totalItems.value,
    itemListElement: persons.value.map((person, index) => ({
      '@type': 'ListItem',
      position: (currentPage.value - 1) * 25 + index + 1,
      item: {
        '@type': 'Person',
        name: person.full_name,
        url: `${siteUrl}${getDetailUrl(person)}`,
        ...(person.current_appointment?.position_title && {
          jobTitle: person.current_appointment.position_title,
        }),
      },
    })),
  },
}));

useSeoMeta({
  title: () => title.value,
  ogTitle: () => title.value,
  description: () => description.value,
  ogDescription: () => description.value,
  ogImage: image,
  ogUrl: url,
  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value,
  twitterDescription: () => description.value,
  twitterImage: image,
  keywords: [
    ...keywords,
    ...(isCategoryPage && categoryLabel.value
      ? [`${categoryLabel.value} Sénégal`, `liste des ${categoryLabel.value.toLowerCase()} Sénégal`]
      : [
          'personnalités publiques Sénégal',
          'ministres Sénégal',
          'directeurs généraux Sénégal',
          'PCA Sénégal',
          'hauts fonctionnaires Sénégal',
          'annuaire gouvernement Sénégal',
        ]),
  ].join(', '),
});

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: [{ rel: 'canonical', href: url }],
  meta: [
    { name: 'theme-color', content: themeColor },
    { name: 'author', content: siteName },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
    // Sous-page d'une catégorie sans personne (compteurs chargés) : pas d'indexation
    {
      name: 'robots',
      content: () =>
        isCategoryPage && statsLoaded.value && !categoryCount.value
          ? 'noindex, follow'
          : 'index, follow',
    },
    { name: 'geo.region', content: 'SN' },
    { name: 'geo.placename', content: 'Dakar' },
    { name: 'geo.position', content: '14.7645042;-17.3660286' },
    { name: 'ICBM', content: '14.7645042, -17.3660286' },
  ],
  script: [
    {
      key: 'ld-collection',
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(collectionSchema.value)),
    },
  ],
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20 dark:bg-gray-950">
    <!-- Breadcrumb -->
    <div class="container mx-auto px-4 pt-2">
      <AppBreadcrumb
        :items="
          isCategoryPage
            ? [
                { label: 'Annuaires', to: '/annuaires' },
                { label: 'Personnalités publiques', to: '/personnalites-senegal' },
                { label: heading },
              ]
            : [{ label: 'Annuaires', to: '/annuaires' }, { label: 'Personnalités publiques' }]
        "
      />
    </div>

    <!-- Sticky Header -->
    <header
      class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95"
    >
      <div class="container mx-auto px-4 py-3">
        <!-- Title Row -->
        <div class="flex items-center justify-between">
          <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            {{ heading }}
          </h1>
          <div class="flex shrink-0 items-center gap-3">
            <span
              v-if="isCategoryPage ? categoryCount : totalCount"
              class="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
            >
              <UIcon name="i-heroicons-user-group-20-solid" class="h-3.5 w-3.5" />
              {{ isCategoryPage ? categoryCount : totalCount }} personnalités{{ totalCountSuffix }}
            </span>
          </div>
        </div>

        <!-- Search -->
        <div class="group relative mt-3">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <UIcon
              name="i-heroicons-magnifying-glass-20-solid"
              class="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-gray-500"
            />
          </div>
          <input
            type="search"
            :value="searchQuery"
            placeholder="Rechercher une personnalité..."
            class="block w-full rounded-xl border-0 bg-gray-100 py-3 pl-11 pr-10 text-sm text-gray-900 ring-1 ring-transparent transition-all placeholder:text-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-gray-800/80 dark:focus:ring-gray-500 sm:py-2.5"
            @input="setSearchQuery(($event.target as HTMLInputElement).value)"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            @click="setSearchQuery('')"
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

        <!-- Statut + Genre + Élus / nommés : listes déroulantes (même motif que documents/public.vue) -->
        <div class="scrollbar-hide -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 py-1">
          <div class="relative shrink-0">
            <select
              :value="filterStatus"
              class="appearance-none rounded-full border-0 bg-gray-100 py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-500"
              aria-label="Filtrer par statut : en poste ou plus en poste"
              @change="
                setFilterStatus(($event.target as HTMLSelectElement).value as OfficeStatusFilter)
              "
            >
              <option
                v-for="opt in statusOptions"
                :key="opt.value"
                :value="opt.value"
                :selected="opt.value === filterStatus"
              >
                {{ opt.label }}
              </option>
            </select>
            <UIcon
              name="i-heroicons-chevron-down"
              class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
            />
          </div>

          <div class="relative shrink-0">
            <select
              :value="filterGender"
              class="appearance-none rounded-full border-0 bg-gray-100 py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-500"
              aria-label="Filtrer par genre"
              @change="setFilterGender(($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="opt in genderOptions"
                :key="opt.value"
                :value="opt.value"
                :selected="opt.value === filterGender"
              >
                {{ opt.label }}
              </option>
            </select>
            <UIcon
              name="i-heroicons-chevron-down"
              class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
            />
          </div>

          <!-- Élus / nommés : sans objet sur une sous-page (porté par la catégorie, G19) -->
          <div v-if="!isCategoryPage" class="relative shrink-0">
            <select
              :value="filterMandate"
              class="appearance-none rounded-full border-0 bg-gray-100 py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-gray-500"
              aria-label="Filtrer par mode d'accès à la fonction : élus ou nommés"
              @change="
                setFilterMandate(($event.target as HTMLSelectElement).value as MandateFilter)
              "
            >
              <option
                v-for="opt in mandateOptions"
                :key="opt.value"
                :value="opt.value"
                :selected="opt.value === filterMandate"
              >
                {{ opt.label }}
              </option>
            </select>
            <UIcon
              name="i-heroicons-chevron-down"
              class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>

        <!-- Category Filters -->
        <nav
          ref="categoryNav"
          class="scrollbar-hide -mx-4 mt-2 overflow-x-auto px-4 pb-1"
          aria-label="Filtrer par catégorie"
        >
          <div v-if="!categoryChips.length" class="flex gap-2 py-0.5">
            <USkeleton v-for="n in 5" :key="n" class="h-7 w-20 shrink-0 rounded-full" />
          </div>
          <div v-else class="flex gap-1.5 py-0.5">
            <!-- Chaque catégorie = lien vers sa sous-page (URL indexable) ; l'active ramène au hub -->
            <NuxtLink
              v-for="chip in categoryChips"
              :key="chip.slug"
              :to="chip.to"
              :aria-current="chip.active ? 'page' : undefined"
              :data-active-chip="chip.active || undefined"
              class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95"
              :class="[
                chip.active
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700',
              ]"
            >
              {{ chip.label }}
              <span class="text-[10px] opacity-70">({{ chip.count }})</span>
            </NuxtLink>
          </div>
        </nav>
      </div>
    </header>

    <main class="container mx-auto px-4 pt-4">
      <!-- Filter indicator -->
      <p
        v-if="hasActiveFilters"
        class="mb-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
      >
        <span v-if="filterGender !== 'all'" class="inline-flex items-center gap-1">
          <span
            class="h-2 w-2 rounded-full"
            :class="filterGender === 'male' ? 'bg-blue-500' : 'bg-purple-500'"
          />
          {{ filterGender === 'male' ? 'Hommes' : 'Femmes' }}
        </span>
        <span v-if="filterStatus !== 'current'" class="inline-flex items-center gap-1">
          <span class="h-2 w-2 rounded-full bg-gray-400" />
          {{ OFFICE_STATUS_FILTER_LABELS[filterStatus] }}
        </span>
        <span v-if="filterMandate !== 'all'" class="inline-flex items-center gap-1">
          <span class="h-2 w-2 rounded-full bg-gray-900 dark:bg-white" />
          {{ MANDATE_FILTER_LABELS[filterMandate] }}
        </span>
        <span
          v-if="!isCategoryPage && filterCategory !== 'all'"
          class="inline-flex items-center gap-1"
        >
          <span class="bg-primary-500 h-2 w-2 rounded-full" />
          {{ totalsByCategory[filterCategory]?.label || filterCategory }}
        </span>
        <span v-if="searchQuery"> · "{{ searchQuery }}"</span>
        <button
          class="text-primary-600 hover:text-primary-700 dark:text-primary-400 ml-1 underline underline-offset-2"
          @click="
            resetFilters();
            setSearchQuery('');
          "
        >
          Effacer
        </button>
      </p>

      <!-- Loading -->
      <div v-if="loading" class="space-y-2">
        <div
          v-for="n in 6"
          :key="n"
          class="flex gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800"
        >
          <USkeleton class="h-14 w-14 shrink-0 rounded-full sm:h-16 sm:w-16" />
          <div class="flex flex-1 flex-col justify-center space-y-2">
            <USkeleton class="h-4 w-2/5 rounded" />
            <USkeleton class="h-3 w-full rounded" />
            <USkeleton class="h-3 w-1/3 rounded" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="py-12">
        <div
          class="mx-auto max-w-sm rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
        >
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="h-6 w-6 text-red-600 dark:text-red-400"
            />
          </div>
          <p class="text-sm font-medium text-red-900 dark:text-red-200">Erreur de chargement</p>
          <p class="mt-1 text-xs text-red-700 dark:text-red-300">
            Impossible de charger les personnalités
          </p>
          <UButton color="red" variant="soft" size="sm" class="mt-4" @click="$router.go(0)">
            Réessayer
          </UButton>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="persons.length === 0" class="py-16 text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
        >
          <UIcon name="i-heroicons-user-group" class="h-8 w-8 text-gray-400" />
        </div>
        <p class="text-sm font-medium text-gray-900 dark:text-white">Aucune personnalité trouvée</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Essayez une autre recherche ou modifiez les filtres
        </p>
        <UButton
          v-if="hasActiveFilters || searchQuery"
          color="gray"
          variant="soft"
          size="sm"
          class="mt-4"
          @click="
            resetFilters();
            setSearchQuery('');
          "
        >
          Réinitialiser les filtres
        </UButton>
      </div>

      <!-- List -->
      <div v-else>
        <div class="space-y-2">
          <NuxtLink
            v-for="person in persons"
            :key="person.id"
            :to="getDetailUrl(person)"
            class="group flex gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md hover:ring-gray-200 active:scale-[0.99] dark:bg-gray-900 dark:ring-gray-800 dark:hover:ring-gray-700"
          >
            <!-- Photo -->
            <div class="relative h-14 w-14 shrink-0 sm:h-16 sm:w-16">
              <img
                :src="person.photo ? useCmsImage(person.photo) : '/unknown_member.webp'"
                :alt="person.full_name"
                class="h-full w-full rounded-full object-cover ring-2 ring-gray-100 transition-shadow group-hover:ring-gray-200 dark:ring-gray-700 dark:group-hover:ring-gray-600"
                loading="lazy"
              />
            </div>

            <!-- Content -->
            <div class="flex min-w-0 flex-1 flex-col justify-center">
              <h2
                class="group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate text-sm font-semibold text-gray-900 dark:text-white"
              >
                {{ person.full_name }}
              </h2>
              <p
                v-if="person.current_appointment"
                class="mt-0.5 line-clamp-1 text-xs text-gray-600 dark:text-gray-400"
              >
                {{ person.current_appointment.position_title }}
              </p>
              <p
                v-if="person.current_appointment?.organization_label"
                class="line-clamp-1 text-xs text-gray-500 dark:text-gray-500"
              >
                {{ person.current_appointment.organization_label }}
              </p>
              <div
                v-if="
                  person.current_appointment?.appointment_date ||
                  person.current_appointment?.end_date
                "
                class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5"
              >
                <time
                  v-if="person.current_appointment.appointment_date"
                  class="text-[11px] text-gray-400 dark:text-gray-500"
                >
                  {{ getAppointmentVerb(person) }} le
                  {{ $dateformat(person.current_appointment.appointment_date) }}
                </time>
                <span
                  v-if="person.current_appointment.end_date"
                  class="text-[11px] text-gray-500 dark:text-gray-400"
                >
                  Fin de fonction le {{ $dateformat(person.current_appointment.end_date) }}
                </span>
              </div>
            </div>

            <!-- Arrow -->
            <div class="hidden items-center sm:flex">
              <UIcon
                name="i-heroicons-chevron-right-20-solid"
                class="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400"
              />
            </div>
          </NuxtLink>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="mt-8 flex justify-center">
          <UPagination
            :model-value="currentPage"
            :total="totalItems"
            :page-count="25"
            size="sm"
            :ui="{
              wrapper: 'flex items-center gap-1',
              rounded: 'rounded-lg',
            }"
            @update:model-value="goToPage"
          />
        </div>
      </div>

      <!-- Rôle et attributions de la fonction (texte CMS), après la liste -->
      <section
        v-if="isCategoryPage && roleDescription"
        class="mt-12 max-w-3xl border-t border-gray-100 pt-8 dark:border-gray-800"
        aria-labelledby="role-description-title"
      >
        <h2
          id="role-description-title"
          class="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl"
        >
          Rôle et attributions
        </h2>
        <!-- Contenu rédigé au CMS (même modèle que dossiers/[slug]) -->
        <div
          class="prose prose-base mt-4 max-w-none text-gray-700 dark:prose-invert prose-a:text-sky-600 dark:text-gray-300 dark:prose-a:text-sky-400"
          v-html="rewriteCmsContent(roleDescription)"
        />
      </section>
    </main>
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
