<script setup lang="ts">
import { CHAT_ASSISTANT_NAME, findChatVariant } from '~/config/chat-variants';

/**
 * Page unique de TOUTES les variantes du banc d'essai. Ajouter une stack ne
 * demande pas de nouvelle page : une entrée dans le registre suffit.
 */
// Layout `fullscreen` : sans lui, le conteneur du layout par défaut (`UContainer`
// + `min-h-96`) donne une hauteur indéfinie, le `h-full` de la coquille ne
// résout plus, et la zone de saisie déborde sous le bas de l'écran.
definePageMeta({ layout: 'fullscreen' });

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
  title: `${CHAT_ASSISTANT_NAME} — ${variant.value.label}`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
});
</script>

<template>
  <!-- La clé force un remontage complet au changement de variante : aucun état
       de conversation ne peut fuir d'une stack à l'autre. -->
  <ChatShell v-if="variant?.available" :key="variant.id" :variant="variant" />

  <!-- Variante déclarée mais sans backend : on le dit franchement plutôt que
       d'ouvrir un chat qui ne répondrait rien d'exploitable. -->
  <div
    v-else-if="variant"
    class="flex h-full flex-col items-center justify-center px-6 text-center"
  >
    <UIcon
      v-if="variant.icon"
      :name="variant.icon"
      class="h-8 w-8 text-gray-400 dark:text-gray-500"
    />
    <h1 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
      {{ variant.label }}
    </h1>
    <p class="mt-2 max-w-md text-gray-600 dark:text-gray-300">
      Cette variante n’est pas encore branchée sur son backend. Il n’y a rien à tester ici pour
      l’instant.
    </p>
    <UButton
      to="/chat/liste"
      class="mt-6"
      color="gray"
      variant="soft"
      icon="i-heroicons-arrow-left"
      label="Voir les variantes disponibles"
    />
  </div>
</template>
