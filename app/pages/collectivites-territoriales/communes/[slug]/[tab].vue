<script setup lang="ts">
import type { Component } from 'vue';
import { getCommune } from '#shared/communes';
import { getVisibleCommuneTabs } from '~/composables/collectivites/communeTabs';
import { useCommuneSeo } from '~/composables/collectivites/useCommuneSeo';
import TabMaire from '~/components/collectivites/tabs/Maire.vue';
import TabExecutif from '~/components/collectivites/tabs/Executif.vue';
import TabConseil from '~/components/collectivites/tabs/Conseil.vue';
import TabTerritoire from '~/components/collectivites/tabs/Territoire.vue';
import TabBudget from '~/components/collectivites/tabs/Budget.vue';
import TabProjets from '~/components/collectivites/tabs/Projets.vue';
import TabServices from '~/components/collectivites/tabs/Services.vue';
import TabDocuments from '~/components/collectivites/tabs/Documents.vue';
import TabActualites from '~/components/collectivites/tabs/Actualites.vue';
import TabContacts from '~/components/collectivites/tabs/Contacts.vue';

// Aperçu vit dans [slug]/index.vue (balise littérale <CollectivitesTabsApercu>,
// auto-importée normalement) - cette route ne gère que les 10 autres onglets.
const TAB_COMPONENTS: Record<string, Component> = {
  maire: TabMaire,
  executif: TabExecutif,
  conseil: TabConseil,
  territoire: TabTerritoire,
  budget: TabBudget,
  projets: TabProjets,
  services: TabServices,
  documents: TabDocuments,
  actualites: TabActualites,
  contacts: TabContacts,
};

const route = useRoute();

const commune = getCommune(route.params.slug as string);
if (!commune) {
  throw createError({ statusCode: 404, statusMessage: 'Commune introuvable', fatal: true });
}

const tab = getVisibleCommuneTabs(commune.tabsMasques).find(
  (t) => t.path === route.params.tab && t.path,
);
const tabComponent = tab ? TAB_COMPONENTS[tab.key] : undefined;
if (!tab || !tabComponent) {
  throw createError({ statusCode: 404, statusMessage: 'Section introuvable', fatal: true });
}

useCommuneSeo(commune, tab);
</script>

<template>
  <component :is="tabComponent" :commune="commune" />
</template>
