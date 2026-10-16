<script setup lang="ts">
import { useLocalStorage, useClipboard } from '@vueuse/core';
import { toast } from 'vue-sonner';
import { CHAT_ASSISTANT_NAME } from '~/config/chat-variants';
import { CLE_MENTION_VOIX, texteMentionVoix } from '~/lib/chat/mention-voix';
import { construireRetour } from '~/lib/chat/report';
import type { ChatMessageModel } from './Message.vue';
import type { ChatAdapter, ChatVariant } from '~~/types/chat';

/**
 * Interface VOCALE du banc d'essai — essai d'une UI « micro d'abord » pour un
 * public plus à l'aise à l'oral qu'à l'écrit, à côté de `Shell.vue` qu'elle ne
 * remplace pas (même adaptateur, mêmes moteurs, autre ergonomie).
 *
 * Ce qui la distingue de la coquille classique, et pourquoi :
 * - **Le micro est l'action principale** ; le clavier reste là, en second.
 * - **■ envoie** : la transcription part directement, affichée dans la bulle
 *   avec « Corriger ». La coquille classique, elle, la dépose dans le champ —
 *   bon pour qui lit, une étape de trop pour qui ne lit pas.
 * - **Une question dictée reçoit une réponse lue** ; une question tapée, non
 *   (bouton « Écouter » sur chaque réponse). Le son n'est donc jamais imposé à
 *   qui n'a pas parlé — esprit du « silence par défaut » de la coquille.
 * - **Une ligne d'état ne montre que des étapes RÉELLES** : écoute (avec
 *   chrono), transcription, recherche (aucun token encore), rédaction, lecture.
 *   Aucune étape simulée.
 * - **Langue explicite** (Français | Wolof), jamais « auto » : elle commande la
 *   dictée, la réponse et la voix.
 *
 * ⚠️ La logique d'envoi duplique celle de `Shell.vue` (flux, erreurs, quota) :
 * assumé le temps de l'essai. Si l'interface est retenue, l'extraire dans un
 * composable commun plutôt que de faire diverger les deux copies.
 */
const props = defineProps<{ variant: ChatVariant }>();

const publicConfig = useRuntimeConfig().public as Record<string, unknown>;
const { copy: copierPressePapier } = useClipboard({ legacy: true });

/** Message + ce que seule l'interface vocale suit. */
type MessageVocal = ChatMessageModel & { dicte?: boolean };

const messages = ref<MessageVocal[]>([]);
const conversationId = ref<string | null>(null);
const enCours = ref(false);
const chargementAdaptateur = ref(false);
const cooldown = ref(0);
const zoneMessages = ref<HTMLElement | null>(null);
const champ = ref<HTMLInputElement | null>(null);
const question = ref('');

const { isFeatureEnabled } = useFeatureFlags();
const vocalAutorise = computed(() => isFeatureEnabled('chat_voice'));

// ---------------------------------------------------------------------------
// Langue : toujours déclarée. Défaut = langue vocale de la variante.
// ---------------------------------------------------------------------------
const LANGUES = [
  { valeur: 'fr-FR', libelle: 'Français' },
  { valeur: 'wo-SN', libelle: 'Wolof' },
];
const langue = ref(props.variant.voiceLang ?? String(publicConfig.voiceLang ?? 'fr-FR'));
const enWolof = computed(() => langue.value.startsWith('wo'));

// ---------------------------------------------------------------------------
// Lecture — non mémorisée : cette interface décide elle-même quand lire.
// ---------------------------------------------------------------------------
const lecture = useLectureVocale({
  lang: langue,
  profil: props.variant.voiceProfile,
  memoriser: false,
});
/** Message en cours de lecture (bouton Écouter/Arrêter, ligne d'état). */
const messageLu = ref<string | null>(null);
let lireAuFil = false;

watch(
  () => lecture.enLecture.value,
  (enLecture) => {
    // Fin de lecture hors flux : plus rien n'est lu. Pendant le flux, la file
    // peut se vider entre deux phrases sans que la lecture soit finie.
    if (!enLecture && !enCours.value) messageLu.value = null;
  },
);

function ecouter(message: MessageVocal) {
  if (messageLu.value === message.id && lecture.enLecture.value) {
    lecture.arreter();
    messageLu.value = null;
    return;
  }
  messageLu.value = message.id;
  lecture.lire(message.text);
}

function arreterLecture() {
  lireAuFil = false;
  lecture.arreter();
  messageLu.value = null;
}

