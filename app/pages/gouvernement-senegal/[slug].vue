<script setup lang="ts">
import type { Government, GovernmentMemberFull } from '~~/types/government';

const route = useRoute();
const slug = computed(() => route.params.slug as string);

const { siteName, siteUrl, themeColor } = useSiteMetadata();

const {
  government,
  groups,
  roles,
  stats,
  q,
  role,
  updateFilters,
  loading: pending,
  error,
} = useGovernmentDetail(slug);

// Pour la navigation précédent / suivant (ordre chronologique)
const { governments } = useGovernmentHistory();

// 404 si le gouvernement n'existe pas
watchEffect(() => {
  if (!pending.value && error.value) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Gouvernement introuvable',
      fatal: true,
    });
  }
});

/* --------------------- Recherche & filtres (URL) ------------------------- */

// Champ de recherche local synchronisé avec le query param `?q=` (debounce 300ms).
const searchInput = ref(q.value);
watch(q, (value) => {
  if (value !== searchInput.value) searchInput.value = value;
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(searchInput, (value) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    updateFilters({ q: value.trim() }, 'replace');
  }, 200);
});
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

const selectRole = (slug: string) => {
  updateFilters({ role: role.value === slug ? '' : slug }, 'push');
};

const clearFilters = () => {
  searchInput.value = '';
  updateFilters({ q: '', role: '' }, 'push');
};

const hasActiveFilters = computed(() => Boolean(q.value || role.value));

// État des résultats membres
const hasMembers = computed(() => Boolean(stats.value && stats.value.total > 0));
const noMembersMatch = computed(
  () => hasMembers.value && groups.value.length === 0,
);
const visibleCount = computed(() =>
  groups.value.reduce((sum, g) => sum + g.members.length, 0),
);

/* ------------------------------- Helpers --------------------------------- */

const MONTHS_LONG = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const formatLongDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
};

const formatPeriod = (gov: Government): string => {
  const start = formatLongDate(gov.start_date);
  if (gov.end_date === null) return `depuis le ${start}`;
  return `du ${start} au ${formatLongDate(gov.end_date)}`;
};

const formatDurationDays = (days: number): string => {
  if (days < 31) return `${days} jour${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} an${years > 1 ? 's' : ''}`;
  return `${years} an${years > 1 ? 's' : ''} et ${rem} mois`;
};

const personUrl = (m: GovernmentMemberFull): string => {
  const s = m.person.slug || generateSlugFromName(m.person.full_name);
  return `/personnalites/${m.person.id}/${s}?ref=gouvernement`;
};

const personRefUrl = (
  p: { id: number; full_name: string; slug: string | null } | null,
): string | null => {
  if (!p) return null;
  const s = p.slug || generateSlugFromName(p.full_name);
  return `/personnalites/${p.id}/${s}?ref=gouvernement`;
};

const documentUrl = (decree: { id: number; slug: string }) =>
  `/documents/${decree.id}/${decree.slug}`;

// Liste plate des membres rendus (pour le JSON-LD).
const allMembersForSchema = computed(() =>
  groups.value.flatMap((g) => g.members),
);

// Navigation précédent / suivant.
// `governments` est trié du plus récent au plus ancien.
const currentIndex = computed(() =>
  governments.value.findIndex((g) => g.slug === slug.value),
);
// Suivant chronologique = plus récent = index − 1 ; précédent = plus ancien = index + 1
const newerGovernment = computed<Government | null>(() => {
  const i = currentIndex.value;
  return i > 0 ? governments.value[i - 1] : null;
});
const olderGovernment = computed<Government | null>(() => {
  const i = currentIndex.value;
  return i >= 0 && i < governments.value.length - 1
    ? governments.value[i + 1]
    : null;
});

/* --------------------------------- SEO ----------------------------------- */

const title = computed(() =>
  government.value
    ? `${government.value.name} - Composition du gouvernement | Vie Publique Sénégal`
    : 'Gouvernement du Sénégal | Vie Publique Sénégal',
);

const description = computed(() => {
  const g = government.value;
  if (!g) return '';
  const pm = g.prime_minister
    ? `dirigé par le Premier Ministre ${g.prime_minister.full_name}`
    : 'en présidence directe';
  return `Composition du ${g.name}, sous la présidence de ${
    g.president?.full_name ?? ''
  }, ${pm}. Liste des ministres et secrétaires d'État, ${formatPeriod(g)}.`;
});

