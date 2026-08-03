<!--
  Carte des communes (module Collectivités territoriales) — MapLibre + deck.gl.

  Unique point d'entrée cartographique du module : vue « Carte » de l'annuaire,
  page carte plein écran et mini-cartes des fiches communes passent tous par ici.

  Deux modes, décidés par la présence de `focusSlug` :
  - sans : exploration à deux niveaux, les 46 départements puis les communes du
    département ouvert (par l'action du popup, jamais au premier clic) ;
  - avec : fiche d'une collectivité — SON contour, seul, cadré au plus juste,
    sans drill-down, sans popup et sans surcouche.

  Le référentiel géo (`geo_entities`) ne portant AUCUNE géométrie, le
  rapprochement avec les polygones de `public/geo/` se fait par nom + département
  (cf. useCommunesGeoJoin). Le fond ne contient que le niveau `commune` : les 5
  « villes » (Dakar, Pikine, Guédiawaye, Rufisque, Thiès) n'ont pas de contour
  propre et sont représentées par leurs communes.
-->
<template>
  <div
    class="relative overflow-hidden rounded-xl ring-1 ring-gray-200 dark:ring-gray-700"
    :style="{ height }"
  >
    <!-- `ready` rejoue le cadrage : sur une fiche, le département est connu bien
         avant que le moteur ne soit initialisé, et un flyTo prématuré est perdu. -->
    <MapSenegalMap
      ref="carte"
      :config="mapConfig"
      :height="height"
      @action="onPopupAction"
      @ready="cadrer(departementOuvert)"
    />

    <!-- Coin haut droit : seule zone libre de la carte (contrôles en bas à
         gauche, légende en bas à droite, en-tête de page en haut à gauche).
         Rien de tout ça sur une fiche : la carte y montre une seule commune,
         il n'y a ni niveau à changer ni couverture à nuancer. -->
    <div v-if="!focusSlug" class="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
      <!-- Retour au niveau national : sans lui, on reste prisonnier d'un
           département une fois entré. -->
      <button
        v-if="departementOuvert"
        type="button"
        class="flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur transition hover:bg-white dark:bg-gray-800/95 dark:text-gray-200 dark:hover:bg-gray-800"
        @click="departementOuvert = null"
      >
        <UIcon name="i-heroicons-arrow-left-20-solid" class="h-3.5 w-3.5" />
        Tous les départements
      </button>
      <p
        v-else
        class="pointer-events-none rounded-md bg-white/90 px-2.5 py-1.5 text-[11px] text-gray-600 shadow-sm backdrop-blur dark:bg-gray-800/90 dark:text-gray-300"
      >
        Cliquez sur un département
      </p>

      <!-- Écart de couverture : l'annoncer en chiffres bruts donnait l'impression
           d'un trou dans les données. Il n'y en a pas — les villes n'ont pas de
           contour propre parce que leur territoire EST celui de leurs communes,
           déjà dessinées. On nomme donc la raison plutôt que le seul écart. -->
      <p
        v-if="villesNonDessinees.length"
        class="max-w-[15rem] rounded-md bg-white/90 px-2.5 py-1.5 text-right text-[11px] text-gray-600 shadow-sm backdrop-blur dark:bg-gray-800/90 dark:text-gray-300"
        :title="`Le territoire de ${villesNonDessinees.join(', ')} est couvert par leurs communes, déjà tracées sur la carte.`"
      >
        {{ villesNonDessinees.length }} ville{{ villesNonDessinees.length > 1 ? 's' : '' }} sans
        contour propre : {{ villesNonDessinees.join(', ') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeatureCollection } from 'geojson';
import type { CommuneGeo } from '~~/types/collectivite';
import { slugifyGeoName } from '#shared/geo-name';
import { useCommunesGeoJoin } from '~/composables/collectivites/useCommunesGeoJoin';
import {
  buildCollectivitesMapConfig,
  type CommuneMappee,
  type DepartementAgrege,
} from '~/config/map-collectivites';

interface Props {
  communes: CommuneGeo[];
  height?: string;
  focusSlug?: string;
}

const props = withDefaults(defineProps<Props>(), {
  height: '480px',
  focusSlug: undefined,
});

const router = useRouter();
const { rattacher, empriseDepartement } = useCommunesGeoJoin();

/**
 * Charge utile d'un clic : l'objet joint (agrégat de département ou commune) si
 * le polygone en a un, les propriétés brutes de la feature sinon.
 */
type ChargeUtile = Partial<DepartementAgrege & CommuneMappee>;

/** Collectivités réellement cartographiables (les 5 villes n'ont pas de polygone). */
const placeable = computed<CommuneMappee[]>(() =>
  props.communes.flatMap((commune) => {
    const rattachement = rattacher(commune);
    return rattachement ? [{ ...commune, ...rattachement }] : [];
  }),
);

/**
 * Collectivités listées mais absentes du fond : ce sont exactement les 5 villes
 * (Dakar, Pikine, Guédiawaye, Rufisque, Thiès), dont le territoire se confond
 * avec celui de leurs communes — le fond ne porte que le niveau `commune`.
 */
const villesNonDessinees = computed(() => {
  const dessinees = new Set(placeable.value.map((c) => c.slug));
  return props.communes.filter((c) => !dessinees.has(c.slug)).map((c) => c.nom);
});

/**
 * Agrégats départementaux dérivés des communes AFFICHÉES, pas du référentiel
 * entier : un filtre de l'annuaire doit se lire sur la carte, département par
 * département.
 */
const departements = computed<DepartementAgrege[]>(() => {
  const parDept = new Map<string, DepartementAgrege>();
  for (const commune of placeable.value) {
    const agrege = parDept.get(commune.deptSlug) ?? {
      deptSlug: commune.deptSlug,
      nom: commune.departement,
      region: commune.region,
      nombreCommunes: 0,
      population: 0,
      avecMaire: 0,
    };
    agrege.nombreCommunes += 1;
    agrege.population += commune.population ?? 0;
    if (commune.maire) agrege.avecMaire += 1;
    parDept.set(commune.deptSlug, agrege);
  }
  return [...parDept.values()];
});

const departementOuvert = ref<string | null>(null);

// ── Caméra ────────────────────────────────────────────────────────
// Sans recadrage, entrer dans un département laisserait l'utilisateur au zoom
// national devant une poignée de polygones minuscules.
const carte = ref<{
  flyTo: (lng: number, lat: number, zoom?: number, duration?: number) => void;
  fitBounds: (bounds: [[number, number], [number, number]], padding?: number) => void;
  closePopup: () => void;
  // `defineExpose` déballe les refs : c'est bien la collection, pas un Ref.
  geoJsonCommunes: FeatureCollection | null;
} | null>(null);

/** Vue nationale de départ, à retrouver à l'identique en remontant d'un niveau. */
const VUE_NATIONALE = { centre: [-14.4524, 14.4974] as const, zoom: 6.4 };

/** Emprise exacte d'un polygone du fond, ou `null` s'il n'est pas (encore) chargé. */
function emprisePolygone(geoSlug: string): [[number, number], [number, number]] | null {
  const feature = carte.value?.geoJsonCommunes?.features.find(
    (f) => f.properties?.slug === geoSlug,
  );
  if (!feature) return null;

  let ouest = Infinity;
  let sud = Infinity;
  let est = -Infinity;
  let nord = -Infinity;
  // Parcours générique des positions : Polygon comme MultiPolygon, sans se
  // soucier de la profondeur d'imbrication.
  const parcourir = (noeud: unknown): void => {
    if (!Array.isArray(noeud)) return;
    if (typeof noeud[0] === 'number' && typeof noeud[1] === 'number') {
      ouest = Math.min(ouest, noeud[0]);
      est = Math.max(est, noeud[0]);
      sud = Math.min(sud, noeud[1]);
      nord = Math.max(nord, noeud[1]);
      return;
    }
    for (const enfant of noeud) parcourir(enfant);
  };
  parcourir((feature.geometry as { coordinates?: unknown }).coordinates);

  return Number.isFinite(ouest) ? [[ouest, sud], [est, nord]] : null;
}

function cadrer(deptSlug: string | null) {
  if (!carte.value) return;

  // Fiche d'une collectivité : on cadre sur SON contour, au plus juste.
  if (props.focusSlug) {
    const focus = placeable.value.find((c) => c.slug === props.focusSlug);
    const emprise = focus ? emprisePolygone(focus.geoSlug) : null;
    // Ville sans polygone propre : repli sur l'emprise de ses communes.
    const cible = emprise ?? (deptSlug ? empriseDepartement(deptSlug) : null);
    if (cible) carte.value.fitBounds(cible, 24);
    return;
  }

  if (!deptSlug) {
    carte.value.flyTo(VUE_NATIONALE.centre[0], VUE_NATIONALE.centre[1], VUE_NATIONALE.zoom);
    return;
  }
  // Emprise des CENTROÏDES : les polygones débordent forcément, d'où une marge
  // généreuse plutôt qu'un cadrage au plus juste.
  const emprise = empriseDepartement(deptSlug);
  if (emprise) carte.value.fitBounds(emprise, 80);
}

watch(departementOuvert, cadrer);

// Un filtre qui vide le département ouvert laisserait une carte muette : on
// remonte au niveau national plutôt que d'afficher un département sans commune.
// Exception : en mode fiche, le département reste ouvert même sans commune
// jointe — c'est le cas des 5 villes, dont on veut quand même situer le
// territoire (voir le repli ci-dessous).
watch(departements, (liste) => {
  if (props.focusSlug) return;
  if (departementOuvert.value && !liste.some((d) => d.deptSlug === departementOuvert.value)) {
    departementOuvert.value = null;
  }
});

// Mise en avant d'une commune (fiche) : on ouvre d'emblée son département et on
// cadre sur elle. Le fond géo arrive après le premier rendu, donc ce bloc est
// rejoué à chaque évolution de `placeable` — et `cadrer` est appelé à la main :
// au second passage le département est déjà le bon, le watch de la caméra ne se
// redéclencherait pas alors que la carte, elle, n'est prête que maintenant.
watch(
  () => [props.focusSlug, placeable.value] as const,
  ([slug]) => {
    if (!slug) return;
    const cible = placeable.value.find((c) => c.slug === slug);
    // Collectivité sans polygone (une ville) : on ouvre son département déduit
    // du nom, sinon la fiche afficherait une carte vide. Les slugs du fond sont
    // construits sur la même normalisation que `slugifyGeoName`.
    const departement = props.communes.find((c) => c.slug === slug)?.departement;
    departementOuvert.value =
      cible?.deptSlug ??
      (departement ? `departement-${slugifyGeoName(departement)}` : departementOuvert.value);
    nextTick(() => cadrer(departementOuvert.value));
  },
  { immediate: true },
);

const mapConfig = computed(() =>
  buildCollectivitesMapConfig({
    communes: placeable.value,
    departements: departements.value,
    departementOuvert: departementOuvert.value,
    focusSlug: props.focusSlug,
  }),
);

/**
 * Toute navigation passe par une action explicite du popup : un clic sur un
 * polygone se contente d'ouvrir la fiche de survol. Descendre d'un niveau — ou
 * pire, changer de page — au premier clic serait un piège sur une carte qu'on
 * explore, et laissait un popup périmé ouvert par-dessus le nouveau niveau.
 */
function onPopupAction({ event, data }: { event: string; data: ChargeUtile }) {
  if (event === 'drill-down' && data?.deptSlug) {
    departementOuvert.value = data.deptSlug;
    carte.value?.closePopup();
    return;
  }
  if (event === 'ouvrir-fiche') {
    // Vérification obligatoire : sur un polygone sans commune jointe, `slug`
    // serait celui du fond géo (`commune-…`), pas une URL de fiche valide.
    const commune = placeable.value.find((c) => c.slug === data?.slug);
    if (commune) router.push(`/collectivites-territoriales/communes/${commune.slug}`);
  }
}
</script>
