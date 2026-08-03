<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { CHAT_STATUS_LABELS } from '~/config/chat-variants';
import type { ChatMessageModel } from './Message.vue';
import type { ChatAdapter, ChatVariant } from '~~/types/chat';

/**
 * Coquille du banc d'essai : IDENTIQUE pour toutes les variantes.
 *
 * Elle ne connaît d'un backend que l'interface `ChatAdapter`. Si une notion
 * propre à une stack devait apparaître ici, c'est que l'adaptateur n'a pas fait
 * son travail de traduction.
 */
const props = defineProps<{ variant: ChatVariant }>();

// Capturé DANS le setup : après un `await`, le contexte Nuxt n'est plus garanti.
const publicConfig = useRuntimeConfig().public as Record<string, unknown>;

const { copy: copierPressePapier, copied: identifiantCopie } = useClipboard({ legacy: true });

const messages = ref<ChatMessageModel[]>([]);
const conversationId = ref<string | null>(null);
const enCours = ref(false);
const chargementAdaptateur = ref(false);
const cooldown = ref(0);

const zoneMessages = ref<HTMLElement | null>(null);
const composer = ref<{ focus: () => void } | null>(null);

let adaptateur: ChatAdapter | null = null;
let abandon: AbortController | null = null;
let compteur = 0;
let minuteurCooldown: ReturnType<typeof setInterval> | null = null;

/** L'adaptateur n'est chargé qu'à la première question : /chat/liste ne le paie pas. */
async function obtenirAdaptateur(): Promise<ChatAdapter> {
  if (adaptateur) return adaptateur;
  chargementAdaptateur.value = true;
  try {
    const fabrique = await props.variant.loadAdapter();
    adaptateur = fabrique(publicConfig);
    return adaptateur;
  } finally {
    chargementAdaptateur.value = false;
  }
}

async function defilerEnBas() {
  await nextTick();
  const zone = zoneMessages.value;
  if (zone) zone.scrollTop = zone.scrollHeight;
}

function demarrerCooldown(secondes: number) {
  cooldown.value = secondes;
  if (minuteurCooldown) clearInterval(minuteurCooldown);
  minuteurCooldown = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0 && minuteurCooldown) {
      clearInterval(minuteurCooldown);
      minuteurCooldown = null;
    }
  }, 1000);
}

function arreter() {
  abandon?.abort();
}

async function envoyer(question: string) {
  if (enCours.value || cooldown.value > 0) return;

  messages.value.push({ id: `q-${(compteur += 1)}`, role: 'user', text: question });

  // `reactive()` avant l'insertion : muter l'objet brut poussé dans le tableau
  // ne déclencherait aucun rendu (on écrirait à côté du proxy).
  const reponse = reactive<ChatMessageModel>({
    id: `r-${(compteur += 1)}`,
    role: 'assistant',
    text: '',
    streaming: true,
  });
  messages.value.push(reponse);

  enCours.value = true;
  abandon = new AbortController();
  let termine = false;
  await defilerEnBas();

  try {
    const client = await obtenirAdaptateur();

    for await (const evenement of client.send(question, {
      conversationId: conversationId.value ?? undefined,
      signal: abandon.signal,
    })) {
      switch (evenement.type) {
        case 'token':
          reponse.text += evenement.text;
          await defilerEnBas();
          break;
        case 'sources':
          reponse.sources = evenement.sources;
          break;
        case 'suggestions':
          reponse.suggestions = evenement.questions;
          break;
        case 'done':
          termine = true;
          if (evenement.conversationReset) reponse.reset = true;
          if (evenement.conversationId) conversationId.value = evenement.conversationId;
          reponse.meta = evenement.meta;
          break;
        case 'error':
          termine = true;
          reponse.error = {
            code: evenement.code,
            message: evenement.message,
            retryAfterSeconds: evenement.retryAfterSeconds,
          };
          if (evenement.retryAfterSeconds) demarrerCooldown(evenement.retryAfterSeconds);
          break;
      }
    }

    // Règle de flux : un flux qui se termine sans événement terminal est un
    // ÉCHEC, pas un succès — la réponse affichée peut être tronquée en silence.
    if (!termine) {
      reponse.error = {
        code: 'stream_incomplete',
        message: 'La réponse a été interrompue avant sa fin. Reposez votre question.',
      };
    }
  } catch (erreur) {
    if (abandon.signal.aborted) {
      reponse.error = { code: 'aborted', message: 'Réponse interrompue.' };
    } else {
      console.error('[chat] échec de la variante', props.variant.id, erreur);
      reponse.error = {
        code: 'unexpected',
        message: "La réponse n'a pas pu être obtenue. Réessayez dans un instant.",
      };
    }
  } finally {
    reponse.streaming = false;
    enCours.value = false;
    abandon = null;
    await defilerEnBas();
    composer.value?.focus();
  }
}

