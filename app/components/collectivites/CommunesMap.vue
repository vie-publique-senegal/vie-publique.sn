<!--
  Carte des communes (module Collectivités territoriales) — Leaflet.

  Unique point d'entrée cartographique du module : vue « Carte » de l'annuaire,
  page carte plein écran et mini-cartes des fiches communes passent tous par ici.

  ⚠️ Le référentiel géo (`geo_entities`) ne porte AUCUNE géométrie : les points
  affichés viennent des centroïdes de `public/geo/senegal-communes.geojson`,
  rapprochés par nom + département côté client. Seule une partie des communes a
  donc des coordonnées — celles sans sont simplement absentes de la carte (elles
  restent listées dans les vues Cartes et Liste), et le compteur le dit.

  Migration prévue (à faire une fois les communes géométrées) : remplacer
  l'intérieur par le moteur MapLibre + deck.gl existant
  (app/composables/useMapEngine.ts + public/geo/senegal-departements.geojson),
  avec affichage des départements par défaut et drill-down département → communes.
  Les props de ce composant (communes / height / focusSlug) ne doivent pas changer
  pour que les call-sites restent intacts.
-->
<template>
  <div
    ref="containerRef"
    class="relative overflow-hidden rounded-xl ring-1 ring-gray-200 dark:ring-gray-700"
    :style="{ height }"
  >
    <ClientOnly>
      <LMap
        :zoom="zoom"
        :center="center"
        :use-global-leaflet="false"
        class="z-0 h-full w-full"
        @ready="onMapReady"
      >
        <LTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          layer-type="base"
          name="OpenStreetMap"
        />
        <LCircleMarker
          v-for="c in placeable"
          :key="c.slug"
          :lat-lng="[c.latitude, c.longitude]"
          :radius="markerRadius(c)"
          :color="markerColor(c)"
          :fill-color="markerColor(c)"
          :fill-opacity="0.55"
          :weight="2"
        >
          <LTooltip :options="{ direction: 'top', offset: [0, -4] }">
            <strong>{{ c.nom }}</strong>
          </LTooltip>
          <LPopup>
            <div style="min-width: 200px">
              <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px">{{ c.nom }}</div>
              <div style="font-size: 12px; color: #555">{{ c.region }} · {{ c.departement }}</div>
              <div style="font-size: 12px; margin-top: 6px">
                <div v-if="c.maire">
                  Maire : <strong>{{ c.maire.nom }}</strong>
                </div>
                <div v-if="c.population !== null">
                  Population : {{ formatNumber(c.population) }} hab.
                </div>
              </div>
              <NuxtLink
                :to="`/collectivites-territoriales/communes/${c.slug}`"
                style="
                  display: inline-block;
                  margin-top: 8px;
                  padding: 6px 10px;
                  background: #0284c7;
                  color: #fff;
                  border-radius: 6px;
                  font-size: 12px;
                  text-decoration: none;
                "
              >
                Voir la fiche →
              </NuxtLink>
            </div>
          </LPopup>
        </LCircleMarker>
      </LMap>
      <template #fallback>
        <div
          class="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        >
          Chargement de la carte…
        </div>
      </template>
    </ClientOnly>

    <!-- Couverture réelle des points affichés : ne pas laisser croire que la
         carte montre l'intégralité des collectivités listées. -->
    <div
      v-if="placeable.length < communes.length"
      class="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-md bg-white/90 px-2.5 py-1.5 text-[11px] text-gray-600 shadow-sm backdrop-blur dark:bg-gray-800/90 dark:text-gray-300"
    >
      {{ formatNumber(placeable.length) }} / {{ formatNumber(communes.length) }} collectivités
      localisées
    </div>
  </div>
</template>

