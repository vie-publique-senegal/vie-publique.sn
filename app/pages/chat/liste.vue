<script setup lang="ts">
import { CHAT_ASSISTANT_NAME, CHAT_STATUS_LABELS, CHAT_VARIANTS } from '~/config/chat-variants';

/**
 * Page d'atterrissage du banc d'essai, GÉNÉRÉE DEPUIS LE REGISTRE : une liste
 * écrite à la main serait périmée au deuxième POC.
 */

// Voir `chat/[variant].vue` pour le détail : noindex, hors sitemap, pas de
// Disallow robots.txt.
useHead({
  title: `${CHAT_ASSISTANT_NAME} — variantes en test`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
});
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-12 sm:py-16">
    <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
      {{ CHAT_ASSISTANT_NAME }}
    </h1>
    <p class="mt-3 text-gray-600 dark:text-gray-300">
      L’assistant de Vie Publique Sénégal. Il recherche dans les lois, rapports, décrets, budgets et
      autres documents publics pour vous fournir une réponse sourcée.
    </p>
    

    <ul class="mt-10 space-y-3">
      <li v-for="variant in CHAT_VARIANTS" :key="variant.id">
        <!-- Une variante sans backend n'est pas cliquable : faire tester un faux
             chat produirait de faux retours. Elle reste listée pour montrer ce
             qui est prévu. -->
        <component
          :is="variant.available ? 'NuxtLink' : 'div'"
          :to="variant.available ? `/chat/${variant.id}` : undefined"
          class="group flex items-start gap-4 rounded-2xl p-4 ring-1 transition-colors"
          :class="
            variant.available
              ? 'ring-gray-200 hover:bg-gray-50 dark:ring-gray-700 dark:hover:bg-gray-800'
              : 'cursor-default opacity-60 ring-gray-100 dark:ring-gray-800'
          "
        >
          <UIcon
            v-if="variant.icon"
            :name="variant.icon"
            class="mt-0.5 h-6 w-6 shrink-0 text-gray-700 dark:text-gray-300"
          />

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="font-semibold text-gray-900 dark:text-white">{{ variant.label }}</span>
              <UBadge v-if="variant.available" size="xs" variant="subtle" color="primary">
                {{ CHAT_STATUS_LABELS[variant.status] }}
              </UBadge>
              <UBadge v-else size="xs" variant="subtle" color="gray">Désactivé</UBadge>
            </div>

            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ variant.description }}</p>

            <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
              <template v-if="variant.available">
                /chat/{{ variant.id
                }}<template v-if="variant.warning"> — {{ variant.warning }}</template>
              </template>
              <template v-else>Backend pas encore branché — rien à tester pour l’instant.</template>
            </p>
          </div>

          <UIcon
            v-if="variant.available"
            name="i-heroicons-arrow-right"
            class="mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
          />
        </component>
      </li>
    </ul>

    <p class="mt-10 text-xs text-gray-400 dark:text-gray-500">
      Plusieurs moteurs sont à l’essai sous la même interface. L’URL identifie le moteur : citez-la
      dans vos retours et vos captures d’écran.
    </p>
    </p>
  </div>
</template>