function reinitialiser() {
  arreter();
  messages.value = [];
  conversationId.value = null;
  composer.value?.focus();
}

onMounted(() => composer.value?.focus());

onBeforeUnmount(() => {
  abandon?.abort();
  if (minuteurCooldown) clearInterval(minuteurCooldown);
});
</script>

<template>
  <div class="flex h-[calc(100dvh-8rem)] flex-col bg-gray-50 dark:bg-gray-900">
    <!-- En-tête : le nom de la variante est visible en PERMANENCE, pour qu'une
         capture d'écran de testeur se suffise à elle-même. -->
    <header
      class="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
    >
      <div class="flex min-w-0 items-center gap-2">
        <span class="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {{ variant.label }}
        </span>
        <UBadge size="xs" variant="soft" color="gray">{{ variant.id }}</UBadge>
        <UBadge
          size="xs"
          variant="subtle"
          :color="variant.status === 'active' ? 'primary' : 'gray'"
          class="hidden sm:inline-flex"
        >
          {{ CHAT_STATUS_LABELS[variant.status] }}
        </UBadge>
      </div>
      <div class="flex items-center gap-1">
        <UButton
          to="/chat/liste"
          size="xs"
          color="gray"
          variant="ghost"
          icon="i-heroicons-squares-2x2"
          label="Variantes"
        />
        <UButton
          size="xs"
          color="gray"
          variant="ghost"
          icon="i-heroicons-arrow-path"
          label="Nouveau fil"
          :disabled="!messages.length"
          @click="reinitialiser"
        />
      </div>
    </header>

    <div
      v-if="variant.warning"
      class="bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      {{ variant.warning }}
    </div>

    <!-- Conversation -->
    <div ref="zoneMessages" class="flex-1 overflow-y-auto px-4 py-6">
      <div v-if="!messages.length" class="mx-auto max-w-3xl py-10 text-center">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Assistant Vie Publique</h1>
        <p class="mx-auto mt-2 max-w-xl text-gray-600 dark:text-gray-300">
          {{ variant.description }}
        </p>

        <ul v-if="variant.starterQuestions?.length" class="mx-auto mt-8 max-w-md space-y-2">
          <li v-for="question in variant.starterQuestions" :key="question">
            <UButton
              :label="question"
              class="w-full py-3 text-left font-normal dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              color="gray"
              variant="soft"
              @click="envoyer(question)"
            />
          </li>
        </ul>
      </div>

      <div v-else class="mx-auto max-w-3xl space-y-6">
        <ChatMessage
          v-for="message in messages"
          :key="message.id"
          :message="message"
          @ask="envoyer"
        />
      </div>
    </div>

    <!-- Pied de conversation : clé de jointure entre un retour de testeur et
         les traces côté backend. Sans lui, un retour n'est pas diagnosticable. -->
    <div
      class="flex items-center justify-between gap-2 border-t border-gray-200 bg-white px-4 py-1.5 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
    >
      <span class="truncate">
        Variante <span class="font-medium text-gray-700 dark:text-gray-300">{{ variant.id }}</span>
      </span>
      <span v-if="conversationId" class="flex min-w-0 items-center gap-1">
        <span class="hidden sm:inline">Conversation</span>
        <code class="truncate font-mono text-gray-700 dark:text-gray-300">{{
          conversationId
        }}</code>
        <UTooltip text="Copier l'identifiant" :delay-duration="0">
          <UButton
            :icon="identifiantCopie ? 'i-lucide-check' : 'i-lucide-copy'"
            variant="ghost"
            size="2xs"
            color="gray"
            @click="copierPressePapier(conversationId)"
          />
        </UTooltip>
      </span>
      <span v-else class="italic">
        {{ messages.length ? 'Pas d’identifiant de conversation' : 'Aucune conversation en cours' }}
      </span>
    </div>

    <ChatComposer
      ref="composer"
      :busy="enCours || chargementAdaptateur"
      :cooldown="cooldown"
      @send="envoyer"
      @stop="arreter"
    />
  </div>
</template>
