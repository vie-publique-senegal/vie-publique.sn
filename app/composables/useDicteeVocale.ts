import { moteurEcoute } from '~/lib/voice';
import { ErreurVocale } from '~/lib/voice/types';

/**
 * Dictée vocale : machine à états du bouton micro.
 *
 * Ne connaît d'un moteur que `ecouter(lang) → texte`. Tout ce qui est ici — les
 * états, le refus de permission, l'arrêt sur silence — survit au remplacement du
 * moteur (serveur pour le wolof, pont natif, ASR auto-hébergé).
 *
 * ⚠️ Le texte dicté N'EST JAMAIS envoyé tout seul. Il remplit le champ de saisie
 * et y reste modifiable. C'est la règle de conception demandée, et c'est aussi le
 * meilleur frein anti-spam : le vocal ne peut pas doubler la cadence des requêtes
 * vers une API limitée à 10 questions/minute par IP.
 */

export type EtatDictee =
  /** Prêt. */
  | 'repos'
  /** Micro ouvert, rien entendu encore. */
  | 'ecoute'
  /**
   * Des mots arrivent, ou le moteur traite. Avec Web Speech c'est un état de
   * passage ; avec un moteur serveur (enregistrer puis transcrire) ce sera
   * l'état DOMINANT — d'où sa présence dès maintenant.
   */
  | 'transcription';

export interface OptionsDictee {
  /** Étiquette BCP-47. Réactive : une variante peut changer de langue. */
  lang: Ref<string> | ComputedRef<string>;
  /** Reçoit le texte final. À l'appelant de l'insérer dans le champ. */
  onTexte: (texte: string) => void;
}

export function useDicteeVocale(options: OptionsDictee) {
  const moteur = shallowRef<ReturnType<typeof moteurEcoute>>(null);
  const etat = ref<EtatDictee>('repos');
  const textePartiel = ref('');
  const erreur = ref<string | null>(null);
  /** Refus explicite : on cesse de proposer une action qui échouera à coup sûr. */
  const permissionRefusee = ref(false);

  let abandon: AbortController | null = null;

  // `moteurEcoute()` touche `window` : jamais au rendu serveur. `onMounted`
  // convient ici (contrairement à un état d'URL, rien n'a besoin d'être rendu
  // côté serveur — le bouton n'apparaît qu'une fois les capacités connues).
  onMounted(() => {
    moteur.value = moteurEcoute();
  });

  const disponible = computed(() => moteur.value !== null && !permissionRefusee.value);
  const enEcoute = computed(() => etat.value !== 'repos');

  const MESSAGES: Record<string, string> = {
    'permission-refusee':
      'L’accès au micro a été refusé. Vous pouvez poser votre question au clavier.',
    'aucun-son': 'Rien n’a été entendu. Réessayez, ou tapez votre question.',
    reseau: 'La reconnaissance vocale n’a pas pu être jointe. Vérifiez votre connexion.',
    'non-supporte': 'La dictée n’est pas disponible sur cet appareil.',
    echec: 'La dictée n’a pas abouti. Vous pouvez taper votre question.',
  };

  function arreter() {
    abandon?.abort();
    abandon = null;
    etat.value = 'repos';
    textePartiel.value = '';
  }

  async function demarrer() {
    if (!moteur.value || enEcoute.value) return;

    erreur.value = null;
    textePartiel.value = '';
    etat.value = 'ecoute';
    abandon = new AbortController();

    try {
      const texte = await moteur.value.ecouter({
        lang: options.lang.value,
        signal: abandon.signal,
        onPartiel: (partiel) => {
          textePartiel.value = partiel;
          if (partiel) etat.value = 'transcription';
        },
      });
      if (texte) options.onTexte(texte);
    } catch (echec) {
      const code = echec instanceof ErreurVocale ? echec.code : 'echec';
      // Une annulation est une action de l'utilisateur, pas une erreur à afficher.
      if (code !== 'annule') erreur.value = MESSAGES[code] ?? MESSAGES.echec!;
      if (code === 'permission-refusee') permissionRefusee.value = true;
    } finally {
      abandon = null;
      etat.value = 'repos';
      textePartiel.value = '';
    }
  }

  /** Un seul bouton : démarre, ou arrête si l'écoute est en cours. */
  function basculer() {
    if (enEcoute.value) arreter();
    else void demarrer();
  }

  // La reconnaissance garde le micro ouvert si personne ne la coupe : le voyant
  // resterait allumé après un changement de page.
  onBeforeUnmount(arreter);

  return {
    /** Le bouton ne doit s'afficher que si `true`. Jamais de bouton mort. */
    disponible,
    /** `true` dès qu'un moteur sait écouter, même après un refus — pour l'explication. */
    supporte: computed(() => moteur.value !== null),
    permissionRefusee: readonly(permissionRefusee),
    etat: readonly(etat),
    enEcoute,
    textePartiel: readonly(textePartiel),
    erreur: readonly(erreur),
    basculer,
    arreter,
    effacerErreur: () => {
      erreur.value = null;
    },
  };
}
