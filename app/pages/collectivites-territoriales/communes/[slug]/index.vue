<script setup lang="ts">
import { COMMUNE_TABS } from '~/composables/collectivites/communeTabs';
import { useCommuneSeo } from '~/composables/collectivites/useCommuneSeo';
import { useCommuneGeo } from '~/composables/collectivites/useCommunesGeo';

const route = useRoute();

// Même clé useAsyncData que la page parente : la donnée est déjà en cache,
// aucune requête supplémentaire n'est émise.
const { commune } = await useCommuneGeo(computed(() => route.params.slug as string));

if (!commune.value) {
  throw createError({ statusCode: 404, statusMessage: 'Commune introuvable', fatal: true });
}

useCommuneSeo(commune.value, COMMUNE_TABS[0]!);
</script>

<template>
  <CollectivitesTabsApercu v-if="commune" :commune="commune" />
</template>
