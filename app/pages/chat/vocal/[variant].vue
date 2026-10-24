<script setup lang="ts">
import { CHAT_ASSISTANT_NAME, findChatVariant } from '~/config/chat-variants';

/**
 * Interface VOCALE du banc d'essai : même variante (adaptateur, moteurs) que
 * `/chat/<id>`, autre ergonomie — micro d'abord. Voir `ChatVocalShell`.
 *
 * Plein écran via `app.vue` (préfixe `/chat/`), noindex, hors sitemap
 * (`/chat/**` dans nuxt.config) : mêmes règles que `chat/[variant].vue`.
 */
definePageMeta({ layout: 'fullscreen' });

const route = useRoute();
const variant = computed(() => findChatVariant(String(route.params.variant)));

// Inconnue ou sans backend → 404 : l'interface vocale n'a rien à montrer sans
// adaptateur, la page classique explique déjà ce cas.
if (!variant.value?.available) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Variante de chat inconnue',
    fatal: true,
  });
}

useHead({
  title: `${CHAT_ASSISTANT_NAME} — interface vocale — ${variant.value.label}`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
});
</script>

<template>
  <ChatVocalShell v-if="variant" :key="variant.id" :variant="variant" />
</template>
