<template>
  <div class="grid gap-6 md:grid-cols-2">
    <div class="custom-shadow rounded-lg bg-white p-6 dark:bg-gray-800">
      <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">
        Mairie de {{ commune.nom }}
      </h2>
      <CollectivitesInfoRow label="Adresse" :value="mairie.adresse" />
      <CollectivitesInfoRow label="Téléphone">
        <a
          :href="`tel:${mairie.telephone.replace(/\s/g, '')}`"
          class="text-primary-600 dark:text-primary-400 hover:underline"
        >
          {{ mairie.telephone }}
        </a>
      </CollectivitesInfoRow>
      <CollectivitesInfoRow label="Email">
        <a
          :href="`mailto:${mairie.email}`"
          class="text-primary-600 dark:text-primary-400 hover:underline"
        >
          {{ mairie.email }}
        </a>
      </CollectivitesInfoRow>
      <CollectivitesInfoRow v-if="mairie.siteWeb" label="Site internet">
        <a
          :href="mairie.siteWeb"
          target="_blank"
          rel="noreferrer"
          class="text-primary-600 dark:text-primary-400 hover:underline"
        >
          {{ mairie.siteWeb }}
        </a>
      </CollectivitesInfoRow>
      <CollectivitesInfoRow v-if="mairie.facebook" label="Facebook">
        <a
          :href="mairie.facebook"
          target="_blank"
          rel="noreferrer"
          class="text-primary-600 dark:text-primary-400 hover:underline"
        >
          Page officielle
        </a>
      </CollectivitesInfoRow>
      <CollectivitesInfoRow label="Horaires" :value="mairie.horaires" />
    </div>
    <div class="custom-shadow rounded-lg bg-white p-6 dark:bg-gray-800">
      <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Localisation</h2>
      <CollectivitesCommunesMap :communes="[commune]" height="320px" :focus-slug="commune.slug" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commune } from '~~/types/collectivite';

interface Props {
  commune: Commune;
}

const props = defineProps<Props>();

const mairie = computed(() => props.commune.mairie);
</script>