// ---------------------------------------------------------------------------
// Dictée — la transcription est ENVOYÉE directement.
// ---------------------------------------------------------------------------
const mentionVue = useLocalStorage(CLE_MENTION_VOIX, false);
const mentionAffichee = ref(false);

const dictee = useDicteeVocale({
  lang: langue,
  profil: props.variant.voiceProfile,
  onLangue: (lang) => {
    // Langue ENTENDUE : elle prime, et le sélecteur l'affiche.
    if (lang.startsWith('wo')) langue.value = 'wo-SN';
    else if (lang.startsWith('fr')) langue.value = 'fr-FR';
  },
  onTexte: (texte) => {
    if (texte.trim()) void envoyer(texte.trim(), { dicte: true });
  },
});
const etatDictee = dictee.etat;
const micDisponible = computed(() => vocalAutorise.value && dictee.disponible.value);
const texteMention = computed(() =>
  texteMentionVoix(dictee.moteurId.value === 'rag-serveur', true),
);

/** Chronomètre d'écoute : on voit que ça enregistre, et depuis quand. */
const secondesEcoute = ref(0);
let minuteurEcoute: ReturnType<typeof setInterval> | null = null;

/**
 * Plafond de la transcription CÔTÉ INTERFACE. Le moteur n'en a pas : un
 * service lent laissait « Transcription en cours » indéfiniment, sans issue.
 */
const DELAI_TRANSCRIPTION_MS = 45_000;
let minuteurTranscription: ReturnType<typeof setTimeout> | null = null;
const erreurLocale = ref<string | null>(null);

watch(etatDictee, (etat) => {
  if (minuteurEcoute) clearInterval(minuteurEcoute);
  minuteurEcoute = null;
  if (minuteurTranscription) clearTimeout(minuteurTranscription);
  minuteurTranscription = null;

  if (etat === 'ecoute') {
    secondesEcoute.value = 0;
    minuteurEcoute = setInterval(() => (secondesEcoute.value += 1), 1000);
  } else if (etat === 'transcription') {
    minuteurTranscription = setTimeout(() => {
      dictee.arreter();
      erreurLocale.value =
        'La transcription prend trop de temps. Réessayez, ou écrivez votre question.';
    }, DELAI_TRANSCRIPTION_MS);
  }
});

const chrono = computed(() => {
  const s = secondesEcoute.value;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
});

function demarrerDictee() {
  erreurLocale.value = null;
  dictee.effacerErreur();
  // Geste utilisateur : on amorce la lecture ICI (iOS), pour que la réponse
  // puisse être lue au fil du flux. Et on coupe ce qui se lit (barge-in).
  arreterLecture();
  lecture.activer();
  dictee.basculer();
}

function surMicro() {
  if (enCours.value || cooldown.value > 0) return;
  if (!mentionVue.value) {
    mentionAffichee.value = true;
    return;
  }
  demarrerDictee();
}

function accepterMention() {
  mentionVue.value = true;
  mentionAffichee.value = false;
  demarrerDictee();
}

/** ■ : « j'ai fini », la transcription démarre puis la question part. */
function terminerDictee() {
  dictee.terminer();
}

/** ✕ : on jette l'enregistrement (ou on abandonne une transcription). */
function annulerDictee() {
  dictee.arreter();
}

// ---------------------------------------------------------------------------
// Envoi — repris de Shell.vue.
// ---------------------------------------------------------------------------
let adaptateur: ChatAdapter | null = null;
let abandon: AbortController | null = null;
let compteur = 0;
let minuteurCooldown: ReturnType<typeof setInterval> | null = null;

