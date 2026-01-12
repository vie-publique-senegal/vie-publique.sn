<script setup lang="ts">
const appConfig = useAppConfig();
const { country, labels, features } = appConfig.vpsnElections;
</script>

<template>
  <div class="p-8">
    <h1 class="text-3xl font-bold mb-4">VPSN Elections Layer - Playground</h1>

    <div class="space-y-4">
      <div>
        <h2 class="text-xl font-bold">Configuration Pays</h2>
        <p>Pays: {{ country.name }} ({{ country.code }})</p>
      </div>

      <div>
        <h2 class="text-xl font-bold">Labels</h2>
        <ul>
          <li>Départements: {{ labels.departments }}</li>
          <li>Régions: {{ labels.regions }}</li>
          <li>Élection Présidentielle: {{ labels.presidential }}</li>
        </ul>
      </div>

      <div>
        <h2 class="text-xl font-bold">Features</h2>
        <ul>
          <li>Diaspora: {{ features.showDiaspora }}</li>
          <li>Guide: {{ features.showGuide }}</li>
          <li>Cartes: {{ features.showMaps }}</li>
        </ul>
      </div>

      <div class="mt-8">
        <h2 class="text-xl font-bold mb-2">Pages du Layer</h2>
        <ul class="space-y-2">
          <li><NuxtLink to="/elections-senegal" class="text-blue-600 hover:underline">Hub Élections</NuxtLink></li>
          <li><NuxtLink to="/elections-senegal/carte-electorale" class="text-blue-600 hover:underline">Carte Électorale</NuxtLink></li>
          <li><NuxtLink to="/elections-senegal/guide-electoral" class="text-blue-600 hover:underline">Guide Électoral</NuxtLink></li>
          <li><NuxtLink to="/elections-senegal/legislation" class="text-blue-600 hover:underline">Législation</NuxtLink></li>
        </ul>
      </div>
    </div>
  </div>
</template>
