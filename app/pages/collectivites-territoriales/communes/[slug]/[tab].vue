<script setup lang="ts">
import type { Component } from 'vue';
import { getVisibleCommuneTabs } from '~/composables/collectivites/communeTabs';
import { useCommuneSeo } from '~/composables/collectivites/useCommuneSeo';
import { useCommuneGeo } from '~/composables/collectivites/useCommunesGeo';
import TabMaire from '~/components/collectivites/tabs/Maire.vue';
import TabSecretariat from '~/components/collectivites/tabs/Secretariat.vue';
import TabContacts from '~/components/collectivites/tabs/Contacts.vue';

// Aperçu vit dans [slug]/index.vue (balise littérale <CollectivitesTabsApercu>,
// auto-importée normalement) - cette route ne gère que les autres onglets.
const TAB_COMPONENTS: Record<string, Component> = {
  maire: TabMaire,
  secretariat: TabSecretariat,
  contacts: TabContacts,
};

const route = useRoute();

const { commune } = await useCommuneGeo(computed(() => route.params.slug as string));

if (!commune.value) {
  throw createError({ statusCode: 404, statusMessage: 'Commune introuvable', fatal: true });
}

// `getVisibleCommuneTabs` filtre sur la donnée réelle : une section sans contenu
// n'a pas d'URL (404), elle n'affiche pas une page vide.
const tab = getVisibleCommuneTabs(commune.value).find((t) => t.path === route.params.tab && t.path);
const tabComponent = tab ? TAB_COMPONENTS[tab.key] : undefined;
if (!tab || !tabComponent) {
  throw createError({ statusCode: 404, statusMessage: 'Section introuvable', fatal: true });
}

useCommuneSeo(commune.value, tab);
</script>

<template>
  <component :is="tabComponent" v-if="commune" :commune="commune" />
</template>