const url = computed(() => `${siteUrl}/gouvernement-senegal/${slug.value}`);
const image = `${siteUrl}/nomination-3.png`;

const orgSchema = computed(() => {
  const g = government.value;
  if (!g) return null;
  const allMembers = allMembersForSchema.value;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: g.name,
    url: url.value,
    description: description.value,
    foundingDate: g.start_date,
    ...(g.end_date ? { dissolutionDate: g.end_date } : {}),
    areaServed: { '@type': 'Country', name: 'Sénégal' },
    member: allMembers.map((m) => ({
      '@type': 'Person',
      name: m.person.full_name,
      jobTitle: m.position_title,
      gender: m.person.sexe === 'female' ? 'Female' : 'Male',
      image: m.person.photo ? `${siteUrl}${useCmsImage(m.person.photo)}` : undefined,
      url: `${siteUrl}${personUrl(m).split('?')[0]}`,
    })),
  };
});

const breadcrumbSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Annuaires',
      item: `${siteUrl}/annuaires`,
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Gouvernement du Sénégal',
      item: `${siteUrl}/gouvernement-senegal`,
    },
    {
      '@type': 'ListItem',
      position: 4,
      name: 'Historique',
      item: `${siteUrl}/gouvernement-senegal/historique`,
    },
    {
      '@type': 'ListItem',
      position: 5,
      name: government.value?.name ?? '',
      item: url.value,
    },
  ],
}));

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogImage: image,
  ogUrl: url,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: image,
});

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: [{ rel: 'canonical', href: url }],
  meta: [
    { name: 'theme-color', content: themeColor },
    { name: 'author', content: siteName },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
    { name: 'robots', content: 'index, follow' },
  ],
  script: [
    {
      type: 'application/ld+json',
      children: computed(() =>
        orgSchema.value ? JSON.stringify(orgSchema.value) : '',
      ),
    },
    {
      type: 'application/ld+json',
      children: computed(() => JSON.stringify(breadcrumbSchema.value)),
    },
  ],
});
</script>

