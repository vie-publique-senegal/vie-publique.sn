import { creerGestionnaireJeton, gestionnaireJetonPartage } from '../../chat/session-token';
import { ErreurVocale } from '../types';
import type { MoteurVocal, OptionsEcoute, OptionsLecture } from '../types';

/**
 * Moteur de dictée SERVEUR — enregistre, puis fait transcrire par `POST /transcribe`.
 *
 * Il existe pour le **wolof**, qu'aucun service Web Speech ne transcrit (c'est
 * tout l'objet de l'étape 12 du RAG), et il sert de repli là où l'API du
 * navigateur manque — Firefox. Web Speech reste prioritaire en français : il est
 * gratuit, immédiat, et il rend du partiel.
 *
 * ⚠️ **Trois différences de nature avec Web Speech**, qui se voient à l'usage :
 *
 * 1. **aucune transcription partielle** — il n'y a rien à afficher pendant qu'on
 *    parle. L'état « transcription en cours » devient l'état dominant ;
 * 2. **l'arrêt est explicite** : le moteur enregistre jusqu'à `signalFin`, le
 *    plafond de durée, ou l'annulation. C'est le moteur qui impose le bouton
 *    « j'ai fini de parler », pas une préférence d'ergonomie ;
 * 3. **l'audio transite par nos serveurs** avant d'aller chez le transcripteur.
 *    Point de gouvernance, pas d'implémentation : la mention affichée avant le
 *    premier enregistrement le dit (`ChatComposer`), et
 *    `docs/modules/chat/voix.md` § Gouvernance le documente.
 *
 * Il ne sait pas parler : la synthèse wolof est un autre chantier (étape 13).
 */

/**
 * Types que le navigateur peut produire ET que l'API accepte, par ordre de
 * préférence. Chrome et Firefox rendent du webm/opus, Safari du mp4.
 *
 * ⚠️ La liste ne s'invente pas : elle doit rester incluse dans la liste blanche
 * de `speech/formats.py` côté API, qui refuse le reste en 415.
 */
const TYPES_CANDIDATS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

/**
 * Plafond dur de l'enregistrement. Aligné sur `RAG_TRANSCRIBE_MAX_SECONDS`
 * (120 s côté API) avec de la marge : mieux vaut arrêter nous-mêmes et
 * transcrire ce qui a été dit que se faire refuser tout l'enregistrement.
 */
const DUREE_MAX_MS = 90_000;

/** Messages d'erreur de l'API qu'il vaut la peine de distinguer pour l'utilisateur. */
function codeDepuisStatut(statut: number) {
  if (statut === 401 || statut === 403) return 'echec' as const;
  if (statut === 429) return 'reseau' as const;
  if (statut === 413 || statut === 415) return 'echec' as const;
  return statut >= 500 ? ('reseau' as const) : ('echec' as const);
}

