<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';

const props = defineProps<{
  /** Une requête est en cours : on propose l'arrêt plutôt que l'envoi. */
  busy?: boolean;
  /** Secondes restantes avant de pouvoir réessayer (quota atteint). */
  cooldown?: number;
  /**
   * Dictée proposée. `false` = flag coupé ou moteur incapable : le bouton micro
   * n'est pas rendu du tout. Jamais de bouton mort.
   */
  voix?: boolean;
  /** Langue du vocal (BCP-47). Jamais de valeur par défaut ici. */
  voixLang?: string;
}>();

const emit = defineEmits<{
  (e: 'send', question: string): void;
  /** `dictee-demarre` : l'appelant coupe la lecture en cours (barge-in). */
  (e: 'stop' | 'dictee-demarre'): void;
}>();

const question = ref('');
const textarea = ref<{ textarea?: HTMLTextAreaElement } | HTMLElement | null>(null);

const disabled = computed(() => Boolean(props.cooldown && props.cooldown > 0));

/**
 * Mention sur la transmission de l'audio, affichée UNE FOIS avant le premier
 * enregistrement. Point de gouvernance, pas de confort : la reconnaissance
 * vocale n'est pas locale, l'audio part chez un tiers. Sur un service public,
 * l'utilisateur doit le savoir avant de parler, pas après.
 *
 * ⚠️ **Le destinataire dépend de la plateforme, pas seulement du navigateur.**
 * Mesuré le 2026-08-04 sur iPhone : Chrome iOS affiche « les données vocales
 * seront envoyées à **Apple** » — c'est le service système, pas Google. Nommer
 * un seul fournisseur rendrait la mention FAUSSE pour une partie des visiteurs,
 * ce qui est pire que de ne rien dire sur un site de service public. D'où une
 * formulation qui couvre les trois cas sans en garantir un.
 *
 * ⚠️ **Depuis le moteur serveur (2026-09-04), il y a DEUX chemins et donc deux
 * mentions.** Celle du navigateur reste vraie mot pour mot ; elle devient fausse
 * dès que la dictée passe par notre API, puisque l'audio transite alors bien par
 * nos serveurs. Une phrase unique qui couvrirait les deux cas serait vague là où
 * la précédente était précise. Clé de consentement en `v2` : ceux qui ont
 * accepté l'ancienne formulation n'ont pas accepté celle-ci.
 */
const mentionVue = useLocalStorage('vp-chat-voix-mention-v2', false);
const mentionAffichee = ref(false);

const langue = computed(() => props.voixLang ?? '');

// Déstructuré : les refs restent réactives et se déréférencent seules dans le
// template (ce que `dictee.erreur` ne ferait pas).
const {
  disponible: dicteeDisponible,
  supporte: dicteeSupportee,
  permissionRefusee,
  etat: etatDictee,
  enEcoute,
  textePartiel,
  erreur: erreurDictee,
  basculer: basculerDictee,
  arreter: arreterDictee,
  moteurId: moteurDictee,
  effacerErreur,
} = useDicteeVocale({
  lang: langue,
  onTexte: (texte) => {
    // On COMPLÈTE, on n'écrase pas : l'utilisateur a pu commencer à taper.
    // Et surtout on n'envoie PAS — le texte reste visible et modifiable.
    question.value = question.value.trim() ? `${question.value.trim()} ${texte}` : texte;
    focus();
  },
});

/** La dictée passe-t-elle par nos serveurs ? La mention en dépend, pas l'UI. */
const dicteeParNosServeurs = computed(() => moteurDictee.value === 'rag-serveur');

const texteMention = computed(() =>
  dicteeParNosServeurs.value
    ? 'Votre voix est enregistrée puis transmise à notre service, qui la fait transcrire par un prestataire. L’enregistrement n’est pas conservé : seul le texte transcrit reste, dans le champ de saisie, où vous pouvez le corriger. Vous pouvez taper votre question à la place.'
    : 'Votre voix est transmise au service de reconnaissance vocale de votre navigateur ou de votre appareil — Apple, Google ou Microsoft selon le cas — afin d’être transcrite. Elle ne transite pas par nos serveurs, et n’est pas conservée par Vie Publique. Vous pouvez taper votre question à la place.',
);

const micDisponible = computed(() => Boolean(props.voix) && dicteeDisponible.value);
/** Refus de permission : bouton conservé mais inerte et expliqué, plutôt qu'évaporé. */
const micRefuse = computed(
  () => Boolean(props.voix) && dicteeSupportee.value && permissionRefusee.value,
);

const etiquetteMic = computed(() => {
  if (etatDictee.value === 'transcription') return 'Transcription en cours';
  if (etatDictee.value === 'ecoute') return 'Écoute… appuyez quand vous avez fini';
  return 'Dicter la question';
});

function lancerDictee() {
  // Barge-in : couper la lecture AVANT de demander le micro, pour que
  // l'assistant ne se parle pas par-dessus lui-même.
  emit('dictee-demarre');
  effacerErreur();
  basculerDictee();
}