<script setup lang="ts">
// PERF-8 (nuxt.config.ts) : l'injection globale de leaflet.css est désactivée,
// chaque composant qui rend une carte Leaflet doit l'importer lui-même — sans ce
// CSS, les tuiles perdent leur positionnement/dimensionnement Leaflet (`max-width:
// none` etc.) et Tailwind preflight les corrompt (tuiles manquantes en damier).
import 'leaflet/dist/leaflet.css';
import type { CommuneGeo } from '~~/types/collectivite';
import { formatNumber } from '#shared/format';
import { normalizeGeoName } from '#shared/geo-name';

interface Props {
  communes: CommuneGeo[];
  height?: string;
  focusSlug?: string;
}

const props = withDefaults(defineProps<Props>(), {
  height: '480px',
  focusSlug: undefined,
});

interface CentroidCollection {
  features: {
    properties?: { name?: string; department?: string };
    geometry?: { type?: string; coordinates?: [number, number] };
  }[];
}

// Centroïdes : asset statique chargé côté client uniquement (la carte est déjà
// dans <ClientOnly>, et un asset de `public/` n'est pas atteignable depuis le
// rendu serveur). Échec de chargement = carte sans point, jamais d'erreur.
const { data: centroidData } = useFetch<CentroidCollection>('/geo/senegal-communes.geojson', {
  key: 'geo-centroides-communes',
  server: false,
  default: () => ({ features: [] }),
});

/** Index nom+département normalisés → [lat, lng], pour ne pas placer un homonyme ailleurs. */
const centroids = computed(() => {
  const index = new Map<string, [number, number]>();
  for (const feature of centroidData.value?.features ?? []) {
    if (feature.geometry?.type !== 'Point' || !feature.geometry.coordinates) continue;
    const [longitude, latitude] = feature.geometry.coordinates;
    index.set(
      `${normalizeGeoName(feature.properties?.name)}|${normalizeGeoName(feature.properties?.department)}`,
      [latitude, longitude],
    );
  }
  return index;
});

/** Communes réellement plaçables (le référentiel n'a pas de géométrie). */
type PlaceableCommune = CommuneGeo & { latitude: number; longitude: number };
const placeable = computed<PlaceableCommune[]>(() =>
  props.communes.flatMap((c) => {
    const centroid = centroids.value.get(
      `${normalizeGeoName(c.nom)}|${normalizeGeoName(c.departement)}`,
    );
    return centroid ? [{ ...c, latitude: centroid[0], longitude: centroid[1] }] : [];
  }),
);

// Centre du Sénégal par défaut ; zoom serré sur la commune en mode focus
const focus = computed(() =>
  props.focusSlug ? placeable.value.find((c) => c.slug === props.focusSlug) : undefined,
);
const center = computed<[number, number]>(() =>
  focus.value ? [focus.value.latitude, focus.value.longitude] : [14.4974, -14.4524],
);
const zoom = computed(() => (focus.value ? 11 : 6.5));

const markerRadius = (c: PlaceableCommune) =>
  c.population ? Math.max(6, Math.min(22, Math.log10(c.population) * 3)) : 6;
const markerColor = (c: PlaceableCommune) => (c.slug === props.focusSlug ? '#1D9BF0' : '#0284c7');

// Leaflet ne recharge les tuiles que pour la taille du conteneur au moment de
// l'initialisation. Ici le conteneur vit dans une carte à ring/padding, un onglet
// routé ou un panneau superposé : sa taille finale n'est pas garantie stable au
// premier rendu → sans `invalidateSize()`, une partie des tuiles reste vide
// (damier). On resynchronise à l'événement `ready` puis à chaque resize réel du
// conteneur (ResizeObserver), pas seulement au montage.
const containerRef = ref<HTMLElement | null>(null);
let mapInstance: { invalidateSize: () => void } | null = null;
let resizeObserver: ResizeObserver | undefined;

const onMapReady = (map: { invalidateSize: () => void }) => {
  mapInstance = map;
  nextTick(() => map.invalidateSize());
};

onMounted(() => {
  if (!containerRef.value) return;
  resizeObserver = new ResizeObserver(() => mapInstance?.invalidateSize());
  resizeObserver.observe(containerRef.value);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>
