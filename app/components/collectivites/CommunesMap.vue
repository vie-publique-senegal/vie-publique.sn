<!--
  Carte des communes (module Collectivités territoriales) — Leaflet.

  Unique point d'entrée cartographique du module : vue « Carte » de l'annuaire,
  page carte plein écran et mini-cartes des fiches communes passent tous par ici.

  Migration prévue (ne pas implémenter tant que les données restent des démos) :
  remplacer l'intérieur par le moteur MapLibre + deck.gl existant
  (app/composables/useMapEngine.ts + public/geo/senegal-departements.geojson),
  avec affichage des départements par défaut et drill-down département → communes
  (public/geo/senegal-communes.geojson une fois complété). Les props de ce
  composant (communes / height / focusSlug) ne doivent pas changer pour que les
  call-sites restent intacts.
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
          v-for="c in communes"
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
                <div>
                  Maire : <strong>{{ c.maire.nom }}</strong>
                </div>
                <div>Population : {{ formatNumber(c.population) }} hab.</div>
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
  </div>
</template>

<script setup lang="ts">
// PERF-8 (nuxt.config.ts) : l'injection globale de leaflet.css est désactivée,
// chaque composant qui rend une carte Leaflet doit l'importer lui-même — sans ce
// CSS, les tuiles perdent leur positionnement/dimensionnement Leaflet (`max-width:
// none` etc.) et Tailwind preflight les corrompt (tuiles manquantes en damier).
import 'leaflet/dist/leaflet.css';
import type { Commune } from '~~/types/collectivite';
import { formatNumber } from '#shared/communes';

interface Props {
  communes: Commune[];
  height?: string;
  focusSlug?: string;
}

const props = withDefaults(defineProps<Props>(), {
  height: '480px',
  focusSlug: undefined,
});

// Centre du Sénégal par défaut ; zoom serré sur la commune en mode focus
const focus = computed(() =>
  props.focusSlug ? props.communes.find((c) => c.slug === props.focusSlug) : undefined,
);
const center = computed<[number, number]>(() =>
  focus.value ? [focus.value.latitude, focus.value.longitude] : [14.4974, -14.4524],
);
const zoom = computed(() => (focus.value ? 11 : 6.5));

const markerRadius = (c: Commune) => Math.max(6, Math.min(22, Math.log10(c.population) * 3));
const markerColor = (c: Commune) => (c.slug === props.focusSlug ? '#1D9BF0' : '#0284c7');

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