function surClicMic() {
  if (enEcoute.value) {
    // Terminer, pas annuler : le bouton dit « appuyez pour arrêter », et avec un
    // moteur serveur c'est CE geste qui déclenche la transcription.
    basculerDictee();
    return;
  }
  if (!mentionVue.value) {
    mentionAffichee.value = true;
    return;
  }
  lancerDictee();
}

function accepterMention() {
  mentionVue.value = true;
  mentionAffichee.value = false;
  lancerDictee();
}

function submit() {
  if (props.busy || disabled.value) return;
  // Dictée en cours au moment de l'envoi : on la coupe, sinon son résultat
  // atterrirait dans le champ après le départ de la question.
  arreterDictee();
  const valeur = question.value.trim();
  if (!valeur) return;
  question.value = '';
  emit('send', valeur);
}

function focus() {
  nextTick(() => {
    const element = textarea.value as { textarea?: HTMLTextAreaElement } | null;
    (element?.textarea ?? (textarea.value as HTMLElement | null))?.focus?.();
  });
}

defineExpose({ focus, arreterDictee });
</script>

<template>
  <div class="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
    <div class="mx-auto max-w-3xl">
      <p v-if="disabled" class="mb-2 text-center text-sm text-amber-700 dark:text-amber-400">
        Nouvelle question possible dans {{ cooldown }} seconde{{ (cooldown ?? 0) > 1 ? 's' : '' }}.
      </p>

      <!-- Mention avant le PREMIER enregistrement. Sobre, une seule fois, et le
           clavier reste l'option par défaut : on informe, on ne barre pas la route. -->
      <div
        v-if="mentionAffichee"
        class="mb-2 rounded-xl border border-gray-200 px-4 py-3 text-sm dark:border-gray-700"
      >
        <p class="text-gray-700 dark:text-gray-300">{{ texteMention }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton color="primary" size="xs" label="Autoriser et dicter" @click="accepterMention" />
          <UButton
            color="gray"
            variant="ghost"
            size="xs"
            label="Annuler"
            @click="mentionAffichee = false"
          />
        </div>
      </div>

      <!-- Échec de la dictée : message clair, retour au clavier, jamais de blocage. -->
      <p
        v-if="erreurDictee"
        class="mb-2 text-center text-sm text-amber-700 dark:text-amber-400"
        role="status"
      >
        {{ erreurDictee }}
      </p>

      <form class="relative flex w-full flex-col" @submit.prevent="submit">
        <UTextarea
          ref="textarea"
          v-model="question"
          placeholder="Posez une question..."
          color="primary"
          variant="outline"
          class="w-full"
          :rows="1"
          :max-rows="8"
          size="xl"
          :disabled="disabled"
          :autoresize="true"
          :ui="{ base: 'rounded-3xl resize-none pb-12 px-4 pt-3.5 md:text-sm' }"
          @keydown.enter.exact.prevent="submit"
        />

        <!-- Micro à GAUCHE, envoi à droite : la dictée est une alternative à la
             frappe, pas une variante de l'envoi. -->
        <div v-if="micDisponible || micRefuse" class="absolute bottom-3 left-3">
          <UTooltip
            :text="micRefuse ? 'Micro refusé — réautorisez-le dans votre navigateur' : etiquetteMic"
            :delay-duration="0"
          >
            <UButton
              type="button"
              :color="enEcoute ? 'red' : 'gray'"
              :variant="enEcoute ? 'solid' : 'ghost'"
              size="sm"
              :icon="enEcoute ? 'i-lucide-mic-off' : 'i-lucide-mic'"
              class="rounded-full"
              :class="etatDictee === 'ecoute' ? 'animate-pulse' : ''"
              :disabled="disabled || micRefuse"
              :aria-label="etiquetteMic"
              :aria-pressed="enEcoute"
              @click="surClicMic"
            />
          </UTooltip>
        </div>

        <div class="absolute bottom-3 right-3">
          <UButton
            v-if="busy"
            type="button"
            color="gray"
            variant="solid"
            size="sm"
            icon="i-lucide-square"
            class="rounded-full"
            aria-label="Arrêter la réponse"
            @click="emit('stop')"
          />
          <UButton
            v-else
            type="submit"
            color="primary"
            variant="solid"
            size="sm"
            icon="i-lucide-arrow-up"
            class="rounded-full"
            aria-label="Envoyer la question"
            :disabled="!question.trim() || disabled"
            :ui="{ base: 'disabled:opacity-20' }"
          />
        </div>
      </form>

      <!-- Transcription au fil de la parole. SOUS le champ et non dedans : y
           injecter du texte entrerait en conflit avec la frappe si l'utilisateur
           corrige pendant qu'il dicte. -->
      <p
        v-if="enEcoute"
        class="mt-2 flex items-center gap-2 px-2 text-sm text-gray-500 dark:text-gray-400"
        role="status"
        aria-live="polite"
      >
        <span
          class="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-red-500"
          aria-hidden="true"
        />
        <span class="truncate">{{ textePartiel || etiquetteMic }}</span>
      </p>
    </div>
  </div>
</template>
