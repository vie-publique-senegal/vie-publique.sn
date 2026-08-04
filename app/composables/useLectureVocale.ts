import { useLocalStorage } from '@vueuse/core';
import {
  creerTamponPhrases,
  moteurLecture,
  nettoyerPourLecture,
  vautLaPeineDEtreLu,
} from '~/lib/voice';
import type { TamponPhrases } from '~/lib/voice/phrases';

/**
 * Lecture vocale de la réponse AU FIL du flux SSE.
 *
 * Le point clé : on ne lit pas la réponse une fois terminée. Les tokens sont
 * bufferisés, découpés en phrases (`creerTamponPhrases`), nettoyés
 * (`nettoyerPourLecture`) et envoyés à la synthèse dès qu'une phrase est
 * complète. Sinon on attendrait la fin de la génération pour entendre le premier
 * mot, et le streaming ne servirait plus à rien.
 *
 * La file est SÉRIALISÉE par la promesse de `parler()` : sans elle, les phrases
 * se chevaucheraient.
 */

/** Sourdine mémorisée entre les sessions. Clé versionnée pour pouvoir migrer. */
const CLE_ACTIF = 'vp-chat-voix-lecture-v1';

export interface OptionsLectureVocale {
  lang: Ref<string> | ComputedRef<string>;
}

export function useLectureVocale(options: OptionsLectureVocale) {
  const moteur = shallowRef<ReturnType<typeof moteurLecture>>(null);

  /**
   * SILENCE PAR DÉFAUT — décision, pas un oubli. Un service public ne se met pas
   * à parler sans qu'on le lui demande ; et le clic d'activation fournit au
   * passage l'activation utilisateur que Safari exige avant toute synthèse.
   */
  const actif = useLocalStorage(CLE_ACTIF, false);

  const enLecture = ref(false);

  let tampon: TamponPhrases = creerTamponPhrases();
  let file: string[] = [];
  let vidageEnCours = false;
  let abandon: AbortController | null = null;

  onMounted(() => {
    moteur.value = moteurLecture();
  });

  const disponible = computed(() => moteur.value !== null);

  function arreter() {
    abandon?.abort();
    abandon = null;
    file = [];
    tampon = creerTamponPhrases();
    enLecture.value = false;
  }

  async function traiterFile() {
    if (vidageEnCours) return;
    vidageEnCours = true;

    try {
      while (file.length) {
        const phrase = file.shift()!;
        const moteurCourant = moteur.value;
        if (!moteurCourant || !actif.value) break;

        if (!abandon) abandon = new AbortController();
        const signal = abandon.signal;
        if (signal.aborted) break;

        enLecture.value = true;
        try {
          await moteurCourant.parler(phrase, { lang: options.lang.value, signal });
        } catch (erreur) {
          // Un énoncé qui échoue ne doit pas tuer la lecture : on passe au
          // suivant. La dégradation reste silencieuse pour l'utilisateur, qui a
          // le texte sous les yeux de toute façon.
          console.warn('[voix] énoncé non lu', erreur);
        }
      }
    } finally {
      vidageEnCours = false;
      enLecture.value = false;
    }
  }

  function mettreEnFile(phrases: string[]) {
    for (const phrase of phrases) {
      const propre = nettoyerPourLecture(phrase);
      // Une phrase réduite à de la ponctuation (ligne de tableau, filet, URL
      // seule) produirait un silence, ou pire un « point ».
      if (vautLaPeineDEtreLu(propre)) file.push(propre);
    }
    if (file.length) void traiterFile();
  }

  /**
   * Un fragment du flux SSE. À appeler sur CHAQUE token, sans se demander s'il
   * termine une phrase : c'est le rôle du tampon.
   */
  function pousser(fragment: string) {
    // Sourdine : on ne bufferise même pas. Conséquence assumée — activer le son
    // en cours de réponse démarre la lecture à la phrase SUIVANTE, pas au début.
    if (!actif.value || !moteur.value) return;
    mettreEnFile(tampon.pousser(fragment));
  }

  /** Fin du flux : la dernière phrase n'a pas de ponctuation finale garantie. */
  function terminer() {
    if (!actif.value || !moteur.value) return;
    mettreEnFile(tampon.vider());
  }

  function basculer() {
    actif.value = !actif.value;
    // Couper le son doit couper MAINTENANT, pas à la fin de la phrase en cours.
    if (!actif.value) arreter();
  }

  // La synthèse est un service GLOBAL du navigateur : elle survit au composant
  // et continuerait de parler sur la page suivante si personne ne l'annulait.
  onBeforeUnmount(arreter);

  return {
    /** Le bouton ne doit s'afficher que si `true`. */
    disponible,
    /** Son activé. Persisté entre les sessions. */
    actif,
    enLecture: readonly(enLecture),
    pousser,
    terminer,
    /** Barge-in et interruptions. Idempotent. */
    arreter,
    basculer,
    /** Diagnostic : nombre de voix installées pour la langue courante. */
    nombreDeVoix: () => moteur.value?.voixDisponibles?.(options.lang.value) ?? 0,
  };
}
