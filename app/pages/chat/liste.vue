<script setup lang="ts">
import { CHAT_STATUS_LABELS, CHAT_VARIANTS } from '~/config/chat-variants';

/**
 * Page d'atterrissage du banc d'essai, GÉNÉRÉE DEPUIS LE REGISTRE : une liste
 * écrite à la main serait périmée au deuxième POC.
 */

// Voir `chat/[variant].vue` pour le détail : noindex, hors sitemap, pas de
// Disallow robots.txt.
useHead({
  title: 'Banc d’essai — variantes de chat',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
});
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Banc d’essai des assistants</h1>
    <p class="mt-2 text-gray-600 dark:text-gray-300">
      Chaque variante ci-dessous utilise la même interface et un backend différent. L’URL identifie
      la stack : citez-la dans vos retours et vos captures d’écran.
    </p>

    <ul
      class="mt-8 divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-700 dark:border-gray-700"
    >
      <li v-for="variant in CHAT_VARIANTS" :key="variant.id">
        <NuxtLink
          :to="`/chat/${variant.id}`"
          class="group flex items-start gap-4 py-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="font-semibold text-gray-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400"
              >
                {{ variant.label }}
              </span>
              <UBadge size="xs" variant="soft" color="gray">/chat/{{ variant.id }}</UBadge>
              <UBadge
                size="xs"
                variant="subtle"
                :color="variant.status === 'active' ? 'primary' : 'gray'"
              >
                {{ CHAT_STATUS_LABELS[variant.status] }}
              </UBadge>
            </div>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ variant.description }}</p>
            <p v-if="variant.warning" class="mt-1 text-sm text-amber-700 dark:text-amber-400">
              {{ variant.warning }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-arrow-right"
            class="mt-1 h-5 w-5 flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
          />
        </NuxtLink>
      </li>
    </ul>

    <p class="mt-10 text-sm text-gray-500 dark:text-gray-400">
      Ces pages ne sont ni indexées ni liées depuis le site. Elles restent toutefois accessibles à
      qui connaît l’URL : le <code>noindex</code> empêche le référencement, pas l’accès.
    </p>
  </div>
</template>
