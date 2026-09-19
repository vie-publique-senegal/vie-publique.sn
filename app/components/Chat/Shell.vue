<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { toast } from 'vue-sonner';
import { CHAT_ASSISTANT_NAME } from '~/config/chat-variants';
import { construireRetour } from '~/lib/chat/report';
import { moteurEcoute, moteurLecture } from '~/lib/voice';
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
const composer = ref<{ focus: () => void; arreterDictee: () => void } | null>(null);

/**
 * Vocal — additif : tout reste utilisable au clavier sans lui.
 *
 * Coupable sans redéploiement via le flag Directus `chat_voice`
 * (`vp_feature_flags`, cache 5 min). `isFeatureEnabled` rend `false` tant que les
 * flags ne sont pas chargés : le défaut est donc « pas de vocal », ce qui est le
 * bon sens de sécurité.
 */
const { isFeatureEnabled } = useFeatureFlags();
const vocalAutorise = computed(() => isFeatureEnabled('chat_voice'));

// La langue n'est JAMAIS codée en dur : variante > config runtime.
const langueParDefaut = computed(
  () => props.variant.voiceLang ?? String(publicConfig.voiceLang ?? 'fr-FR'),
);

/**
 * Langue de l'ÉCHANGE — `null` tant que rien ne l'a déclarée.
 *
 * Elle est **constatée, pas devinée** : soit l'utilisateur la choisit, soit la
 * dictée la rapporte telle qu'elle a été entendue. Elle descend ensuite dans
 * toute la chaîne — elle est envoyée à `/ask`, qui répond dans cette langue, et
 * elle désigne le moteur de lecture.
 *
 * ⚠️ `null` n'est pas un oubli, c'est le défaut historique qu'on préserve :
 * sans langue déclarée, l'API répond dans la langue de la question, ce qu'elle
 * sait faire. Envoyer une langue par défaut ferait répondre en français à
 * quelqu'un qui écrit dans une autre langue — une régression pour les
 * visiteurs actuels.
 */
const langueEchange = ref<string | null>(null);

/** Langue employée par les moteurs vocaux : celle de l'échange, sinon le défaut. */
const langueVocale = computed(() => langueEchange.value ?? langueParDefaut.value);

/**
 * Langues proposées au choix. Deux, parce que ce sont les deux que la chaîne
 * sait servir de bout en bout — et « Automatique » reste le défaut.
 */
const LANGUES = [
  { valeur: '', libelle: 'Langue : auto' },
  { valeur: 'fr-FR', libelle: 'Français' },
  { valeur: 'wo-SN', libelle: 'Wolof' },
];

const lecture = useLectureVocale({ lang: langueVocale });

/**
 * Dernière réponse affichée — celle que l'activation du son doit reprendre.
 *
 * Sans elle, activer le haut-parleur après une réponse ne lit rien : le tampon
 * ne bufferise pas en sourdine, et la lecture n'aurait démarré qu'à la réponse
 * suivante. Un bouton qui ne fait rien passe pour cassé, et c'est ce qui est
 * arrivé en démo.
 */
const derniereReponse = computed(
  () => [...messages.value].reverse().find((m) => m.role === 'assistant' && m.text)?.text ?? '',
);

/**
 * Sonde de compatibilité, affichée dans le pied de conversation.
 *
 * Sa raison d'être : je ne peux pas tester les apps des stores depuis un poste de
 * développement. Ouvrir `/chat/<variante>` dans l'app installée et déplier
 * « Détails » donne la réponse — c'est exactement la vocation de traçabilité du
 * banc, et ça évite une page de diagnostic à maintenir.
 *
 * Attendu au 2026-08 : Chrome/Edge/Safari et app Android → dictée ✅ ;
 * Firefox et app iOS (WKWebView) → dictée ❌, lecture ✅.
 */
const capacitesVocales = ref<{ dictee: string | null; lecture: boolean; voix: number } | null>(
  null,
);

function sonderVocal() {
  const ecoute = moteurEcoute();
  capacitesVocales.value = {
    dictee: ecoute?.id ?? null,
    lecture: moteurLecture() !== null,
    voix: lecture.nombreDeVoix(),
  };
}

