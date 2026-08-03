<script setup lang="ts">
/**
 * SenegalMap — Composant carte principal, piloté par configuration.
 *
 * Passer un SenegalMapConfig et tout s'affiche : fond de carte, couches
 * de données (deck.gl), légende, filtres, sidebar, popups.
 *
 * Voir useMapEngine.ts pour l'architecture MapLibre + deck.gl.
 */
// PERF-8 : le CSS MapLibre est importé ICI (pas dans le css: global de nuxt.config)
// → Vite le rattache au chunk de ce composant, chargé seulement sur les pages cartes.
import 'maplibre-gl/dist/maplibre-gl.css';
import type { SenegalMapConfig, LegendConfig, FilterConfig, GeoSourceKey } from '~~/types/map';
import { DEFAULT_MAP_PRESETS } from '~/config/map-presets';
import { useMapEngine } from '~/composables/useMapEngine';
import { useMapLayers } from '~/composables/useMapLayers';
import { useMapPopup } from '~/composables/useMapPopup';
import { useMapFilters } from '~/composables/useMapFilters';
import { useMapExport } from '~/composables/useMapExport';
import { useMapStore } from '~/stores/map';
import type { FeatureCollection } from 'geojson';

const props = defineProps<{
  config: SenegalMapConfig;
  /**
   * Hauteur du conteneur. Non renseignée = plein écran sous l'en-tête, ce
   * qu'attendent les pages carte dédiées ; les cartes encapsulées dans une page
   * (annuaire, fiche commune) passent leur propre hauteur.
   */
  height?: string;
}>();


const emit = defineEmits<{
  'region-click': [payload: { code: string; name: string; data: any }];
  'marker-click': [payload: { layerId: string; data: any; coordinates: [number, number] }];
  'viewport-change': [payload: { center: [number, number]; zoom: number }];
  'filter-change': [payload: Record<string, any>];
  action: [payload: { event: string; data: any }];
  /** Moteur initialisé : avant cet événement, flyTo/fitBounds sont sans effet. */
  ready: [];
}>();

// ─── Core ──────────────────────────────────────────────────────
const mapContainer = ref<HTMLElement | null>(null);
const isMobile = ref(false);
const store = useMapStore();
const engine = useMapEngine();

// ─── GeoJSON ───────────────────────────────────────────────────
// `communes` = polygones (1 Mo), `communeLabels` = centroïdes (111 Ko) : deux
// fichiers, deux rôles. Ne jamais confondre, le second seul sert à étiqueter.
const geoJsonRegions = shallowRef<FeatureCollection | null>(null);
const geoJsonDepartements = shallowRef<FeatureCollection | null>(null);
const geoJsonCommunes = shallowRef<FeatureCollection | null>(null);
const geoJsonCommuneLabels = shallowRef<FeatureCollection | null>(null);

const GEO_FILES: Record<GeoSourceKey, string> = {
  regions: '/geo/senegal-regions.geojson',
  departements: '/geo/senegal-departements.geojson',
  communes: '/geo/senegal-communes.geojson',
  communeLabels: '/geo/senegal-communes-labels.geojson',
};

/** Ce que chargeaient toutes les cartes avant l'arrivée des polygones de commune. */
const DEFAULT_GEO_SOURCES: GeoSourceKey[] = ['regions', 'departements', 'communeLabels'];

const geoTargets: Record<GeoSourceKey, typeof geoJsonRegions> = {
  regions: geoJsonRegions,
  departements: geoJsonDepartements,
  communes: geoJsonCommunes,
  communeLabels: geoJsonCommuneLabels,
};

/** Fonds déjà demandés — un fond chargé n'est jamais rechargé ni relâché. */
const geoRequested = new Set<GeoSourceKey>();

/**
 * Charge les fonds manquants. Appelée au montage ET à chaque changement de
 * `config.geoSources` : une carte à drill-down ne demande les polygones de
 * commune qu'au moment où l'utilisateur descend d'un niveau.
 */
async function loadGeoSources(keys: GeoSourceKey[]) {
  const missing = keys.filter((key) => !geoRequested.has(key));
  if (!missing.length) return;
  for (const key of missing) geoRequested.add(key);

  await Promise.all(
    // Échec de chargement = fond absent, jamais d'erreur : le reste de la carte
    // doit rester utilisable.
    missing.map((key) =>
      fetch(GEO_FILES[key])
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((data) => {
          geoTargets[key].value = data;
        }),
    ),
  );
}

