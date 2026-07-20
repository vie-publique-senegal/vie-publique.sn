<script setup lang="ts">
import { getCommune } from '#shared/communes';
import { COMMUNE_TABS } from '~/composables/collectivites/communeTabs';
import { useCommuneSeo } from '~/composables/collectivites/useCommuneSeo';

const route = useRoute();

const commune = getCommune(route.params.slug as string);
if (!commune) {
  throw createError({ statusCode: 404, statusMessage: 'Commune introuvable', fatal: true });
}

useCommuneSeo(commune, COMMUNE_TABS[0]);
</script>

<template>
  <CollectivitesTabsApercu :commune="commune" />
</template>
