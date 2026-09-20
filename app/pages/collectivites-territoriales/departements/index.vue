<script setup lang="ts">
import type { DepartementAvecCommunes, DepartementGeo } from '~~/types/collectivite';
import { repereCollectivites, reperesResultats } from '~/composables/collectivites/reperes';
import { useCollectionPageSeo } from '~/composables/collectivites/useCollectionPageSeo';
import { useDepartementsGeo } from '~/composables/collectivites/useDepartementsGeo';
import { useGeoSearch } from '~/composables/collectivites/useGeoSearch';

// Hub des départements : page pivot entre l'annuaire (558 collectivités, filtres
// en query params non indexables) et les fiches communes. Elle donne 46 URLs
// stables et crawlables, chacune menant à une dizaine de fiches.
const { siteUrl } = useSiteMetadata();

const { departements, total, totalCollectivites } = useDepartementsGeo();

// Recherche miroitée dans `?q=` et normalisée (accents, tirets, doubles espaces).
const { q, query, normalize, isSearching } = useGeoSearch();

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

const reperes = computed(() => [
  { key: 'departements', value: total.value, label: 'départements' },
  { ...repereCollectivites(totalCollectivites.value), label: 'collectivités rattachées' },
  { key: 'population', value: populationTotale.value, label: 'habitants (RGPH 2023)' },
  ...reperesResultats(isSearching.value, filtered.value.length),
]);

// ── SEO (en dernier - helpers et computeds déclarés avant) ─────────
// Le JSON-LD décrit ce qui est RÉELLEMENT affiché : sans recherche, les 46
// départements. 46 items : la liste tient entière, contrairement à l'annuaire.
useCollectionPageSeo({
  key: 'ld-departements',
  title: 'Départements du Sénégal : les communes de chaque département',
  description:
    'Les 46 départements du Sénégal, région par région. Pour chaque département : la liste de ses communes, leur maire et leur population au recensement 2023.',
  url: `${siteUrl}/collectivites-territoriales/departements`,
  items: () =>
    filtered.value.map((d) => ({
      name: `Département de ${d.nom}`,
      url: `${siteUrl}/collectivites-territoriales/departements/${d.slug}`,
    })),
  // Le hub sans paramètre reste pleinement indexable ; une vue `?q=…` non.
  noindexWhen: () => isSearching.value,
});
</script>

<template>
  <div class="min-h-screen pb-16">
    <CollectivitesPageHeader
      :breadcrumb="[
        { label: 'Collectivités territoriales', to: '/collectivites-territoriales' },
        { label: 'Départements' },
      ]"
      title="Les départements du Sénégal"
    >
      <template #description>
        Choisissez un département pour voir la liste de ses communes, leur maire et leur population.
        Le découpage et les populations proviennent du référentiel officiel (recensement 2023).
      </template>

      <!-- Recherche : département, région, mais aussi commune et maire - on
           retrouve ainsi le département d'une commune sans savoir où elle est
           rattachée. -->
      <CollectivitesSearchInput
        v-model="q"
        placeholder="Rechercher un département, une région, une commune, un maire…"
        class="mt-4"
      />

      <CollectivitesStatStrip :items="reperes" class="mt-4" />
    </CollectivitesPageHeader>

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
