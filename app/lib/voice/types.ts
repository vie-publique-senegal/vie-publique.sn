/**
 * Contrat du moteur vocal — INTERFACE ÉTROITE, et volontairement.
 *
 * On sait déjà par quoi ce moteur sera remplacé :
 *
 * - un **moteur serveur** pour le wolof, que Web Speech ne connaît pas ;
 * - un **pont vers les STT/TTS natifs** si l'API n'est pas disponible en WebView
 *   (c'est le cas de l'app iOS : voir docs/modules/chat/voix.md) ;
 * - un **ASR auto-hébergé** si l'envoi de l'audio chez Google est refusé.
 *
 * Tout ce qui entoure le moteur — états du bouton, barge-in, découpage du flux
 * SSE en phrases, nettoyage du texte avant lecture — n'en dépend pas et reste en
 * place quand il change. C'est la seule raison d'être de cette interface : elle
 * n'est pas de l'abstraction gratuite.
 *
 * ⚠️ Aucune valeur de langue ici. La langue est TOUJOURS un paramètre d'appel.
 */

export type CodeErreurVocale =
  /** Le moteur ne sait pas faire (API absente). Ne devrait pas remonter à l'UI :
   *  `peutEcouter()` / `peutParler()` sont testés avant. */
  | 'non-supporte'
  /** L'utilisateur (ou une politique du navigateur) a refusé le micro. */
  | 'permission-refusee'
  /** Micro ouvert, rien entendu. Cas banal, pas une panne. */
  | 'aucun-son'
  /** Le moteur n'a pas pu joindre son service de reconnaissance. */
  | 'reseau'
  /** Arrêt demandé par l'application (barge-in, démontage, sourdine). */
  | 'annule'
  | 'echec';

export class ErreurVocale extends Error {
  constructor(
    readonly code: CodeErreurVocale,
    message?: string,
  ) {
    super(message ?? `erreur vocale : ${code}`);
    this.name = 'ErreurVocale';
  }
}

export interface OptionsEcoute {
  /** Étiquette BCP-47 (`fr-FR`, un jour `wo-SN`). Jamais de défaut ici. */
  lang: string;
  /**
   * Transcription partielle, si le moteur en produit. Un moteur serveur
   * (enregistrer puis transcrire) n'en produira AUCUNE : l'appelant doit donc
   * rester lisible sans, et se contenter d'un état « transcription en cours ».
   */
  onPartiel?: (texte: string) => void;
  signal: AbortSignal;
}

export interface OptionsLecture {
  lang: string;
  signal: AbortSignal;
}

export interface MoteurVocal {
  /** Identifiant de diagnostic, affiché dans le pied de conversation. */
  id: string;

  /**
   * Détection de FONCTIONNALITÉ, jamais de navigateur. Ces deux méthodes sont
   * la seule chose qui décide si un bouton s'affiche : pas de bouton mort.
   */
  peutEcouter(): boolean;
  peutParler(): boolean;

  /**
   * Rend le texte final dicté. Rejette une `ErreurVocale`.
   * L'annulation passe par `options.signal` — jamais par une méthode d'instance,
   * pour qu'un appelant ne puisse pas oublier de nettoyer.
   */
  ecouter(options: OptionsEcoute): Promise<string>;

  /**
   * Résolue quand l'énoncé est TERMINÉ. C'est cette promesse qui sérialise la
   * file de phrases : sans elle, les phrases se chevaucheraient.
   * Une annulation résout (elle n'est pas un échec).
   */
  parler(texte: string, options: OptionsLecture): Promise<void>;

  /** Nombre de voix installées pour `lang`. Diagnostic uniquement. */
  voixDisponibles?(lang: string): number;
}