let adaptateur: ChatAdapter | null = null;
let abandon: AbortController | null = null;
let compteur = 0;
let minuteurCooldown: ReturnType<typeof setInterval> | null = null;

/** Métadonnées de la dernière réponse aboutie, pour le pied de conversation. */
const dernieresMeta = computed(() => {
  const derniere = [...messages.value].reverse().find((message) => message.meta);
  return Object.entries(derniere?.meta ?? {});
});

/** L'adaptateur n'est chargé qu'à la première question : /chat/liste ne le paie pas. */
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

function arreter() {
  abandon?.abort();
  // Couper la génération coupe aussi la lecture : sinon l'assistant continuerait
  // d'énoncer les phrases déjà en file après l'arrêt demandé.
  lecture.arreter();
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
  // Une nouvelle question annule la lecture de la précédente.
  lecture.arreter();
  await defilerEnBas();

  try {
    const client = await obtenirAdaptateur();

    for await (const evenement of client.send(question, {
      conversationId: conversationId.value ?? undefined,
      // Omise tant que rien ne l'a déclarée : l'API répond alors dans la langue
      // de la question.
      lang: langueEchange.value ?? undefined,
      signal: abandon.signal,
    })) {
      switch (evenement.type) {
        case 'token':
          reponse.text += evenement.text;
          // Lecture AU FIL du flux : chaque token alimente le tampon, qui émet
          // dès qu'une phrase est complète. Attendre `done` pour lire ferait
          // entendre le premier mot après la fin de la génération — le streaming
          // ne servirait alors plus à rien.
          lecture.pousser(evenement.text);
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
          // La dernière phrase n'a pas de ponctuation finale garantie : sans ce
          // vidage, elle resterait dans le tampon et ne serait jamais lue.
          lecture.terminer();
          if (evenement.conversationReset) reponse.reset = true;
          if (evenement.conversationId) conversationId.value = evenement.conversationId;
          reponse.meta = evenement.meta;
          break;
        case 'error':
          termine = true;
          // Le message d'erreur s'affiche, il ne s'énonce pas : on coupe plutôt
          // que de lire une réponse tronquée jusqu'au point d'échec.
          lecture.arreter();
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
      lecture.arreter();
      reponse.error = {
        code: 'stream_incomplete',
        message: 'La réponse a été interrompue avant sa fin. Reposez votre question.',
      };
    }
  } catch (erreur) {
    lecture.arreter();
    if (abandon.signal.aborted) {
      reponse.error = { code: 'aborted', message: 'Réponse interrompue.' };
    } else if (navigator.onLine === false) {
      reponse.error = {
        code: 'offline',
        message: 'Vous semblez hors ligne. Vérifiez votre connexion, puis reposez la question.',
      };
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

/** Copie le contexte complet d'une réponse, pour un retour diagnosticable. */
function signaler(messageId: string) {
  const index = messages.value.findIndex((message) => message.id === messageId);
  if (index === -1) return;

  const reponse = messages.value[index]!;
  const question = messages.value
    .slice(0, index)
    .reverse()
    .find((message) => message.role === 'user');

  copierPressePapier(
    construireRetour({
      variant: props.variant,
      url: window.location.href,
      conversationId: conversationId.value,
      question: question?.text,
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
  arreter();
  composer.value?.arreterDictee();
  messages.value = [];
  conversationId.value = null;
  composer.value?.focus();
}

onMounted(() => {
  composer.value?.focus();
  sonderVocal();
  // `getVoices()` est souvent VIDE au premier appel : la liste arrive de façon
  // asynchrone. Sans cet écouteur, le diagnostic annoncerait « 0 voix » sur des
  // navigateurs parfaitement fonctionnels.
  window.speechSynthesis?.addEventListener('voiceschanged', sonderVocal);
});

onBeforeUnmount(() => window.speechSynthesis?.removeEventListener('voiceschanged', sonderVocal));

onBeforeUnmount(() => {
  abandon?.abort();
  if (minuteurCooldown) clearInterval(minuteurCooldown);
  // `useLectureVocale` coupe déjà la synthèse à son propre démontage ; cet appel
  // est là pour l'ORDRE : on veut le silence avant que la vue ne disparaisse,
  // pas à la merci de l'ordre de démontage des composables.
  lecture.arreter();
});
</script>

<template>
  <!-- `h-full` : la hauteur vient du conteneur plein écran d'app.vue. -->
  <div class="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
    <!-- En-tête minimal, à la manière des assistants grand public : retour,
         nom, nouveau fil. Tout le diagnostic est repoussé sous la saisie. -->
    <header
      class="flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-2 py-2 dark:border-gray-700 dark:bg-gray-900 sm:px-4"
    >
      <div class="flex min-w-0 items-center gap-1">
        <UTooltip text="Toutes les variantes" :delay-duration="0">
          <UButton
            to="/chat/liste"
            color="gray"
            variant="ghost"
            icon="i-heroicons-arrow-left"
            size="sm"
            aria-label="Retour à la liste des variantes"
          />
        </UTooltip>
        <span class="truncate font-semibold text-gray-900 dark:text-white">
          {{ CHAT_ASSISTANT_NAME }}
        </span>
      </div>

      <div class="flex items-center gap-1">
        <!-- Sourdine. État mémorisé entre les sessions ; silence par défaut —
             un service public ne se met pas à parler tout seul. -->
        <UTooltip
          v-if="vocalAutorise && lecture.disponible.value"
          :text="lecture.actif.value ? 'Couper la lecture des réponses' : 'Lire les réponses'"
          :delay-duration="0"
        >
          <UButton
            color="gray"
            variant="ghost"
            size="sm"
            :icon="lecture.actif.value ? 'i-lucide-volume-2' : 'i-lucide-volume-x'"
            :aria-label="
              lecture.actif.value ? 'Couper la lecture' : 'Lire les réponses à voix haute'
            "
            :aria-pressed="lecture.actif.value"
            @click="lecture.basculer(derniereReponse)"
          />
        </UTooltip>

        <!-- Langue de l'échange. Native plutôt qu'un composant : deux options,
             aucune dépendance, et le sélecteur du système sur mobile. -->
        <select
          v-if="vocalAutorise"
          :value="langueEchange ?? ''"
          aria-label="Langue de la conversation"
          class="rounded-md border border-gray-300 bg-transparent px-2 py-1 text-sm dark:border-gray-600"
          @change="langueEchange = ($event.target as HTMLSelectElement).value || null"
        >
          <option v-for="l in LANGUES" :key="l.valeur" :value="l.valeur">{{ l.libelle }}</option>
        </select>

        <!-- Icône seule sur mobile, icône + libellé dès qu'il y a de la place. -->
        <UButton
          color="gray"
          variant="ghost"
          size="sm"
          icon="i-heroicons-pencil-square"
          :disabled="!messages.length"
          aria-label="Nouveau fil"
          @click="reinitialiser"
        >
          <span class="hidden sm:inline">Nouveau fil</span>
        </UButton>
      </div>
    </header>

    <!-- Conversation -->
    <div ref="zoneMessages" class="flex-1 overflow-y-auto px-4 py-6">
      <div v-if="!messages.length" class="mx-auto max-w-2xl py-8 text-center sm:py-12">
        <UIcon
          v-if="variant.icon"
          :name="variant.icon"
          class="mx-auto mb-4 h-8 w-8 text-gray-400 dark:text-gray-500"
        />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ CHAT_ASSISTANT_NAME }}
        </h1>
        <p class="mx-auto mt-2 text-gray-600 dark:text-gray-300">
          L’assistant de Vie Publique Sénégal. Il recherche dans les lois, rapports, décrets,
          budgets et autres documents publics pour vous fournir une réponse sourcée.
        </p>

        <ul v-if="variant.starterQuestions?.length" class="mt-8 space-y-2 text-left">
          <li v-for="question in variant.starterQuestions" :key="question">
            <button
              type="button"
              class="w-full rounded-xl px-4 py-3 text-sm text-gray-700 ring-1 ring-gray-200 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-800"
              @click="envoyer(question)"
            >
              {{ question }}
            </button>
          </li>
        </ul>

        <!-- Limite du corpus : rappelée à l'accueil, jamais en bandeau fixe —
             elle est déjà expliquée sur /chat/liste. -->
        <p v-if="variant.warning" class="mt-6 text-xs text-gray-400 dark:text-gray-500">
          {{ variant.warning }}
        </p>
      </div>

      <div v-else class="mx-auto max-w-3xl space-y-6">
        <ChatMessage
          v-for="message in messages"
          :key="message.id"
          :message="message"
          @ask="envoyer"
          @report="signaler"
        />
      </div>
    </div>

    <ChatComposer
      ref="composer"
      :busy="enCours || chargementAdaptateur"
      :cooldown="cooldown"
      :voix="vocalAutorise"
      :voix-lang="langueVocale"
      :erreur-voix="lecture.erreur.value"
      @send="envoyer"
      @langue="langueEchange = $event"
      @stop="arreter"
      @dictee-demarre="lecture.arreter()"
    />

    <!-- Pied de conversation, SOUS la saisie : la variante reste visible en
         permanence (une capture d'écran doit se suffire) et l'identifiant de
         conversation, clé de jointure avec les traces backend, reste copiable —
         mais rien de tout cela ne s'interpose entre l'utilisateur et sa question. -->
    <details
      class="group border-t border-gray-200 bg-white px-4 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
    >
      <summary
        class="flex cursor-pointer select-none list-none items-center justify-between gap-2 py-2"
      >
        <span class="truncate">{{ variant.label }}</span>
        <span class="flex items-center gap-1">
          <span class="hidden sm:inline">Détails</span>
          <UIcon
            name="i-heroicons-chevron-up"
            class="h-3.5 w-3.5 transition-transform group-open:rotate-180"
          />
        </span>
      </summary>

      <dl class="space-y-1 pb-3">
        <div class="flex items-center gap-2">
          <dt class="shrink-0">Conversation</dt>
          <dd class="flex min-w-0 flex-1 items-center gap-1">
            <code v-if="conversationId" class="truncate text-gray-700 dark:text-gray-300">
              {{ conversationId }}
            </code>
            <span v-else class="italic">
              {{ messages.length ? 'non fournie par cette variante' : 'aucune en cours' }}
            </span>
            <UButton
              v-if="conversationId"
              :icon="identifiantCopie ? 'i-lucide-check' : 'i-lucide-copy'"
              variant="ghost"
              size="2xs"
              color="gray"
              aria-label="Copier l'identifiant de conversation"
              @click="copierPressePapier(conversationId)"
            />
          </dd>
        </div>

        <!-- Métadonnées de la dernière réponse. Rendues en clé/valeur SANS que la
             coquille sache ce qu'elles signifient : c'est ce qui la garde
             ignorante du backend qu'elle sert. -->
        <div v-for="[cle, valeur] in dernieresMeta" :key="cle" class="flex items-center gap-2">
          <dt class="shrink-0">{{ cle }}</dt>
          <dd class="truncate text-gray-700 dark:text-gray-300">{{ valeur }}</dd>
        </div>

        <!-- Sonde de compatibilité vocale. À relever depuis les apps installées
             (Play Store / App Store), qu'on ne peut pas tester depuis un poste de
             développement — voir docs/modules/chat/voix.md § Compatibilité. -->
        <div v-if="vocalAutorise && capacitesVocales" class="flex items-center gap-2">
          <dt class="shrink-0">Voix</dt>
          <dd class="truncate text-gray-700 dark:text-gray-300">
            dictée {{ capacitesVocales.dictee ? `✅ ${capacitesVocales.dictee}` : '❌' }} · lecture
            {{ capacitesVocales.lecture ? '✅' : '❌' }} · {{ capacitesVocales.voix }} voix
            {{ langueVocale }}
          </dd>
        </div>
      </dl>
    </details>
  </div>
</template>
