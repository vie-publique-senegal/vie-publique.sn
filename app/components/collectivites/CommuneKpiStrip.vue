<!--
  Repères d'une collectivité, dans le bandeau sobre de l'annuaire (valeur en gras
  suivie de son contexte en gris) plutôt qu'en tuiles.

  Uniquement des données du référentiel : une population absente le dit, elle
  n'est pas remplacée par un « 0 » ni par un tiret muet. Le département renvoie à
  son hub — la règle du module veut qu'un texte cliquable se voie sans survol.
-->
<template>
  <section class="mx-auto max-w-7xl px-4">
    <div class="flex flex-wrap gap-6 border-b border-gray-100 py-4 text-sm dark:border-gray-700">
      <div v-if="commune.population !== null">
        <span class="font-bold text-gray-900 dark:text-white">
          {{ formatNumber(commune.population) }}
        </span>
        <span class="text-gray-500 dark:text-gray-400">
          habitants{{ commune.populationAnnee ? ` (RGPH ${commune.populationAnnee})` : '' }}
        </span>
      </div>
      <div v-else class="text-gray-500 dark:text-gray-400">Population non renseignée</div>

      <div v-if="commune.departement">
        <span class="text-gray-500 dark:text-gray-400">Département de </span>
        <NuxtLink
          v-if="commune.departementSlug"
          :to="`/collectivites-territoriales/departements/${commune.departementSlug}`"
          class="text-primary-600 dark:text-primary-400 font-bold hover:underline"
        >
          {{ commune.departement }}
        </NuxtLink>
        <span v-else class="font-bold text-gray-900 dark:text-white">
          {{ commune.departement }}
        </span>
      </div>

      <div v-if="commune.region">
        <span class="text-gray-500 dark:text-gray-400">Région de </span>
        <NuxtLink
          v-if="commune.regionSlug"
          :to="`/collectivites-territoriales/regions/${commune.regionSlug}`"
          class="text-primary-600 dark:text-primary-400 font-bold hover:underline"
        >
          {{ commune.region }}
        </NuxtLink>
        <span v-else class="font-bold text-gray-900 dark:text-white">{{ commune.region }}</span>
      </div>

      <div v-if="commune.chefLieu">
        <span class="font-bold text-gray-900 dark:text-white">Chef-lieu</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CommuneGeo } from '~~/types/collectivite';
import { formatNumber } from '#shared/format';

interface Props {
  commune: CommuneGeo;
}

defineProps<Props>();
</script>
