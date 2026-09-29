<template>
  <div class="grid gap-6 lg:grid-cols-3">
    <div
      class="rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2"
    >
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Informations générales
      </h2>
      <div class="grid gap-x-8 md:grid-cols-2">
        <CollectivitesInfoRow label="Nom officiel" :value="commune.nom" />
        <CollectivitesInfoRow label="Statut" :value="commune.type" />
        <CollectivitesInfoRow label="Région" :value="commune.region" />
        <!-- Le département renvoie à son hub (les communes voisines) quand le
             référentiel le rattache ; sinon simple valeur, pas de lien mort. -->
        <CollectivitesInfoRow label="Département">
          <NuxtLink
            v-if="commune.departementSlug"
            :to="`/collectivites-territoriales/departements/${commune.departementSlug}`"
            class="text-primary-600 dark:text-primary-400 hover:underline"
          >
            {{ commune.departement }}
          </NuxtLink>
          <template v-else>{{ commune.departement }}</template>
        </CollectivitesInfoRow>
        <CollectivitesInfoRow
          v-if="commune.arrondissement"
          label="Arrondissement"
          :value="commune.arrondissement"
        />
        <CollectivitesInfoRow label="Chef-lieu" :value="commune.chefLieu ? 'Oui' : 'Non'" />
        <CollectivitesInfoRow
          v-if="commune.population !== null"
          :label="`Population (recensement ${commune.populationAnnee})`"
          :value="`${formatNumber(commune.population)} habitants`"
        />
      </div>
    </div>

    <div class="rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Gouvernance</h2>

      <CollectivitesResponsableCard
        v-if="commune.maire"
        :responsable="commune.maire"
        role="Maire"
      />
      <p v-else class="text-sm text-gray-500 dark:text-gray-400">
        Le maire de cette collectivité n'est pas encore renseigné.
      </p>

      <div
        v-if="commune.secretaireMunicipal"
        class="mt-5 border-t border-gray-100 pt-5 dark:border-gray-700"
      >
        <CollectivitesResponsableCard
          :responsable="commune.secretaireMunicipal"
          role="Secrétaire municipal"
        />
      </div>
    </div>

    <div
      class="rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-3"
    >
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Localisation</h2>
      <!-- La carte ouvre d'elle-même le département de la commune et la met en
           couleur d'accent au milieu de ses voisines (cf. CommunesMap). -->
      <CollectivitesCommunesMap :communes="[commune]" height="360px" :focus-slug="commune.slug" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommuneGeo } from '~~/types/collectivite';
import { formatNumber } from '#shared/format';

interface Props {
  commune: CommuneGeo;
}

defineProps<Props>();
</script>
