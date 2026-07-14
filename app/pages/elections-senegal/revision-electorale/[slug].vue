<script setup lang="ts">
/**
 * Fiche détail d'une révision électorale : période, définition/déroulé spécifique,
 * FAQ, décret officiel, et lien croisé vers la carte électorale correspondante
 * quand la révision a un fichier électoral rattaché.
 */

interface RevisionDetail {
  id: number;
  slug: string;
  year: number | null;
  type: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  description: string | null;
  faq: { question: string; answer: string }[];
  document: { id: number; slug: string | null; title: string | null } | null;
  national: { id: number } | null;
  diaspora: { id: number } | null;
  elections: { id: number; name: string; type: string; year: number; slug: string | null }[];
}

const route = useRoute();
const slug = route.params.slug as string;

const { data, error } = await useFetch<{ data: RevisionDetail | null }>(
  `/api/elections/revisions/${slug}`,
  { key: `elections-revision-detail-${slug}` },
);

const revision = computed(() => data.value?.data || null);

if (!revision.value && !error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Révision électorale introuvable', fatal: true });
}

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

const periodLabel = computed(() => {
  const r = revision.value;
  if (!r?.period_start && !r?.period_end) return null;
  if (r.period_start && r.period_end) return `Du ${formatDate(r.period_start)} au ${formatDate(r.period_end)}`;
  return r.period_start ? `À partir du ${formatDate(r.period_start)}` : `Jusqu'au ${formatDate(r.period_end!)}`;
});

const hasElectoralMap = computed(() => Boolean(revision.value?.national || revision.value?.diaspora));

const faqItems = computed(() =>
  (revision.value?.faq || []).map((item) => ({ label: item.question, content: item.answer })),
);

const { siteName, siteUrl, keywords, themeColor } = useSiteMetadata();

const title = computed(() => revision.value
  ? `Révision électorale ${revision.value.year} | Vie Publique Sénégal`
  : 'Révision électorale | Vie Publique Sénégal');
const description = computed(() => revision.value
  ? `Révision électorale ${revision.value.year} au Sénégal : période, déroulé et informations pratiques.`
  : 'Révision électorale au Sénégal.');
const url = computed(() => `${siteUrl}/elections-senegal/revision-electorale/${slug}`);

useSeoMeta({
  title,
  description,
  ogTitle: () => revision.value ? `Révision électorale ${revision.value.year}` : 'Révision électorale',
  ogDescription: description,
  ogUrl: url,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  keywords: () => revision.value
    ? [...keywords, `révision électorale ${revision.value.year}`, `révision listes électorales ${revision.value.year}`].join(', ')
    : keywords.join(', '),
});

const breadcrumbSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Élections', item: `${siteUrl}/elections-senegal` },
    { '@type': 'ListItem', position: 3, name: 'Révision électorale', item: `${siteUrl}/elections-senegal/revision-electorale` },
    { '@type': 'ListItem', position: 4, name: String(revision.value?.year ?? ''), item: url.value },
  ],
}));

const faqSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: (revision.value?.faq || []).map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
}));

useHead({
  link: [{ rel: 'canonical', href: url.value }],
  meta: [
    { name: 'theme-color', content: themeColor },
    { name: 'author', content: siteName },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
    { name: 'robots', content: 'index, follow' },
    { name: 'geo.region', content: 'SN' },
  ],
  script: [
    { type: 'application/ld+json', children: () => JSON.stringify(breadcrumbSchema.value) },
    ...(faqItems.value.length
      ? [{ type: 'application/ld+json', children: () => JSON.stringify(faqSchema.value) }]
      : []),
  ],
});
</script>

<template>
  <div v-if="revision" class="flex min-h-screen flex-col items-center px-4 py-8 pb-16">
    <div class="w-full max-w-4xl">
      <AppBreadcrumb
        class="mb-6"
        :items="[
          { label: 'Élections', to: '/elections-senegal' },
          { label: 'Révision électorale', to: '/elections-senegal/revision-electorale' },
          { label: String(revision.year) },
        ]"
      />

      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-bold text-gray-900 md:text-3xl dark:text-white">
          Révision électorale {{ revision.year }}
        </h1>
        <UBadge color="gray" variant="soft" size="sm">{{ TYPE_LABELS[revision.type] || revision.type }}</UBadge>
        <UBadge v-if="STATUS_LABELS[revision.status]" color="primary" variant="soft" size="sm">
          {{ STATUS_LABELS[revision.status] }}
        </UBadge>
      </div>
      <p v-if="periodLabel" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {{ periodLabel }}
      </p>

      <div v-if="revision.document?.slug" class="mt-4">
        <UButton
          :to="`/documents/${revision.document.id}/${revision.document.slug}`"
          size="sm"
          color="gray"
          variant="soft"
          icon="i-heroicons-document-text"
        >
          {{ revision.document.title || 'Décret portant ouverture de la révision' }}
        </UButton>
      </div>

      <div v-if="hasElectoralMap" class="mt-4">
        <UButton
          :to="`/elections-senegal/carte-electorale?revision=${revision.slug}`"
          size="sm"
          color="primary"
          variant="soft"
          trailing-icon="i-heroicons-map"
        >
          Voir la carte électorale de cette révision
        </UButton>
      </div>

      <div
        v-if="revision.description"
        class="prose prose-sm prose-gray mt-8 max-w-none dark:prose-invert"
        v-html="revision.description"
      />

      <div v-if="faqItems.length" class="mt-10">
        <h2 class="mb-4 text-lg font-bold text-gray-900 dark:text-white">Questions fréquentes</h2>
        <div class="space-y-3">
          <div
            v-for="item in faqItems"
            :key="item.label"
            class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          >
            <UAccordion :items="[item]">
              <template #default="{ item: accordionItem, open }">
                <button class="flex w-full items-center justify-between p-4 text-left">
                  <span class="font-semibold text-gray-900 dark:text-white">{{ accordionItem.label }}</span>
                  <UIcon
                    name="i-heroicons-chevron-down"
                    class="h-5 w-5 shrink-0 text-gray-400 transition-transform"
                    :class="{ 'rotate-180': open }"
                  />
                </button>
              </template>
              <template #item="{ item: accordionItem }">
                <div class="border-t border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
                  <p class="leading-relaxed text-gray-700 dark:text-gray-300">{{ accordionItem.content }}</p>
                </div>
              </template>
            </UAccordion>
          </div>
        </div>
      </div>

      <div v-if="revision.elections.length" class="mt-10">
        <h2 class="mb-3 text-lg font-bold text-gray-900 dark:text-white">Scrutins concernés</h2>
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            v-for="election in revision.elections"
            :key="election.id"
            :to="election.slug ? `/elections-senegal/${election.slug}` : undefined"
            size="sm"
            color="primary"
            variant="soft"
            trailing-icon="i-heroicons-arrow-right"
          >
            {{ election.name }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
