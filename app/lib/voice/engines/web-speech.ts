import { ErreurVocale } from '../types';
import type { CodeErreurVocale, MoteurVocal, OptionsEcoute, OptionsLecture } from '../types';

/**
 * Moteur vocal Web Speech API — SEULE implémentation à ce jour.
 *
 * ⚠️ **L'ASR n'est PAS local.** Chrome et Edge envoient l'audio du micro à leurs
 * serveurs (Google, Microsoft) pour le transcrire. Pour un service public, c'est
 * une décision de gouvernance : l'utilisateur en est averti AVANT le premier
 * enregistrement (voir `ChatComposer`), et le sujet est documenté dans
 * docs/modules/chat/voix.md § Gouvernance. Le jour où c'est refusé, on remplace
 * ce fichier — et rien d'autre.
 *
 * Disponibilité (détection de fonctionnalité, jamais de reniflage de navigateur) :
 * absent de Firefox, absent des WebView iOS. Là où il manque, le bouton micro ne
 * s'affiche pas. La synthèse, elle, est disponible à peu près partout.
 */

interface ConstructeurReconnaissance {
  new (): SpeechRecognitionLike;
}

/**
 * Le DOM lib de TypeScript ne type pas SpeechRecognition (API non standardisée).
 * On décrit ici le strict nécessaire plutôt que de saupoudrer des `any`.
 */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((evenement: EvenementResultat) => void) | null;
  onerror: ((evenement: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
}

interface EvenementResultat {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

/** Silence toléré avant arrêt automatique de l'écoute. */
const DELAI_SILENCE_MS = 8_000;
/** Plafond dur : un micro ne reste pas ouvert indéfiniment. */
const DUREE_MAX_MS = 30_000;
/** Délai laissé au moteur pour rappeler après un `stop()`, avant qu'on force. */
const DELAI_GRACE_MS = 2_000;
/**
 * Chrome met en pause sa synthèse au bout d'une quinzaine de secondes (bug connu,
 * jamais corrigé). Lire PHRASE PAR PHRASE l'évite presque toujours ; ce ping est
 * la ceinture en plus des bretelles, et `resume()` sur une synthèse active est
 * un no-op.
 */
const PING_REPRISE_MS = 8_000;

function constructeurReconnaissance(): ConstructeurReconnaissance | null {
  if (typeof window === 'undefined') return null;
  const global = window as unknown as {
    SpeechRecognition?: ConstructeurReconnaissance;
    webkitSpeechRecognition?: ConstructeurReconnaissance;
  };
  return global.SpeechRecognition ?? global.webkitSpeechRecognition ?? null;
}

function synthese(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis ?? null;
}

function codeDepuisErreur(erreur: string): CodeErreurVocale {
  switch (erreur) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'permission-refusee';
    case 'no-speech':
      return 'aucun-son';
    case 'network':
      return 'reseau';
    case 'aborted':
      return 'annule';
    default:
      return 'echec';
  }
}

/** Voix installée la plus proche de `lang` : exacte d'abord, puis même langue. */
function choisirVoix(lang: string): SpeechSynthesisVoice | null {
  const voix = synthese()?.getVoices() ?? [];
  if (!voix.length) return null;

  const cible = lang.toLowerCase();
  const racine = cible.split('-')[0]!;

  return (
    voix.find((v) => v.lang.toLowerCase() === cible) ??
    voix.find((v) => v.lang.toLowerCase().startsWith(racine)) ??
    null
  );
}

export function creerMoteurWebSpeech(): MoteurVocal {
  return {
    id: 'web-speech',

    peutEcouter: () => constructeurReconnaissance() !== null,

    peutParler: () => synthese() !== null,

    voixDisponibles(lang) {
      const racine = lang.toLowerCase().split('-')[0]!;
      return (synthese()?.getVoices() ?? []).filter((v) => v.lang.toLowerCase().startsWith(racine))
        .length;
    },

    ecouter({ lang, onPartiel, signal }: OptionsEcoute) {
      return new Promise<string>((resoudre, rejeter) => {
        const Constructeur = constructeurReconnaissance();
        if (!Constructeur) {
          rejeter(new ErreurVocale('non-supporte'));
          return;
        }

        const reconnaissance = new Constructeur();
        reconnaissance.lang = lang;
        // `continuous: false` : on dicte UNE question, pas un dictaphone. Le
        // moteur s'arrête seul en fin d'énoncé — premier garde-fou anti-micro-ouvert.
        reconnaissance.continuous = false;
        reconnaissance.interimResults = true;
        reconnaissance.maxAlternatives = 1;

        let texteFinal = '';
        let regle = false;
        let minuteurSilence: ReturnType<typeof setTimeout> | null = null;
        let minuteurPlafond: ReturnType<typeof setTimeout> | null = null;
        let minuteurGrace: ReturnType<typeof setTimeout> | null = null;

        const nettoyer = () => {
          if (minuteurSilence) clearTimeout(minuteurSilence);
          if (minuteurPlafond) clearTimeout(minuteurPlafond);
          if (minuteurGrace) clearTimeout(minuteurGrace);
          signal.removeEventListener('abort', surAbandon);
          reconnaissance.onresult = null;
          reconnaissance.onerror = null;
          reconnaissance.onend = null;
          reconnaissance.onspeechend = null;
        };

        // `onend` suit TOUJOURS `onerror` : sans ce drapeau, on résoudrait après
        // avoir rejeté (sans effet, mais on nettoierait deux fois).
        const regler = (action: () => void) => {
          if (regle) return;
          regle = true;
          nettoyer();
          action();
        };

        function surAbandon() {
          reconnaissance.abort();
          regler(() => rejeter(new ErreurVocale('annule')));
        }

        /**
         * Demande l'arrêt, PUIS force le règlement si le moteur ne rappelle pas.
         *
         * Sans ce filet, une implémentation présente mais MUETTE laisse la
         * promesse en suspens pour toujours : le bouton reste sur « Écoute » et
         * seul un clic de l'utilisateur en sort. Observé tel quel dans un Chrome
         * sans service de reconnaissance (`start()` ne lève pas, et ni `onend`
         * ni `onerror` ne viennent JAMAIS) — c'est exactement le comportement à
         * craindre d'une WebView où l'API existe sans rien derrière.
         */
        const arreterPuisForcer = () => {
          reconnaissance.stop();
          if (minuteurGrace) clearTimeout(minuteurGrace);
          minuteurGrace = setTimeout(() => {
            reconnaissance.abort();
            // On rend ce qui a été transcrit : `''` si rien, ce que l'appelant
            // traite comme une dictée sans résultat, pas comme une panne.
            regler(() => resoudre(texteFinal.trim()));
          }, DELAI_GRACE_MS);
        };

        const armerSilence = () => {
          if (minuteurSilence) clearTimeout(minuteurSilence);
          // `stop()` et non `abort()` : on veut GARDER ce qui a déjà été dit.
          minuteurSilence = setTimeout(arreterPuisForcer, DELAI_SILENCE_MS);
        };

        reconnaissance.onresult = (evenement) => {
          let partiel = '';
          for (let i = evenement.resultIndex; i < evenement.results.length; i += 1) {
            const resultat = evenement.results[i]!;
            const transcription = resultat[0]?.transcript ?? '';
            if (resultat.isFinal) texteFinal += transcription;
            else partiel += transcription;
          }
          armerSilence();
          onPartiel?.(`${texteFinal}${partiel}`.trim());
        };

        reconnaissance.onerror = (evenement) => {
          const code = codeDepuisErreur(evenement.error);
          // « aucun son » alors qu'on a déjà transcrit quelque chose n'est pas un
          // échec : c'est la fin normale de la dictée.
          if (code === 'aucun-son' && texteFinal.trim()) {
            regler(() => resoudre(texteFinal.trim()));
            return;
          }
          regler(() => rejeter(new ErreurVocale(code, evenement.error)));
        };

        reconnaissance.onend = () => regler(() => resoudre(texteFinal.trim()));

        signal.addEventListener('abort', surAbandon);
        minuteurPlafond = setTimeout(arreterPuisForcer, DUREE_MAX_MS);
        armerSilence();

        try {
          reconnaissance.start();
        } catch (erreur) {
          // `start()` sur une instance déjà démarrée lève de façon synchrone.
          regler(() => rejeter(new ErreurVocale('echec', String(erreur))));
        }
      });
    },

    amorcer() {
      const moteur = synthese();
      if (!moteur) return;
      // Énoncé muet, dont le seul rôle est de partir DANS le geste utilisateur.
      // C'est lui qui débloque la synthèse sur iOS ; le contenu n'a aucune
      // importance, seul compte le fait qu'un `speak()` ait eu lieu à cet
      // instant précis. Surtout pas de `cancel()` derrière : il annulerait
      // l'amorce. Ré-amorcer à chaque activation est volontaire — la session
      // audio peut avoir été perdue après un passage en arrière-plan.
      const amorce = new SpeechSynthesisUtterance(' ');
      amorce.volume = 0;
      moteur.speak(amorce);
    },

    parler(texte: string, { lang, signal }: OptionsLecture) {
      return new Promise<void>((resoudre, rejeter) => {
        const moteur = synthese();
        if (!moteur) {
          rejeter(new ErreurVocale('non-supporte'));
          return;
        }
        if (signal.aborted) {
          resoudre();
          return;
        }

        const enonce = new SpeechSynthesisUtterance(texte);
        enonce.lang = lang;
        // Pas de voix trouvée : on laisse `lang` décider. Forcer une voix d'une
        // autre langue serait pire que de laisser le moteur choisir.
        const voix = choisirVoix(lang);
        if (voix) enonce.voice = voix;

        let regle = false;
        let ping: ReturnType<typeof setInterval> | null = null;

        const regler = (action: () => void) => {
          if (regle) return;
          regle = true;
          if (ping) clearInterval(ping);
          signal.removeEventListener('abort', surAbandon);
          action();
        };

        function surAbandon() {
          moteur!.cancel();
          // Une annulation N'EST PAS un échec : la file de lecture doit pouvoir
          // enchaîner ou s'arrêter proprement sans traiter d'exception.
          regler(resoudre);
        }

        enonce.onend = () => regler(resoudre);
        enonce.onerror = (evenement) => {
          const raison = (evenement as SpeechSynthesisErrorEvent).error;
          if (raison === 'interrupted' || raison === 'canceled') {
            regler(resoudre);
            return;
          }
          regler(() => rejeter(new ErreurVocale('echec', raison)));
        };

        signal.addEventListener('abort', surAbandon);
        ping = setInterval(() => moteur.resume(), PING_REPRISE_MS);
        moteur.speak(enonce);
      });
    },
  };
}
