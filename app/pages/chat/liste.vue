<script setup lang="ts">
import { NuxtLink } from '#components';
import {
  CHAT_ASSISTANT_NAME,
  CHAT_ASSISTANT_TAGLINE,
  CHAT_CORPUS_RAG,
  CHAT_STATUS_LABELS,
  CHAT_VARIANTS,
} from '~/config/chat-variants';
import type { ChatVariantEngines } from '~~/types/chat';

/**
 * Moteur de réponse commun à toutes les variantes testables, s'il n'y en a
 * qu'un : il est alors dit une fois en tête de liste, pas répété sur chaque
 * carte. Calculé depuis le registre — une variante d'une autre stack le fait
 * revenir dans les cartes sans rien toucher ici.
 */
const moteursReponse = new Set(
  CHAT_VARIANTS.filter((v) => v.available && v.engines).map((v) => v.engines!.answer),
);
const moteurReponseCommun = moteursReponse.size === 1 ? [...moteursReponse][0] : null;

/** Les moteurs d'une variante, dans l'ordre du parcours : dicter, répondre, lire. */
function lignesMoteurs(moteurs: ChatVariantEngines) {
  return [
    {
      cle: 'dictation',
      titre: 'Dictée wolof',
      icone: 'i-heroicons-microphone',
      valeur: moteurs.dictation,
    },
    {
      cle: 'answer',
      titre: 'Réponse',
      icone: 'i-heroicons-chat-bubble-left-right',
      valeur: moteurs.answer,
    },
    { cle: 'voice', titre: 'Voix wolof', icone: 'i-heroicons-speaker-wave', valeur: moteurs.voice },
  ].filter((ligne) => ligne.valeur && !(ligne.cle === 'answer' && moteurReponseCommun));
}

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

    <!-- Même recherche et même réponse pour toutes : seule la voix change, et
         les pastilles des cartes disent laquelle. Le moteur de réponse n'est
         pas nommé ici — c'est un détail pour l'équipe, pas pour le visiteur. -->
    <h2
      v-if="moteurReponseCommun"
      class="mt-10 text-sm font-medium text-gray-500 dark:text-gray-400"
    >
      Choisissez la voix wolof à tester
    </h2>

    <ul class="space-y-3" :class="moteurReponseCommun ? 'mt-3' : 'mt-10'">
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

            <!-- Les variantes d'un même RAG ne diffèrent que par la voix : les
                 pastilles le disent seules, la description n'est affichée que
                 pour une variante sans moteurs déclarés. -->
            <p v-if="!variant.engines" class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {{ variant.description }}
            </p>
            <dl v-if="variant.engines" class="mt-2 flex flex-wrap gap-1.5 text-xs">
              <div
                v-for="ligne in lignesMoteurs(variant.engines)"
                :key="ligne.cle"
                class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800"
              >
                <UIcon :name="ligne.icone" class="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                <dt class="text-gray-500 dark:text-gray-400">{{ ligne.titre }}</dt>
                <dd class="font-medium text-gray-800 dark:text-gray-200">{{ ligne.valeur }}</dd>
              </div>
            </dl>

            <!-- Ni route ni avertissement de corpus sur une variante testable :
                 l'URL se lit dans la barre d'adresse, le corpus est commun et
                 décrit une fois sous la liste. -->
            <p v-if="!variant.available" class="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Backend pas encore branché — rien à tester pour l’instant.
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