function typeSupporte(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  return TYPES_CANDIDATS.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function baseApi(): string {
  try {
    return String(useRuntimeConfig().public.ragApiUrl ?? '').replace(/\/+$/, '');
  } catch (erreur) {
    // Hors contexte Nuxt (test unitaire, rendu isolé) : pas de config, donc pas
    // d'API à joindre. Le moteur se déclare incapable plutôt que de lever —
    // mais il le DIT : sans ce message, une régression d'auto-import ferait
    // simplement disparaître la dictée wolof, sans erreur ni bouton.
    console.warn('[voix] configuration de l’API RAG illisible, dictée serveur inactive', erreur);
    return '';
  }
}

export interface DependancesMoteurRag {
  /** Base de l'API. Injectable pour les tests ; sinon la config runtime. */
  base?: () => string;
}

export function creerMoteurRagServeur(deps: DependancesMoteurRag = {}): MoteurVocal {
  const base = deps.base ?? baseApi;

  const jetons = () =>
    gestionnaireJetonPartage(base(), () =>
      creerGestionnaireJeton({
        async recupererJeton(signal) {
          const reponse = await fetch(`${base()}/session`, { method: 'POST', signal });
          if (!reponse.ok) throw new ErreurVocale('reseau', `session ${reponse.status}`);
          return reponse.json();
        },
      }),
    );

  return {
    id: 'rag-serveur',

    peutEcouter() {
      // Détection de fonctionnalité, jamais de navigateur — et aucune restriction
      // de langue : c'est le serveur qui détecte celle qui est parlée.
      return (
        typeof window !== 'undefined' &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeSupporte() !== null &&
        base() !== ''
      );
    },

    /** La synthèse wolof est un autre chantier. Web Speech garde la lecture. */
    peutParler: () => false,

    parler(_texte: string, _options: OptionsLecture) {
      return Promise.reject(new ErreurVocale('non-supporte'));
    },

    async ecouter({ lang, signal, signalFin }: OptionsEcoute) {
      const type = typeSupporte();
      if (!type) throw new ErreurVocale('non-supporte');

      let flux: MediaStream;
      try {
        flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (erreur) {
        const nom = (erreur as { name?: string })?.name;
        throw new ErreurVocale(
          nom === 'NotAllowedError' || nom === 'SecurityError' ? 'permission-refusee' : 'echec',
          String(nom ?? erreur),
        );
      }

      try {
        const morceaux = await enregistrer(flux, type, { signal, signalFin });
        if (signal.aborted) throw new ErreurVocale('annule');
        const audio = new Blob(morceaux, { type });
        // Un enregistrement vide, c'est un micro ouvert sur rien : cas banal,
        // pas une panne — et surtout pas un appel facturé pour du silence.
        if (audio.size === 0) throw new ErreurVocale('aucun-son');
        return await transcrire(audio, { base: base(), lang, jetons: jetons(), signal });
      } finally {
        // Le voyant du micro reste allumé tant que les pistes vivent.
        flux.getTracks().forEach((piste) => piste.stop());
      }
    },
  };
}

/** Enregistre jusqu'à `signalFin`, le plafond de durée, ou l'annulation. */
function enregistrer(
  flux: MediaStream,
  type: string,
  signaux: { signal: AbortSignal; signalFin?: AbortSignal },
): Promise<Blob[]> {
  return new Promise((resoudre, rejeter) => {
    const enregistreur = new MediaRecorder(flux, { mimeType: type });
    const morceaux: Blob[] = [];
    let plafond: ReturnType<typeof setTimeout> | null = null;

    const nettoyer = () => {
      if (plafond) clearTimeout(plafond);
      signaux.signal.removeEventListener('abort', surAnnulation);
      signaux.signalFin?.removeEventListener('abort', arreter);
    };

    function arreter() {
      if (enregistreur.state !== 'inactive') enregistreur.stop();
    }

    function surAnnulation() {
      arreter();
      nettoyer();
      rejeter(new ErreurVocale('annule'));
    }

    enregistreur.ondataavailable = (evenement) => {
      if (evenement.data.size > 0) morceaux.push(evenement.data);
    };
    enregistreur.onerror = () => {
      nettoyer();
      rejeter(new ErreurVocale('echec', 'enregistrement interrompu'));
    };
    enregistreur.onstop = () => {
      nettoyer();
      resoudre(morceaux);
    };

    signaux.signal.addEventListener('abort', surAnnulation);
    signaux.signalFin?.addEventListener('abort', arreter);
    plafond = setTimeout(arreter, DUREE_MAX_MS);

    enregistreur.start();
  });
}

/** Envoie l'enregistrement à `POST /transcribe` et rend le texte. */
async function transcrire(
  audio: Blob,
  contexte: {
    base: string;
    lang: string;
    jetons: ReturnType<typeof creerGestionnaireJeton>;
    signal: AbortSignal;
  },
): Promise<string> {
  const corps = new FormData();
  // Le nom du fichier ne sert qu'aux journaux : l'API décide du format sur le
  // type déclaré ET sur les octets de tête, jamais sur l'extension.
  corps.append('file', audio, 'dictee');
  if (contexte.lang) corps.append('lang', contexte.lang);

  let jeton: string;
  try {
    jeton = await contexte.jetons.obtenir(contexte.signal);
  } catch {
    throw new ErreurVocale('reseau', 'session indisponible');
  }

  let reponse: Response;
  try {
    reponse = await fetch(`${contexte.base}/transcribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}` },
      body: corps,
      signal: contexte.signal,
    });
  } catch (erreur) {
    if (contexte.signal.aborted) throw new ErreurVocale('annule');
    throw new ErreurVocale('reseau', String(erreur));
  }

  if (!reponse.ok) {
    // Un jeton refusé est jetable : le suivant sera redemandé.
    if (reponse.status === 401) contexte.jetons.invalider();
    throw new ErreurVocale(codeDepuisStatut(reponse.status), `transcribe ${reponse.status}`);
  }

  const charge = (await reponse.json()) as { text?: string };
  const texte = (charge.text ?? '').trim();
  // Rien entendu : même verdict qu'un enregistrement vide.
  if (!texte) throw new ErreurVocale('aucun-son');
  return texte;
}
