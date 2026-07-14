<script setup lang="ts">
/**
 * Page évergreen sur la révision électorale : définition, déroulé du processus,
 * et liste des révisions connues (chacune renvoyant vers sa fiche détail).
 * Route dédiée hors de l'arborescence carte-electorale (contenu différent du
 * module cartographique, indexation SEO sur des requêtes du type
 * « révision électorale Sénégal »).
 */

interface RevisionListItem {
  id: number;
  slug: string;
  year: number | null;
  type: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
}

const { data } = await useFetch<{ revisions: RevisionListItem[] }>('/api/elections/revisions', {
  key: 'elections-revisions-list',
  default: () => ({ revisions: [] }),
});

const revisions = computed(() => data.value?.revisions || []);

const TYPE_LABELS: Record<string, string> = {
  ordinaire: 'Ordinaire',
  exceptionnelle: 'Exceptionnelle',
};

const STATUS_LABELS: Record<string, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  cloturee: 'Clôturée',
  reportee: 'Reportée',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const periodLabel = (revision: RevisionListItem) => {
  if (!revision.period_start && !revision.period_end) return null;
  if (revision.period_start && revision.period_end) {
    return `Du ${formatDate(revision.period_start)} au ${formatDate(revision.period_end)}`;
  }
  return revision.period_start ? `À partir du ${formatDate(revision.period_start)}` : `Jusqu'au ${formatDate(revision.period_end!)}`;
};

const { siteName, siteUrl, keywords, themeColor } = useSiteMetadata();

const title = 'Révision électorale au Sénégal | Vie Publique Sénégal';
const description =
  "Qu'est-ce qu'une révision électorale au Sénégal, quand et où se déroule-t-elle ? Périodes des révisions ordinaires et exceptionnelles, FAQ et textes officiels.";
const url = `${siteUrl}/elections-senegal/revision-electorale`;

useSeoMeta({
  title,
  description,
  ogTitle: 'Révision électorale au Sénégal',
  ogDescription: "Définition, déroulé et calendrier des révisions des listes électorales au Sénégal.",
  ogUrl: url,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  keywords: [...keywords, 'révision électorale sénégal', 'révision listes électorales', 'inscription liste électorale sénégal'].join(', '),
});

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Élections', item: `${siteUrl}/elections-senegal` },
    { '@type': 'ListItem', position: 3, name: 'Révision électorale', item: url },
  ],
};

useHead({
  link: [{ rel: 'canonical', href: url }],
  meta: [
    { name: 'theme-color', content: themeColor },
    { name: 'author', content: siteName },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
    { name: 'robots', content: 'index, follow' },
    { name: 'geo.region', content: 'SN' },
  ],
  script: [{ type: 'application/ld+json', children: JSON.stringify(breadcrumbSchema) }],
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-4 py-8 pb-16">
    <div class="w-full max-w-4xl">
      <AppBreadcrumb
        class="mb-6"
        :items="[
          { label: 'Élections', to: '/elections-senegal' },
          { label: 'Révision électorale' },
        ]"
      />

      <h1 class="text-xl font-bold text-gray-900 md:text-3xl dark:text-white">
        Révision électorale
      </h1>
      <p class="mt-0.5 max-w-2xl text-xs text-gray-500 md:mt-1 md:text-sm dark:text-gray-400">
        Périodes d'inscription et de mise à jour des listes électorales au Sénégal.
      </p>

      <div class="prose prose-sm prose-gray mt-6 max-w-none dark:prose-invert">
        <p>
          La révision des listes électorales est la procédure par laquelle un citoyen sénégalais
          s'inscrit sur les listes électorales, met à jour son inscription (changement de commune
          ou de lieu de vote) ou est radié (décès, déchéance des droits civiques). Elle est menée
          par des commissions administratives locales, sous l'autorité de la Direction Générale
          des Élections (DGE).
        </p>
        <p>
          La loi distingue deux types de révision : la <strong>révision ordinaire</strong>, qui se
          tient chaque année du 1er février au 31 juillet (article L.37 du Code électoral), et la
          <strong>révision exceptionnelle</strong>, décidée par décret en amont d'une élection
          générale, qui remplace l'ordinaire l'année où elle est organisée.
        </p>
      </div>

      <h2 class="mt-10 text-lg font-bold text-gray-900 dark:text-white">Les révisions</h2>
      <div v-if="revisions.length" class="mt-4 flex flex-col gap-3">
        <NuxtLink
          v-for="revision in revisions"
          :key="revision.id"
          :to="`/elections-senegal/revision-electorale/${revision.slug}`"
          class="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-calendar-days" class="h-5 w-5 shrink-0 text-primary-600" />
            <div>
              <span class="font-semibold text-gray-900 dark:text-white">Révision {{ revision.year }}</span>
              <span v-if="periodLabel(revision)" class="ml-2 text-sm text-gray-500 dark:text-gray-400">
                {{ periodLabel(revision) }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UBadge color="gray" variant="soft" size="xs">{{ TYPE_LABELS[revision.type] || revision.type }}</UBadge>
            <UBadge v-if="STATUS_LABELS[revision.status]" color="primary" variant="soft" size="xs">
              {{ STATUS_LABELS[revision.status] }}
            </UBadge>
          </div>
        </NuxtLink>
      </div>
      <p v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Aucune révision publiée pour le moment.
      </p>
    </div>
  </div>
</template>
