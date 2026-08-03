<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { renderChatMarkdown } from '~/lib/chat/markdown';
import type { ChatSource } from '~~/types/chat';

export interface ChatMessageModel {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
  sources?: ChatSource[];
  suggestions?: string[];
  meta?: Record<string, unknown>;
  error?: { code: string; message: string; retryAfterSeconds?: number };
  /** Le backend avait perdu le contexte du fil avant de produire cette réponse. */
  reset?: boolean;
}

const props = defineProps<{ message: ChatMessageModel }>();

defineEmits<{
  /** `ask` : rejouer une question suggérée. `report` : copier le contexte du message. */
  (e: 'ask' | 'report', valeur: string): void;
}>();

const { copy, copied } = useClipboard({ legacy: true });

const html = computed(() => renderChatMarkdown(props.message.text));
</script>

<template>
  <!-- Question de l'utilisateur -->
  <div v-if="message.role === 'user'" class="group flex w-full justify-end gap-2">
    <div class="flex items-end">
      <UTooltip text="Copier la question" :delay-duration="0">
        <UButton
          :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          variant="ghost"
          size="xs"
          color="gray"
          class="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          @click="copy(message.text)"
        />
      </UTooltip>
    </div>
    <div
      class="max-w-[85%] whitespace-pre-wrap rounded-l-xl rounded-t-xl bg-sky-600 px-4 py-3 text-white md:max-w-[70%]"
    >
      {{ message.text }}
    </div>
  </div>

  <!-- Réponse de l'assistant -->
  <div v-else class="group space-y-3">
    <!-- Le serveur avait perdu le fil : on le dit, plutôt que de recoller une
         réponse hors contexte sous les messages précédents. -->
    <div
      v-if="message.reset"
      class="flex items-start gap-2 border-l-2 border-amber-400 py-1 pl-3 text-sm text-gray-600 dark:text-gray-400"
    >
      <UIcon name="i-heroicons-arrow-path" class="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>
        Le contexte de la conversation précédente a expiré : cette réponse ne tient pas compte des
        messages ci-dessus.
      </span>
    </div>

    <div class="rounded-r-xl rounded-t-xl bg-white p-4 dark:bg-gray-800">
      <!-- HTML assaini par DOMPurify dans renderChatMarkdown() : le texte vient
           d'un modèle qui restitue du contenu de documents tiers, il n'est
           jamais injecté brut. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="message.text" class="prose prose-sm max-w-none dark:prose-invert" v-html="html" />
      <div v-else-if="message.streaming" class="flex items-center gap-1 py-1">
        <span class="h-2 w-2 animate-pulse rounded-full bg-gray-400 dark:bg-gray-500" />
        <span
          class="h-2 w-2 animate-pulse rounded-full bg-gray-400 dark:bg-gray-500"
          style="animation-delay: 0.2s"
        />
        <span
          class="h-2 w-2 animate-pulse rounded-full bg-gray-400 dark:bg-gray-500"
          style="animation-delay: 0.4s"
        />
      </div>

      <!-- Documents cités -->
      <div
        v-if="message.sources?.length"
        class="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Sources
        </p>
        <ol class="mt-2 space-y-2">
          <li v-for="(source, index) in message.sources" :key="`${source.externalId}-${index}`">
            <component
              :is="source.pageUrl ? 'a' : 'span'"
              :href="source.pageUrl"
              :target="source.pageUrl ? '_blank' : undefined"
              :rel="source.pageUrl ? 'noopener noreferrer' : undefined"
              class="text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
            >
              {{ index + 1 }}. {{ source.title }}
            </component>
            <span v-if="source.page" class="ml-1 text-xs text-gray-500 dark:text-gray-400">
              p. {{ source.page }}
            </span>
            <p
              v-if="source.excerpt"
              class="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400"
            >
              {{ source.excerpt }}
            </p>
          </li>
        </ol>
      </div>
    </div>

    <!-- Échec : message destiné à l'utilisateur, construit par l'adaptateur -->
    <div
      v-if="message.error"
      class="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
    >
      <UIcon name="i-heroicons-exclamation-triangle" class="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{{ message.error.message }}</span>
    </div>

    <!-- Relances proposées par le backend (toutes les variantes n'en fournissent pas) -->
    <div v-if="message.suggestions?.length" class="flex flex-wrap gap-2">
      <UButton
        v-for="suggestion in message.suggestions"
        :key="suggestion"
        color="gray"
        variant="soft"
        size="xs"
        class="max-w-full whitespace-normal break-words text-left dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        @click="$emit('ask', suggestion)"
      >
        {{ suggestion }}
      </UButton>
    </div>

    <!-- Toujours visibles au doigt : sans survol, un `opacity-0` rendrait ces
         actions inatteignables sur mobile. -->
    <div
      class="flex items-center gap-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
    >
      <UTooltip text="Copier la réponse" :delay-duration="0">
        <UButton
          :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          variant="ghost"
          size="xs"
          color="gray"
          @click="copy(message.text)"
        />
      </UTooltip>

      <!-- Raison d'être du banc : un retour sans son contexte n'est pas
           diagnosticable. Le bouton copie tout d'un coup, pour que le testeur
           n'ait qu'à coller. -->
      <UTooltip text="Copier le contexte complet pour un retour" :delay-duration="0">
        <UButton
          icon="i-heroicons-flag"
          variant="ghost"
          size="xs"
          color="gray"
          aria-label="Copier le contexte pour un retour"
          @click="$emit('report', message.id)"
        >
          <span class="hidden text-xs sm:inline">Signaler</span>
        </UButton>
      </UTooltip>
    </div>
  </div>
</template>