watch(
  () => props.config.geoSources,
  (keys) => {
    if (keys) loadGeoSources(keys);
  },
);

// ─── Filtres ───────────────────────────────────────────────────
const filterConfigs = computed<FilterConfig[]>(() => props.config.filters ?? []);
const { activeFilters, setFilter, resetFilters, activeFilterCount } = useMapFilters(filterConfigs);

// ─── Couches deck.gl ───────────────────────────────────────────
const { layers: layerConfigs } = useMapLayers({
  datasets: computed(() => props.config.datasets),
  geoJsonRegions,
  geoJsonDepartements,
  geoJsonCommunes,
  geoJsonCommuneLabels,
  theme: toRef(store, 'theme'),
  activeFilters,
  filterConfigs,
  viewport: engine.viewport,
  layerVisibility: toRef(store, 'layerVisibility'),
});

// ─── Popup / Export / Légende ──────────────────────────────────
const { popup, handlePickInfo, closePopup } = useMapPopup(computed(() => props.config.datasets));
const { exportPNG, exportCSV } = useMapExport();
const presets = computed(() => props.config.presets ?? DEFAULT_MAP_PRESETS);

const activeLegend = computed<LegendConfig | null>(() => {
  if (!props.config.legend) return null;
  if (typeof props.config.legend === 'function') {
    const visibleDs = props.config.datasets.find((ds) => store.layerVisibility[ds.id] !== false);
    return props.config.legend(visibleDs?.id ?? '');
  }
  return props.config.legend;
});

// ─── Modules deck.gl (chargés dynamiquement côté client) ──────
let DeckLayers: any = null;

async function loadDeckModules() {
  const [layers, geo, agg] = await Promise.all([
    import('@deck.gl/layers'),
    import('@deck.gl/geo-layers'),
    import('@deck.gl/aggregation-layers'),
  ]);
  DeckLayers = { ...layers, ...geo, ...agg };
}

/** Transforme les configs (objets plats) en instances deck.gl réelles */
function buildDeckLayers(configs: any[]): any[] {
  if (!DeckLayers) return [];

  const typeMap: Record<string, string> = {
    choropleth: 'GeoJsonLayer',
    geojson: 'GeoJsonLayer',
    scatterplot: 'ScatterplotLayer',
    icon: 'ScatterplotLayer',
    heatmap: 'HeatmapLayer',
    arc: 'ArcLayer',
    path: 'PathLayer',
    text: 'TextLayer',
    cluster: 'ScatterplotLayer',
  };

  return configs
    .map((cfg) => {
      const LayerClass = DeckLayers[typeMap[cfg._type]];
      if (!LayerClass) return null;
      try {
        const { _type, _dsId, clusterRadius, clusterMaxZoom, ...rest } = cfg;
        return new LayerClass(rest);
      } catch (err) {
        console.warn(`[SenegalMap] Layer "${cfg._type}" creation failed:`, err);
        return null;
      }
    })
    .filter(Boolean);
}

// ─── Watchers ──────────────────────────────────────────────────

// Couches → deck.gl (quand engine prête)
watch(
  layerConfigs,
  (c) => {
    if (engine.isReady.value) engine.updateLayers(buildDeckLayers(c));
  },
  { deep: true },
);
watch(engine.isReady, (ready) => {
  if (ready) engine.updateLayers(buildDeckLayers(layerConfigs.value));
});

// Viewport / filtres → store + emit
watch(engine.viewport, (v) => {
  store.updateViewport(v);
  emit('viewport-change', { center: v.center, zoom: v.zoom });
});
watch(
  activeFilters,
  (val) => {
    store.activeFilters = val;
    emit('filter-change', { ...val });
  },
  { deep: true },
);

// Thème → engine + rebuild layers
watch(
  () => store.theme,
  (t) => {
    engine.switchTheme(t);
    nextTick(() => engine.updateLayers(buildDeckLayers(layerConfigs.value)));
  },
);

