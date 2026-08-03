<script setup lang="ts">
import { findChatVariant } from '~/config/chat-variants';

/**
 * Page unique de TOUTES les variantes du banc d'essai. Ajouter une stack ne
 * demande pas de nouvelle page : une entrée dans le registre suffit.
 */
const route = useRoute();

const variant = computed(() => findChatVariant(String(route.params.variant)));

// Variante inconnue → 404 propre (pas un écran vide).
if (!variant.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Variante de chat inconnue',
    fatal: true,
  });
}

// Banc d'essai interne : jamais indexé, jamais suivi. Exclu aussi du sitemap
// (nuxt.config `sitemap.exclude`). PAS de `Disallow` robots.txt : robots.txt est
// public, y lister les variantes publierait l'inventaire des POC (et un crawler
// bloqué ne lirait pas ce noindex — règle SEO §10 du CLAUDE.md).
useHead({
  title: `Chat — ${variant.value.label}`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
});
</script>

<template>
  <!-- La clé force un remontage complet au changement de variante : aucun état
       de conversation ne peut fuir d'une stack à l'autre. -->
  <ChatShell v-if="variant" :key="variant.id" :variant="variant" />
</template>