async function obtenirAdaptateur(): Promise<ChatAdapter> {
  if (adaptateur) return adaptateur;
  if (!props.variant.loadAdapter) throw new Error('variante sans adaptateur');
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

function arreterReponse() {
  abandon?.abort();
  arreterLecture();
}

async function envoyer(texte: string, options: { dicte?: boolean; lire?: boolean } = {}) {
  if (enCours.value || cooldown.value > 0) return;

  messages.value.push({
    id: `q-${(compteur += 1)}`,
    role: 'user',
    text: texte,
    dicte: options.dicte,
  });
  const reponse = reactive<MessageVocal>({
    id: `r-${(compteur += 1)}`,
    role: 'assistant',
    text: '',
    streaming: true,
  });
  messages.value.push(reponse);

  enCours.value = true;
  abandon = new AbortController();
  let termine = false;
  arreterLecture();
  // Question dictée (ou exemple touché) → réponse lue. Le son a été amorcé au
  // geste qui a déclenché l'envoi.
  lireAuFil =
    Boolean(options.dicte || options.lire) && vocalAutorise.value && lecture.disponible.value;
  if (lireAuFil) messageLu.value = reponse.id;
  await defilerEnBas();

  try {
    const client = await obtenirAdaptateur();
    for await (const evenement of client.send(texte, {
      conversationId: conversationId.value ?? undefined,
      lang: langue.value,
      signal: abandon.signal,
    })) {
      switch (evenement.type) {
        case 'token':
          reponse.text += evenement.text;
          if (lireAuFil) lecture.pousser(evenement.text);
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
          if (lireAuFil) lecture.terminer();
          if (evenement.conversationReset) reponse.reset = true;
          if (evenement.conversationId) conversationId.value = evenement.conversationId;
          reponse.meta = evenement.meta;
          break;
        case 'error':
          termine = true;
          arreterLecture();
          reponse.error = {
            code: evenement.code,
            message: evenement.message,
            retryAfterSeconds: evenement.retryAfterSeconds,
          };
          if (evenement.retryAfterSeconds) demarrerCooldown(evenement.retryAfterSeconds);
          break;
      }
    }
    if (!termine) {
      arreterLecture();
      reponse.error = {
        code: 'stream_incomplete',
        message: 'La réponse a été interrompue avant sa fin. Reposez votre question.',
      };
    }
  } catch (erreur) {
    arreterLecture();
    if (abandon.signal.aborted) {
      reponse.error = { code: 'aborted', message: 'Réponse interrompue.' };
    } else if (navigator.onLine === false) {
      reponse.error = {
        code: 'offline',
        message: 'Vous semblez hors ligne. Vérifiez votre connexion, puis reposez la question.',
      };
    } else {
      console.error('[chat vocal] échec de la variante', props.variant.id, erreur);
      reponse.error = {
        code: 'unexpected',
        message: "La réponse n'a pas pu être obtenue. Réessayez dans un instant.",
      };
    }
  } finally {
    reponse.streaming = false;
    enCours.value = false;
    abandon = null;
    // Lecture finie avant le flux (ou rien à lire) : on libère l'état.
    if (!lecture.enLecture.value) messageLu.value = null;
    await defilerEnBas();
  }
}

/** Exemples de l'accueil, dans la langue choisie. */
const exemples = computed(() =>
  enWolof.value && props.variant.starterQuestionsWolof?.length
    ? props.variant.starterQuestionsWolof
    : (props.variant.starterQuestions ?? []),
);

/**
 * Toucher un exemple vaut une question posée à l'oral : la réponse est lue.
 * `activer()` AVANT tout `await` — c'est le geste qui débloque le son sur iOS.
 */
function poserExemple(exemple: string) {
  if (vocalAutorise.value && lecture.disponible.value) lecture.activer();
  void envoyer(exemple, { lire: true });
}

function envoyerTexte() {
  const valeur = question.value.trim();
  if (!valeur || enCours.value || cooldown.value > 0) return;
  dictee.arreter();
  question.value = '';
  void envoyer(valeur);
}

/** Question qui précède une réponse — pour « Réessayer » et « Signaler ». */
function questionDe(messageId: string) {
  const index = messages.value.findIndex((m) => m.id === messageId);
  return messages.value
    .slice(0, Math.max(index, 0))
    .reverse()
    .find((m) => m.role === 'user');
}

function reessayer(messageId: string) {
  const q = questionDe(messageId);
  if (q) void envoyer(q.text, { dicte: q.dicte });
}

/** « Corriger » une transcription : elle repasse dans le champ, à reprendre. */
function corriger(message: MessageVocal) {
  question.value = message.text;
  nextTick(() => champ.value?.focus());
}

function signaler(messageId: string) {
  const reponse = messages.value.find((m) => m.id === messageId);
  if (!reponse) return;
  copierPressePapier(
    construireRetour({
      variant: props.variant,
      url: window.location.href,
      conversationId: conversationId.value,
      question: questionDe(messageId)?.text,
      reponse: reponse.text,
      sources: reponse.sources,
      meta: reponse.meta,
      erreur: reponse.error,
      date: new Date(),
    }),
  );
  toast.success('Contexte copié', {
    description: 'Collez-le tel quel dans votre retour : il contient de quoi remonter la trace.',
  });
}

function reinitialiser() {
  arreterReponse();
  dictee.arreter();
  messages.value = [];
  conversationId.value = null;
}

// ---------------------------------------------------------------------------
// Ligne d'état : une seule étape à la fois, toujours réelle.
// ---------------------------------------------------------------------------
const derniereReponse = computed(() => {
  const dernier = messages.value[messages.value.length - 1];
  return dernier?.role === 'assistant' ? dernier : null;
});

const etat = computed<
  'mention' | 'ecoute' | 'transcription' | 'recherche' | 'redaction' | 'lecture' | 'repos'
>(() => {
  if (mentionAffichee.value) return 'mention';
  if (etatDictee.value === 'ecoute') return 'ecoute';
  if (etatDictee.value === 'transcription') return 'transcription';
  if (enCours.value || chargementAdaptateur.value) {
    return derniereReponse.value?.text ? 'redaction' : 'recherche';
  }
  if (lecture.enLecture.value) return 'lecture';
  return 'repos';
});

const erreurVoix = computed(
  () => erreurLocale.value ?? dictee.erreur.value ?? lecture.erreur.value ?? null,
);

onBeforeUnmount(() => {
  abandon?.abort();
  if (minuteurCooldown) clearInterval(minuteurCooldown);
  if (minuteurEcoute) clearInterval(minuteurEcoute);
  if (minuteurTranscription) clearTimeout(minuteurTranscription);
  lecture.arreter();
});
</script>

<template>
  <div class="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
    <!-- En-tête : retour, nom, langue, nouveau fil. -->
    <header
      class="flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-2 py-2 dark:border-gray-700 dark:bg-gray-900 sm:px-4"
    >
      <div class="flex min-w-0 items-center gap-1">
        <UButton
          to="/chat/liste"
          color="gray"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          size="sm"
          aria-label="Retour à la liste des variantes"
        />
        <span class="truncate font-semibold text-gray-900 dark:text-white">
          {{ CHAT_ASSISTANT_NAME }}
        </span>
      </div>

      <div class="flex items-center gap-1">
        <!-- Langue : deux boutons, toujours visibles. Pas de « auto » : la
             langue commande la dictée, la réponse et la voix. -->
        <div
          v-if="vocalAutorise"
          role="radiogroup"
          aria-label="Langue de la conversation"
          class="flex rounded-full bg-gray-100 p-0.5 text-sm dark:bg-gray-800"
        >
          <button
            v-for="l in LANGUES"
            :key="l.valeur"
            type="button"
            role="radio"
            :aria-checked="langue === l.valeur"
            class="rounded-full px-3 py-1 transition-colors"
            :class="
              langue === l.valeur
                ? 'bg-white font-medium text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            "
            :disabled="etat === 'ecoute' || etat === 'transcription'"
            @click="langue = l.valeur"
          >
            {{ l.libelle }}
          </button>
        </div>

        <UButton
          color="gray"
          variant="ghost"
          size="sm"
          icon="i-heroicons-pencil-square"
          :disabled="!messages.length"
          aria-label="Nouveau fil"
          @click="reinitialiser"
        />
      </div>
    </header>

    <!-- Conversation -->
    <div ref="zoneMessages" class="flex-1 overflow-y-auto px-4 py-6">
      <div v-if="!messages.length" class="mx-auto max-w-2xl py-4 text-center sm:py-10">
        <!-- Un titre, pas de paragraphe : le libellé sous le micro dit déjà
             quoi faire (« Appuyer pour parler en wolof »). -->
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Posez votre question
        </h1>

        <div v-if="exemples.length" class="mt-6 text-left">
          <p class="px-1 text-sm text-gray-500 dark:text-gray-400">Par exemple</p>
          <ul
            class="mt-2 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 dark:divide-gray-700 dark:bg-gray-800 dark:ring-gray-700"
          >
            <li v-for="exemple in exemples" :key="exemple">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                @click="poserExemple(exemple)"
              >
                {{ exemple }}
                <UIcon name="i-heroicons-chevron-right" class="h-4 w-4 shrink-0 text-gray-400" />
              </button>
            </li>
          </ul>
        </div>

        <p v-if="variant.warning" class="mt-6 text-xs text-gray-400 dark:text-gray-500">
          {{ variant.warning }}
        </p>
      </div>

      <div v-else class="mx-auto max-w-3xl space-y-6">
        <div v-for="message in messages" :key="message.id" class="space-y-2">
          <ChatMessage
            :message="message"
            sources-style="vignettes"
            @ask="envoyer"
            @report="signaler"
          >
            <!-- Écouter / Arrêter, juste sous le texte de la réponse : sous les
                 sources, il fallait faire défiler pour le trouver. -->
            <template #apres-texte>
              <div v-if="message.role === 'assistant' && !message.streaming" class="mt-3">
                <button
                  v-if="message.text && vocalAutorise && lecture.disponible.value"
                  type="button"
                  class="bg-primary-50 text-primary-700 hover:bg-primary-100 dark:text-primary-300 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium dark:bg-gray-700 dark:hover:bg-gray-600"
                  @click="ecouter(message)"
                >
                  <UIcon
                    :name="messageLu === message.id ? 'i-lucide-square' : 'i-lucide-play'"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                  {{ messageLu === message.id ? 'Arrêter' : 'Écouter' }}
                </button>
              </div>
            </template>
          </ChatMessage>

          <!-- Question dictée : on montre que c'était la voix, et on peut la
               reprendre au clavier si la transcription s'est trompée. -->
          <div
            v-if="message.role === 'user' && message.dicte"
            class="flex justify-end gap-2 text-xs text-gray-500 dark:text-gray-400"
          >
            <span class="inline-flex items-center gap-1">
              <UIcon name="i-lucide-mic" class="h-3.5 w-3.5" aria-hidden="true" />
              Dicté
            </span>
            <button
              type="button"
              class="text-primary-600 dark:text-primary-400 font-medium hover:underline"
              @click="corriger(message)"
            >
              Corriger
            </button>
          </div>

          <!-- Échec : Réessayer, sans retaper ni redicter. -->
          <div
            v-if="message.role === 'assistant' && message.error && message.error.code !== 'aborted'"
          >
            <button
              type="button"
              class="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700"
              :disabled="enCours || cooldown > 0"
              @click="reessayer(message.id)"
            >
              <UIcon name="i-heroicons-arrow-path" class="h-4 w-4" aria-hidden="true" />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Dock : état, micro, clavier. -->
    <div
      class="border-t border-gray-200 bg-white px-4 pb-4 pt-3 dark:border-gray-700 dark:bg-gray-900"
    >
      <div class="mx-auto max-w-3xl">
        <!-- Ligne d'état : une étape réelle à la fois. -->
        <div class="flex min-h-8 items-center justify-center" role="status" aria-live="polite">
          <p v-if="cooldown > 0" class="text-sm text-amber-700 dark:text-amber-400">
            Nouvelle question possible dans {{ cooldown }} s.
          </p>
          <p
            v-else-if="erreurVoix && etat === 'repos'"
            class="text-center text-sm text-amber-700 dark:text-amber-400"
          >
            {{ erreurVoix }}
          </p>
          <p
            v-else-if="etat === 'ecoute'"
            class="inline-flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400"
          >
            <span class="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400"
              />
              <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            Écoute… parlez{{ enWolof ? ' en wolof' : '' }} · {{ chrono }}
          </p>
          <p
            v-else-if="etat !== 'repos' && etat !== 'mention'"
            class="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <UIcon
              :name="etat === 'lecture' ? 'i-lucide-volume-2' : 'i-lucide-loader-circle'"
              class="h-4 w-4"
              :class="etat === 'lecture' ? 'text-primary-500' : 'animate-spin'"
              aria-hidden="true"
            />
            <template v-if="etat === 'transcription'">Je transcris votre voix…</template>
            <template v-else-if="etat === 'recherche'">Je cherche dans les documents…</template>
            <template v-else-if="etat === 'redaction'">Je rédige la réponse…</template>
            <template v-else>Je lis la réponse</template>
          </p>
        </div>

        <!-- Mention avant le premier enregistrement. -->
        <div
          v-if="etat === 'mention'"
          class="mt-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm dark:border-gray-700"
        >
          <p class="text-gray-700 dark:text-gray-300">{{ texteMention }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton color="primary" label="Autoriser et parler" @click="accepterMention" />
            <UButton
              color="gray"
              variant="ghost"
              label="Annuler"
              @click="mentionAffichee = false"
            />
          </div>
        </div>

        <!-- Commandes du micro. -->
        <div v-else-if="micDisponible" class="mt-2 flex flex-col items-center">
          <!-- Écoute : ✕ annule, ■ envoie. -->
          <template v-if="etat === 'ecoute' || etat === 'transcription'">
            <div class="flex items-center gap-6">
              <button
                type="button"
                class="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                aria-label="Annuler"
                @click="annulerDictee"
              >
                <UIcon name="i-heroicons-x-mark" class="h-6 w-6" />
              </button>
              <button
                type="button"
                class="flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg ring-8 transition-colors disabled:cursor-wait"
                :class="
                  etat === 'ecoute'
                    ? 'bg-red-600 ring-red-100 hover:bg-red-700 dark:ring-red-950'
                    : 'bg-gray-400 ring-gray-100 dark:bg-gray-600 dark:ring-gray-800'
                "
                :disabled="etat === 'transcription'"
                :aria-label="etat === 'ecoute' ? 'Envoyer' : 'Transcription en cours'"
                @click="terminerDictee"
              >
                <UIcon
                  :name="etat === 'ecoute' ? 'i-lucide-square' : 'i-lucide-loader-circle'"
                  class="h-8 w-8"
                  :class="etat === 'transcription' ? 'animate-spin' : ''"
                />
              </button>
              <!-- Équilibre visuel du ✕. -->
              <span class="h-14 w-14" aria-hidden="true" />
            </div>
            <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
              <template v-if="etat === 'ecoute'">■ pour envoyer · ✕ pour annuler</template>
              <template v-else>✕ pour annuler</template>
            </p>
          </template>

          <!-- Une réponse arrive : on peut l'arrêter. -->
          <template v-else-if="enCours">
            <button
              type="button"
              class="flex h-20 w-20 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg dark:bg-gray-200 dark:text-gray-900"
              aria-label="Arrêter la réponse"
              @click="arreterReponse"
            >
              <UIcon name="i-lucide-square" class="h-7 w-7" />
            </button>
            <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">Arrêter la réponse</p>
          </template>

          <!-- Lecture en cours : arrêter la voix. -->
          <template v-else-if="etat === 'lecture'">
            <button
              type="button"
              class="bg-primary-600 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg"
              aria-label="Arrêter la lecture"
              @click="arreterLecture"
            >
              <UIcon name="i-lucide-square" class="h-7 w-7" />
            </button>
            <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">Arrêter la lecture</p>
          </template>

          <!-- Repos : le micro, action principale. -->
          <template v-else>
            <button
              type="button"
              class="bg-primary-600 ring-primary-50 hover:bg-primary-700 flex items-center justify-center rounded-full text-white shadow-lg ring-8 transition-transform active:scale-95 disabled:opacity-50 dark:ring-gray-800"
              :class="messages.length ? 'h-16 w-16' : 'h-20 w-20'"
              :disabled="cooldown > 0"
              :aria-label="enWolof ? 'Appuyer pour parler en wolof' : 'Appuyer pour parler'"
              @click="surMicro"
            >
              <UIcon name="i-lucide-mic" class="h-8 w-8" />
            </button>
            <!-- Libellé à l'accueil seulement : une fois la conversation lancée,
                 le geste est connu et l'écran sert aux réponses. -->
            <p
              v-if="!messages.length"
              class="text-primary-700 dark:text-primary-300 mt-3 text-sm font-medium"
            >
              Appuyer pour parler{{ enWolof ? ' en wolof' : '' }}
            </p>
          </template>
        </div>

        <!-- Micro refusé : on le dit, le clavier reste. -->
        <p
          v-else-if="vocalAutorise && dictee.permissionRefusee.value"
          class="mt-2 text-center text-sm text-amber-700 dark:text-amber-400"
        >
          Le micro est refusé : réautorisez-le dans votre navigateur, ou écrivez votre question.
        </p>

        <!-- Clavier, en second. -->
        <form
          v-if="etat !== 'ecoute' && etat !== 'transcription' && etat !== 'mention'"
          class="mt-4 flex items-center gap-2"
          @submit.prevent="envoyerTexte"
        >
          <input
            ref="champ"
            v-model="question"
            type="text"
            enterkeyhint="send"
            :placeholder="micDisponible ? 'Ou écrivez votre question' : 'Écrivez votre question'"
            aria-label="Votre question"
            class="focus:border-primary-500 focus:ring-primary-500 min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 dark:border-gray-600 dark:text-white md:text-sm"
            :disabled="cooldown > 0"
          />
          <UButton
            type="submit"
            color="primary"
            icon="i-lucide-arrow-up"
            class="rounded-full"
            aria-label="Envoyer la question"
            :disabled="!question.trim() || enCours || cooldown > 0"
            :ui="{ base: 'disabled:opacity-30' }"
          />
        </form>

        <p class="mt-3 truncate text-center text-[11px] text-gray-400 dark:text-gray-500">
          Interface vocale (essai) · {{ variant.label }}
        </p>
      </div>
    </div>
  </div>
</template>