// ─── Actions ───────────────────────────────────────────────────
function handleExportPNG() {
  exportPNG(() => engine.getCanvas(), {
    title: props.config.title || 'Carte du Sénégal',
    subtitle: props.config.description,
    legend: activeLegend.value,
    fileName: props.config.title?.replace(/\s+/g, '-').toLowerCase() || 'carte-senegal',
    fitBounds: () =>
      new Promise<void>((resolve) => {
        const map = engine.mapInstance.value;
        if (!map) return resolve();
        map.jumpTo({ center: [-14.45, 14.45], zoom: 5.6, pitch: 0, bearing: 0 });
        map.once('idle', () => resolve());
        setTimeout(resolve, 8000);
      }),
    captureSnapshot: () => engine.captureSnapshot(),
  });
}

function handleExportCSV() {
  const ds = props.config.datasets.find((d) => store.layerVisibility[d.id] !== false);
  if (ds) exportCSV(ds, props.config.title?.replace(/\s+/g, '-').toLowerCase() || 'carte-senegal');
}

function handleMapClick(info: any) {
  showTapHint.value = false;

  if (!info.picked || !info.object) {
    closePopup();
    return;
  }

  handlePickInfo(info);

  const layerId = info.layer?.id?.replace('layer-', '') ?? '';
  const ds = props.config.datasets.find((d) => d.id === layerId);

  if (ds?.type === 'choropleth' && info.object?.properties) {
    store.selectRegion(info.object.properties.code ?? '');
    emit('region-click', {
      code: info.object.properties.code ?? '',
      name: info.object.properties.name ?? '',
      data: info.object.properties._mapData ?? info.object.properties,
    });
  } else {
    const coords = ds?.getPosition
      ? ds.getPosition(info.object)
      : [info.coordinate?.[0] ?? 0, info.coordinate?.[1] ?? 0];
    emit('marker-click', { layerId, data: info.object, coordinates: coords as [number, number] });
  }
}

// ─── Responsive ────────────────────────────────────────────────
const showTapHint = ref(false);

function checkMobile() {
  isMobile.value = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;
}

// ─── Lifecycle ─────────────────────────────────────────────────
onMounted(async () => {
  if (!mapContainer.value) return;

  checkMobile();
  window.addEventListener('resize', checkMobile);
  store.initFromConfig(props.config);

  // Charger deck.gl + les seuls fonds géo que la config exploite. Le fichier des
  // polygones de commune pèse 1 Mo : le télécharger sur toutes les cartes du
  // site alors qu'une seule s'en sert serait payé par tous les visiteurs.
  await Promise.all([
    loadDeckModules().catch(() => null),
    loadGeoSources(props.config.geoSources ?? DEFAULT_GEO_SOURCES),
  ]);

  await engine.initMap(mapContainer.value, {
    center: props.config.center ?? [-14.4524, 14.4974],
    zoom: props.config.zoom ?? 7,
    theme: props.config.theme ?? 'dark',
    interactionMode: props.config.interactionMode ?? 'flat',
    isMobile: isMobile.value,
    onClick: handleMapClick,
  });

  if (isMobile.value) {
    showTapHint.value = true;
    setTimeout(() => {
      showTapHint.value = false;
    }, 4000);
  }

  activeFilters.value = { ...store.activeFilters };
  await nextTick();
  engine.resize();
  emit('ready');
});

onUnmounted(() => window.removeEventListener('resize', checkMobile));

// Pilotage de la caméra depuis le parent : une carte à drill-down doit pouvoir
// cadrer le territoire qu'elle vient d'ouvrir.
defineExpose({
  flyTo: engine.flyTo,
  fitBounds: engine.fitBounds,
  closePopup,
  // Exposé pour cadrer sur une feature précise sans refetcher ni reparser le
  // fichier des polygones (1 Mo) que ce composant vient déjà de charger.
  geoJsonCommunes,
});
</script>

