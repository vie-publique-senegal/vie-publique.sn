<script setup lang="ts">
import { NuxtLink } from '#components';
import {
  CHAT_ASSISTANT_NAME,
  CHAT_ASSISTANT_TAGLINE,
  CHAT_CORPUS_RAG,
  CHAT_VARIANTS,
  CHAT_VOCAL_VARIANTS,
} from '~/config/chat-variants';

/** Variantes de l'interface vocale, dans l'ordre du registre de config. */
const variantesVocales = CHAT_VOCAL_VARIANTS.map((id) =>
  CHAT_VARIANTS.find((v) => v.id === id && v.available),
).filter((v): v is (typeof CHAT_VARIANTS)[number] => Boolean(v));

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
    <p class="mt-3 text-gray-600 dark:text-gray-300">{{ CHAT_ASSISTANT_TAGLINE }}</p>

    <!-- Même recherche et même réponse pour toutes : seuls la dictée et la
         voix changent, et le titre de chaque carte les nomme dans cet ordre
         (« Gemini + Kiriku » = dictée Gemini, voix Kiriku). -->
    <h2 class="mt-10 text-sm font-medium text-gray-500 dark:text-gray-400">Dictée + voix wolof</h2>

    <ul class="mt-3 space-y-3">
      <li v-for="variant in CHAT_VARIANTS" :key="variant.id">
        <!-- Une variante sans backend n'est pas cliquable : faire tester un faux
             chat produirait de faux retours. Elle reste listée pour montrer ce
             qui est prévu.

             ⚠️ `NuxtLink` est passé en IDENTIFIANT (importé de `#components`),
             jamais en chaîne `'NuxtLink'`. Les auto-imports de Nuxt sont résolus
             à la COMPILATION : une chaîne n'y donne pas accès, Vue la prend pour
             un élément natif inconnu et rend un `<NuxtLink>` littéral — sans
             `href`, donc sans rien de cliquable, et SANS erreur en console.
             C'est la convention du reste du projet (cf. etat-senegal/*). -->
        <component
          :is="variant.available ? NuxtLink : 'div'"
          :to="variant.available ? `/chat/${variant.id}` : undefined"
          class="group flex items-center gap-4 rounded-2xl p-4 ring-1 transition-colors"
          :class="
            variant.available
              ? 'ring-gray-200 hover:bg-gray-50 dark:ring-gray-700 dark:hover:bg-gray-800'
              : 'cursor-default opacity-60 ring-gray-100 dark:ring-gray-800'
          "
        >
          <UIcon
            v-if="variant.icon"
            :name="variant.icon"
            class="h-6 w-6 shrink-0 text-gray-700 dark:text-gray-300"
          />

          <!-- Statut en pastille : verte = en ligne, rouge = désactivée. Le mot
               reste lisible pour les lecteurs d'écran. -->
          <span class="flex min-w-0 flex-1 items-center gap-2">
            <span class="truncate font-semibold text-gray-900 dark:text-white">
              {{ variant.label }}
            </span>
            <span
              class="h-2 w-2 shrink-0 rounded-full"
              :class="variant.available ? 'bg-green-500' : 'bg-red-500'"
              :title="variant.available ? 'En ligne' : 'Désactivée'"
              aria-hidden="true"
            />
            <span class="sr-only">{{ variant.available ? 'En ligne' : 'Désactivée' }}</span>
          </span>

          <UIcon
            v-if="variant.available"
            name="i-heroicons-arrow-right"
            class="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
          />
        </component>
      </li>
    </ul>

    <!-- Interface vocale : mêmes variantes, ergonomie « micro d'abord ». -->
    <template v-if="variantesVocales.length">
      <h2 class="mt-10 text-sm font-medium text-gray-500 dark:text-gray-400">Interface vocale</h2>
      <ul class="mt-3 space-y-3">
        <li v-for="variante in variantesVocales" :key="variante.id">
          <NuxtLink
            :to="`/chat/vocal/${variante.id}`"
            class="bg-primary-50 hover:bg-primary-100 group flex items-center gap-4 rounded-2xl p-4 transition-colors dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <span
              class="bg-primary-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
            >
              <UIcon name="i-lucide-mic" class="h-5 w-5" />
            </span>
            <span class="min-w-0 flex-1 truncate font-semibold text-gray-900 dark:text-white">
              {{ variante.label }}
            </span>
            <UIcon
              name="i-heroicons-arrow-right"
              class="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
            />
          </NuxtLink>
        </li>
      </ul>
    </template>

    <section class="mt-10 rounded-2xl bg-gray-50 p-5 dark:bg-gray-800">
      <h2 class="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
        <UIcon name="i-heroicons-book-open" class="h-5 w-5 text-gray-500 dark:text-gray-400" />
        {{ CHAT_CORPUS_RAG.title }}
      </h2>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{{ CHAT_CORPUS_RAG.summary }}</p>

      <div class="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">Indexés</h3>
          <ul class="mt-1.5 space-y-1">
            <li
              v-for="item in CHAT_CORPUS_RAG.included"
              :key="item"
              class="flex items-start gap-1.5 text-gray-600 dark:text-gray-300"
            >
              <UIcon name="i-heroicons-check" class="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              {{ item }}
            </li>
          </ul>
        </div>
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">Pas encore indexés</h3>
          <ul class="mt-1.5 space-y-1">
            <li
              v-for="item in CHAT_CORPUS_RAG.excluded"
              :key="item"
              class="flex items-start gap-1.5 text-gray-600 dark:text-gray-300"
            >
              <UIcon name="i-heroicons-minus" class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              {{ item }}
            </li>
          </ul>
        </div>
      </div>

      <p class="mt-4 text-xs text-gray-500 dark:text-gray-400">{{ CHAT_CORPUS_RAG.outOfScope }}</p>
    </section>

    <p class="mt-10 text-xs text-gray-400 dark:text-gray-500">
      Plusieurs moteurs sont à l’essai sous la même interface. L’URL identifie le moteur : citez-la
      dans vos retours et vos captures d’écran.
    </p>
  </div>
</template>