<template>
  <div class="min-h-screen pb-12 dark:bg-gray-900/95">
    <!-- Breadcrumb -->
    <div class="container mx-auto px-4 pt-2">
      <AppBreadcrumb
        :items="[
          { label: 'Annuaires', to: '/annuaires' },
          { label: 'Gouvernement', to: '/gouvernement-senegal' },
          { label: 'Historique', to: '/gouvernement-senegal/historique' },
          { label: government?.name || 'Gouvernement' },
        ]"
      />
    </div>

    <main class="container mx-auto max-w-3xl px-4 pt-4">
      <!-- Loading -->
      <div v-if="pending" class="space-y-4">
        <USkeleton class="h-8 w-2/3 rounded" />
        <USkeleton class="h-20 w-full rounded-xl" />
        <USkeleton class="h-5 w-40 rounded" />
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <USkeleton v-for="n in 6" :key="n" class="aspect-[3/4] w-full rounded-xl" />
        </div>
      </div>

      <!-- Contenu -->
      <div v-else-if="government" class="space-y-6">
        <!-- Header (style aligné sur l'historique) -->
        <header
          class="sticky top-0 z-40 -mx-4 bg-white/95 px-4 py-3 backdrop-blur-sm dark:bg-gray-900/95"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h1 class="truncate text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                {{ government.name }}
              </h1>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatPeriod(government) }}
              </p>
            </div>
            <span
              v-if="government.end_date === null"
              class="inline-flex flex-shrink-0 items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"
            >
              En exercice
            </span>
          </div>
        </header>

        <!-- Bloc info -->
        <section
          class="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5"
        >
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-xs font-medium text-gray-400 dark:text-gray-500">
                Président
              </dt>
              <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                <NuxtLink
                  v-if="government.president && personRefUrl(government.president)"
                  :to="personRefUrl(government.president)!"
                  class="hover:text-sky-600 hover:underline dark:hover:text-sky-400"
                >
                  {{ government.president.full_name }}
                </NuxtLink>
                <span v-else>{{ government.president?.full_name || '-' }}</span>
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400 dark:text-gray-500">
                Premier Ministre
              </dt>
              <dd class="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                <NuxtLink
                  v-if="government.prime_minister && personRefUrl(government.prime_minister)"
                  :to="personRefUrl(government.prime_minister)!"
                  class="hover:text-sky-600 hover:underline dark:hover:text-sky-400"
                >
                  {{ government.prime_minister.full_name }}
                </NuxtLink>
                <span v-else class="italic text-gray-400 dark:text-gray-500">
                  Présidence directe
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400 dark:text-gray-500">
                Durée
              </dt>
              <dd class="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                {{ stats ? formatDurationDays(stats.duration_days) : '-' }}
              </dd>
            </div>
            <div v-if="stats && stats.total > 0">
              <dt class="text-xs font-medium text-gray-400 dark:text-gray-500">
                Composition
              </dt>
              <dd class="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                {{ stats.total }} membres · {{ stats.women }} femmes
              </dd>
            </div>
          </dl>

          <!-- Phrase de nomination -->
          <p
            class="mt-4 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500 dark:border-gray-700 dark:text-gray-400"
          >
            <template v-if="government.prime_minister">
              Par
              <NuxtLink
                v-if="government.pm_appointment_decree"
                :to="documentUrl(government.pm_appointment_decree)"
                class="font-medium text-sky-600 hover:underline dark:text-sky-400"
              >{{ government.pm_appointment_decree.title }}</NuxtLink>
              <span v-else class="font-medium">décret de nomination</span>, le Président
              <NuxtLink
                v-if="personRefUrl(government.president)"
                :to="personRefUrl(government.president)!"
                class="font-medium text-sky-600 hover:underline dark:text-sky-400"
              >{{ government.president?.full_name }}</NuxtLink>
              <span v-else class="font-medium">{{ government.president?.full_name }}</span>
              nomme
              <NuxtLink
                v-if="personRefUrl(government.prime_minister)"
                :to="personRefUrl(government.prime_minister)!"
                class="font-medium text-sky-600 hover:underline dark:text-sky-400"
              >{{ government.prime_minister.full_name }}</NuxtLink>
              <span v-else class="font-medium">{{ government.prime_minister.full_name }}</span>
              Premier ministre<template v-if="government.formation_decree">
                et fixe la composition du gouvernement (<NuxtLink
                  :to="documentUrl(government.formation_decree)"
                  class="font-medium text-sky-600 hover:underline dark:text-sky-400"
                >{{ government.formation_decree.title }}</NuxtLink>)</template>.
            </template>
            <template v-else>
              Par
              <NuxtLink
                v-if="government.formation_decree"
                :to="documentUrl(government.formation_decree)"
                class="font-medium text-sky-600 hover:underline dark:text-sky-400"
              >{{ government.formation_decree.title }}</NuxtLink>
              <span v-else class="font-medium">décret de formation</span>, le Président
              <NuxtLink
                v-if="personRefUrl(government.president)"
                :to="personRefUrl(government.president)!"
                class="font-medium text-sky-600 hover:underline dark:text-sky-400"
              >{{ government.president?.full_name }}</NuxtLink>
              <span v-else class="font-medium">{{ government.president?.full_name }}</span>
              forme le gouvernement.
            </template>
          </p>
        </section>

        <!-- Membres -->
        <template v-if="hasMembers">
          <!-- Recherche + filtre par rôle -->
          <div class="space-y-3">
            <div class="relative">
              <UIcon
                name="i-heroicons-magnifying-glass"
                class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />
              <input
                v-model="searchInput"
                type="search"
                aria-label="Rechercher un membre par nom ou par fonction"
                placeholder="Rechercher un membre (nom ou fonction)…"
                class="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <!-- Chips de rôle (dérivées dynamiquement du CMS) -->
            <div
              v-if="roles.length > 1"
              class="flex flex-wrap gap-2"
              role="group"
              aria-label="Filtrer par rôle"
            >
              <button
                type="button"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                :class="
                  !role
                    ? 'bg-sky-600 text-white dark:bg-sky-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                "
                @click="updateFilters({ role: '' }, 'push')"
              >
                Tous
              </button>
              <button
                v-for="r in roles"
                :key="r.slug"
                type="button"
                class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                :class="
                  role === r.slug
                    ? 'bg-sky-600 text-white dark:bg-sky-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                "
                @click="selectRole(r.slug)"
              >
                {{ r.label }}
                <span class="opacity-70">({{ r.count }})</span>
              </button>
            </div>

            <!-- Filtres actifs -->
            <div
              v-if="hasActiveFilters"
              class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
            >
              <span>
                {{ visibleCount }} membre{{ visibleCount > 1 ? 's' : '' }}
              </span>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                @click="clearFilters"
              >
                <UIcon name="i-heroicons-x-mark" class="size-3.5" />
                Effacer les filtres
              </button>
            </div>
          </div>

          <!-- Groupes de membres rendus dynamiquement -->
          <template v-if="!noMembersMatch">
            <section
              v-for="group in groups"
              :key="group.slug"
              class="scroll-mt-24"
            >
              <h2
                class="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-900 dark:border-gray-700 dark:text-white"
              >
                {{ group.label }}
                <span class="text-sm font-normal text-gray-400 dark:text-gray-500">
                  ({{ group.members.length }})
                </span>
              </h2>
              <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                <li v-for="m in group.members" :key="m.id">
                  <NuxtLink
                    :to="personUrl(m)"
                    class="group relative block aspect-[3/4] overflow-hidden rounded-xl bg-gray-200 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-lg hover:ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 dark:hover:ring-gray-600"
                  >
                    <img
                      :src="m.person.photo ? useCmsImage(m.person.photo) : '/unknown_member.webp'"
                      :alt="`${m.person.full_name}, ${m.position_title}`"
                      class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div
                      class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                    />
                    <div class="absolute inset-x-0 bottom-0 p-3">
                      <h3 class="text-sm font-bold leading-tight text-white">
                        {{ m.person.full_name }}
                      </h3>
                      <p class="mt-0.5 line-clamp-2 text-[11px] leading-tight text-white/80">
                        {{ m.position_title }}
                      </p>
                    </div>
                  </NuxtLink>
                </li>
              </ul>
            </section>
          </template>

          <!-- Aucun membre ne correspond -->
          <div
            v-else
            class="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800"
          >
            <UIcon
              name="i-heroicons-magnifying-glass"
              class="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600"
            />
            <p class="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">
              Aucun membre ne correspond
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Aucun membre ne correspond à votre recherche ou au filtre sélectionné.
            </p>
            <UButton
              color="sky"
              variant="soft"
              size="sm"
              class="mt-4"
              @click="clearFilters"
            >
              Réinitialiser
            </UButton>
          </div>
        </template>

        <!-- Placeholder : membres non importés -->
        <div
          v-else
          class="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800"
        >
          <UIcon
            name="i-heroicons-clock"
            class="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600"
          />
          <p class="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">
            Données en cours d'intégration
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            La composition détaillée de ce gouvernement sera bientôt disponible.
          </p>
        </div>

        <!-- Navigation précédent / suivant -->
        <nav
          class="flex items-stretch justify-between gap-3 border-t border-gray-100 pt-6 dark:border-gray-700"
          aria-label="Navigation entre gouvernements"
        >
          <NuxtLink
            v-if="olderGovernment"
            :to="`/gouvernement-senegal/${olderGovernment.slug}`"
            class="group flex max-w-[48%] flex-col rounded-xl border border-gray-100 bg-white p-3 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <span class="text-[11px] text-gray-400 dark:text-gray-500">
              ← Gouvernement précédent
            </span>
            <span
              class="mt-0.5 truncate text-xs font-semibold text-gray-900 dark:text-white"
            >
              {{ olderGovernment.name }}
            </span>
          </NuxtLink>
          <span v-else />

          <NuxtLink
            v-if="newerGovernment"
            :to="`/gouvernement-senegal/${newerGovernment.slug}`"
            class="group flex max-w-[48%] flex-col rounded-xl border border-gray-100 bg-white p-3 text-right transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <span class="text-[11px] text-gray-400 dark:text-gray-500">
              Gouvernement suivant →
            </span>
            <span
              class="mt-0.5 truncate text-xs font-semibold text-gray-900 dark:text-white"
            >
              {{ newerGovernment.name }}
            </span>
          </NuxtLink>
          <span v-else />
        </nav>

        <!-- Retour à l'historique -->
        <div class="text-center">
          <NuxtLink
            to="/gouvernement-senegal/historique"
            class="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:underline dark:text-sky-400"
          >
            <UIcon name="i-heroicons-arrow-left" class="size-4" />
            Retour à l'historique des gouvernements
          </NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>
