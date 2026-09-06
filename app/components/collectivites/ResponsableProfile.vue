<!--
  Gabarit plein d'un responsable de collectivité (onglets « Le maire » et
  « Secrétariat municipal »). Tous les champs viennent du mandat en cours ;
  aucune donnée n'est complétée quand elle manque.
-->
<template>
  <div class="grid gap-6 lg:grid-cols-3">
    <div class="rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
      <CmsImage
        v-if="responsable.photo"
        :src="responsable.photo"
        :alt="responsable.nom"
        :width="320"
        :height="320"
        class="mx-auto h-40 w-40 rounded-full object-cover"
      />
      <div
        v-else
        class="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-sky-600 to-sky-400 text-5xl font-bold text-white"
      >
        {{ initiales }}
      </div>
      <div class="mt-6 text-center">
        <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ responsable.nom }}</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ responsable.fonction || `${role} de ${commune.nom}` }}
        </div>
        <NuxtLink
          v-if="lien"
          :to="lien"
          class="text-primary-600 dark:text-primary-400 mt-4 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-gray-200 transition hover:bg-gray-50 dark:ring-gray-700 dark:hover:bg-gray-700"
        >
          Voir la fiche complète
          <UIcon name="i-heroicons-arrow-right-20-solid" class="size-4" />
        </NuxtLink>
      </div>
    </div>

    <div
      class="rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2"
    >
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Mandat en cours</h2>
      <div class="grid gap-x-8 md:grid-cols-2">
        <CollectivitesInfoRow label="Fonction" :value="responsable.fonction || role" />
        <CollectivitesInfoRow label="Collectivité" :value="commune.nom" />
        <CollectivitesInfoRow label="Département" :value="commune.departement" />
        <CollectivitesInfoRow label="Région" :value="commune.region" />
        <CollectivitesInfoRow
          v-if="responsable.depuis"
          label="En fonction depuis"
          :value="formatDate(responsable.depuis)"
        />
        <CollectivitesInfoRow v-if="genre" label="Genre" :value="genre" />
      </div>

      <p class="mt-6 max-w-3xl text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {{ intro }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommuneGeo, CommuneResponsable } from '~~/types/collectivite';
import { getResponsableLien } from '~/composables/collectivites/responsable';

interface Props {
  responsable: CommuneResponsable;
  role: string;
  commune: CommuneGeo;
  intro: string;
}

const props = defineProps<Props>();

const lien = computed(() => getResponsableLien(props.responsable) ?? undefined);

const initiales = computed(() =>
  props.responsable.nom
    .split(/\s+/)
    .map((mot) => mot[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase(),
);

// `sexe` est saisi au CMS en H/F ; toute autre valeur n'est pas interprétée.
const genre = computed(() => {
  const sexe = props.responsable.sexe?.toUpperCase();
  if (sexe === 'H' || sexe === 'M') return 'Masculin';
  if (sexe === 'F') return 'Féminin';
  return null;
});

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
</script>
