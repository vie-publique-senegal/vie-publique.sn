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
        <CollectivitesInfoRow label="Type" :value="commune.type" />
        <CollectivitesInfoRow label="Région" :value="commune.region" />
        <CollectivitesInfoRow label="Département" :value="commune.departement" />
        <CollectivitesInfoRow label="Chef-lieu" :value="commune.chefLieu ? 'Oui' : 'Non'" />
        <CollectivitesInfoRow label="Code administratif" :value="commune.codeAdministratif" />
        <CollectivitesInfoRow label="Date de création" :value="formatDate(commune.dateCreation)" />
        <CollectivitesInfoRow label="Altitude" :value="`${commune.altitude} m`" />
        <CollectivitesInfoRow label="Latitude" :value="commune.latitude.toFixed(4)" />
        <CollectivitesInfoRow label="Longitude" :value="commune.longitude.toFixed(4)" />
      </div>
    </div>
    <div class="rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Le maire</h2>
      <div class="flex items-start gap-4">
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sky-50 text-2xl font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
        >
          {{ initials(commune.maire.nom) }}
        </div>
        <div class="min-w-0">
          <div class="font-medium text-gray-900 dark:text-white">{{ commune.maire.nom }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ commune.maire.profession }}
          </div>
          <div class="mt-2"><CollectivitesPartiBadge :parti="commune.maire.parti" /></div>
        </div>
      </div>
      <div class="mt-4">
        <CollectivitesInfoRow
          label="Début du mandat"
          :value="formatDate(commune.maire.debutMandat)"
        />
        <CollectivitesInfoRow label="Fin du mandat" :value="formatDate(commune.maire.finMandat)" />
        <CollectivitesInfoRow label="Nombre de mandats" :value="commune.maire.nombreMandats" />
      </div>
    </div>
    <div
      class="rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-3"
    >
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Localisation</h2>
      <CollectivitesCommunesMap :communes="[commune]" height="360px" :focus-slug="commune.slug" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commune } from '~~/types/collectivite';

interface Props {
  commune: Commune;
}

defineProps<Props>();

const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
const initials = (nom: string) =>
  nom
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
</script>
