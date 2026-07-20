<template>
  <div class="grid gap-6 lg:grid-cols-3">
    <div
      class="rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-1"
    >
      <div
        class="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-sky-600 to-sky-400 text-6xl font-bold text-white"
      >
        {{ initials(maire.nom) }}
      </div>
      <div class="mt-6 text-center">
        <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ maire.nom }}</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Maire de {{ commune.nom }}</div>
        <div class="mt-3"><CollectivitesPartiBadge :parti="maire.parti" /></div>
      </div>
    </div>
    <div
      class="rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2"
    >
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        État civil et parcours
      </h2>
      <div class="grid gap-x-8 md:grid-cols-2">
        <CollectivitesInfoRow label="Sexe" :value="maire.sexe === 'H' ? 'Masculin' : 'Féminin'" />
        <CollectivitesInfoRow label="Date de naissance" :value="formatDate(maire.dateNaissance)" />
        <CollectivitesInfoRow label="Profession" :value="maire.profession" />
        <CollectivitesInfoRow label="Parti politique" :value="maire.parti" />
        <CollectivitesInfoRow label="Date d'élection" :value="formatDate(maire.dateElection)" />
        <CollectivitesInfoRow label="Début du mandat" :value="formatDate(maire.debutMandat)" />
        <CollectivitesInfoRow label="Fin du mandat" :value="formatDate(maire.finMandat)" />
        <CollectivitesInfoRow label="Nombre de mandats" :value="maire.nombreMandats" />
      </div>
      <div class="mt-6 max-w-3xl">
        <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Biographie</h3>
        <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {{ maire.biographie }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commune } from '~~/types/collectivite';

interface Props {
  commune: Commune;
}

const props = defineProps<Props>();

const maire = computed(() => props.commune.maire);

const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
const initials = (nom: string) =>
  nom
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
</script>
