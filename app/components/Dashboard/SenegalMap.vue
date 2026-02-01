<template>
  <div class="relative w-full" :style="{ height: minHeight }">
    <ClientOnly>
      <LMap
        :zoom="7"
        :center="[14.5, -14.5]"
        :use-global-leaflet="false"
        :options="mapOptions"
        class="z-0 h-full w-full rounded-lg"
      >
        <!-- Fond de carte -->
        <LTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          :attribution="'&copy; OpenStreetMap contributors'"
          :options="{ maxZoom: 18 }"
        />

        <!-- Marqueurs des villes -->
        <LMarker
          v-for="city in cities"
          :key="city.name"
          :lat-lng="[city.lat, city.lng]"
        >
          <LIcon
            :icon-size="[32, 32]"
            :icon-anchor="[16, 32]"
            class-name="custom-marker-icon"
          >
            <div :class="['flex h-8 w-8 items-center justify-center rounded-full text-white shadow-lg border-2 border-white', city.color]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
          </LIcon>
          <LPopup>
            <div class="p-2">
              <h3 class="text-lg font-bold text-gray-900">{{ city.name }}</h3>
              <p class="text-sm text-gray-600">{{ city.projects }} projets en cours</p>
            </div>
          </LPopup>
        </LMarker>
      </LMap>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import {
  LMap,
  LTileLayer,
  LMarker,
  LPopup,
  LIcon,
  LGeoJson,
} from '@vue-leaflet/vue-leaflet';

interface Props {
  projects?: any[];
  minHeight?: string;
}

const props = withDefaults(defineProps<Props>(), {
  projects: () => [],
  minHeight: '500px',
});

// Configuration de la carte
const mapOptions = {
  zoomControl: true,
  scrollWheelZoom: true,
  attributionControl: false,
};

// Données GeoJSON simplifiées du Sénégal (frontières principales)
const senegalGeoJSON = {
  type: 'Feature',
  properties: { name: 'Sénégal' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-17.5, 12.3],
        [-16.7, 12.3],
        [-16.7, 13.7],
        [-15.5, 13.7],
        [-15.0, 15.0],
        [-13.7, 15.7],
        [-12.0, 15.0],
        [-11.4, 12.8],
        [-11.9, 12.3],
        [-12.2, 13.0],
        [-12.5, 12.3],
        [-13.7, 12.6],
        [-15.5, 12.0],
        [-16.0, 12.5],
        [-16.5, 13.6],
        [-17.0, 14.7],
        [-17.5, 13.3],
        [-17.5, 12.3],
      ],
    ],
  },
};

// Principales villes du Sénégal avec coordonnées
const cities = [
  { name: 'Dakar', lat: 14.7167, lng: -17.4677, projects: 89, color: 'bg-red-600' },
  { name: 'Thiès', lat: 14.7886, lng: -16.9260, projects: 45, color: 'bg-blue-600' },
  { name: 'Saint-Louis', lat: 16.0179, lng: -16.5119, projects: 38, color: 'bg-green-600' },
  { name: 'Ziguinchor', lat: 12.5681, lng: -16.2633, projects: 32, color: 'bg-yellow-600' },
  { name: 'Tambacounda', lat: 13.7709, lng: -13.6679, projects: 28, color: 'bg-purple-600' },
  { name: 'Kaolack', lat: 14.1512, lng: -16.0767, projects: 27, color: 'bg-orange-600' },
  { name: 'Touba', lat: 14.8667, lng: -15.8833, projects: 25, color: 'bg-indigo-600' },
  { name: 'Mbour', lat: 14.4167, lng: -16.9667, projects: 22, color: 'bg-pink-600' },
];
</script>

<style scoped>
:deep(.leaflet-container) {
  font-family: inherit;
  border-radius: 0.5rem;
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

:deep(.leaflet-popup-content) {
  margin: 0;
  min-width: 150px;
}

:deep(.custom-marker-icon) {
  background: transparent !important;
  border: none !important;
}
</style>