<template>
  <!-- Sans `height`, la hauteur plein écran vient de la règle .senegal-map ci-dessous. -->
  <div class="senegal-map relative w-full" :style="{ height }">
    <!--
      Inline styles obligatoires : MapLibre injecte .maplibregl-map { position: relative }
      qui écrase Tailwind `absolute` → le container perd ses dimensions.
      Les inline styles sont prioritaires sur les sélecteurs de classe.
    -->
    <div
      ref="mapContainer"
      style="position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none"
    />

    <div
      v-if="config.title && config.showTitle !== false && !isMobile"
      class="pointer-events-none absolute left-4 top-4 z-20 max-w-[50%]"
    >
      <h2
        class="rounded-lg border border-white/5 bg-gray-900/60 px-3 py-1.5 text-base font-semibold text-white drop-shadow-lg backdrop-blur-sm"
      >
        {{ config.title }}
      </h2>
      <p
        v-if="config.description"
        class="mt-1 rounded bg-gray-900/40 px-3 py-1 text-xs text-gray-400 backdrop-blur-sm"
      >
        {{ config.description }}
      </p>
    </div>

    <MapSidebar
      v-if="config.sidebar"
      :config="config.sidebar"
      :selected-data="store.selectedItem"
      :is-mobile="isMobile"
    />
    <MapLegend v-if="activeLegend" :config="activeLegend" :is-mobile="isMobile" />

    <MapFilters
      v-if="config.filters?.length"
      :filters="config.filters"
      :active-filters="activeFilters"
      :active-count="activeFilterCount"
      :is-mobile="isMobile"
      @update="setFilter"
      @reset="resetFilters"
    />

    <MapControls
      v-if="config.controls"
      :config="config.controls"
      :datasets="config.datasets"
      :presets="presets"
      :layer-visibility="store.layerVisibility"
      :theme="store.theme"
      :is-mobile="isMobile"
      @toggle-layer="store.toggleLayer"
      @fly-to="engine.flyTo"
      @toggle-theme="store.toggleTheme"
      @export-png="handleExportPNG"
      @export-csv="handleExportCSV"
      @zoom-in="engine.zoomIn()"
      @zoom-out="engine.zoomOut()"
      @reset-north="engine.resetNorth()"
    />

    <MapPopup
      v-if="popup.visible && popup.config && popup.data"
      :config="popup.config"
      :data="popup.data"
      :position="popup.position"
      :is-mobile="isMobile"
      @close="closePopup"
      @action="(e: string) => emit('action', { event: e, data: popup.data })"
    />

    <Transition name="fade">
      <div
        v-if="showTapHint && isMobile"
        class="pointer-events-none absolute left-1/2 top-14 z-20 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs text-white backdrop-blur-sm"
      >
        Touchez une region pour voir les details
      </div>
    </Transition>

    <!-- Loading -->
    <div
      v-if="!engine.isReady.value"
      class="absolute inset-0 z-30 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm"
    >
      <div class="text-center">
        <div
          class="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-white sm:h-10 sm:w-10"
        />
        <p class="text-xs text-white sm:text-sm">Chargement de la carte…</p>
      </div>
    </div>

    <!-- WebGL context lost -->
    <div
      v-if="engine.isContextLost.value"
      class="absolute inset-0 z-40 flex items-center justify-center bg-red-900/80 px-4"
    >
      <div class="p-4 text-center text-white sm:p-6">
        <p class="mb-2 text-base font-bold sm:text-lg">Erreur WebGL</p>
        <p class="text-xs sm:text-sm">Le contexte graphique a été perdu. Rechargez la page.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Hauteur par défaut (aucune prop `height`) : plein écran sous l'en-tête. La
   seconde déclaration l'emporte là où `dvh` existe — elle suit la barre d'URL
   mobile ; la première reste le filet pour les navigateurs sans. */
.senegal-map {
  height: calc(100vh - 64px);
  height: calc(100dvh - 64px);
}

.senegal-map :deep(.maplibregl-canvas) {
  outline: none;
}

/* On fournit nos propres contrôles */
.senegal-map :deep(.maplibregl-ctrl-top-right),
.senegal-map :deep(.maplibregl-ctrl-top-left) {
  display: none;
}

.senegal-map :deep(.maplibregl-ctrl-attrib) {
  font-size: 9px;
  background: rgba(0, 0, 0, 0.3) !important;
  color: rgba(255, 255, 255, 0.5) !important;
  border-radius: 4px;
  padding: 2px 6px;
}
.senegal-map :deep(.maplibregl-ctrl-attrib a) {
  color: rgba(255, 255, 255, 0.6) !important;
}
</style>
