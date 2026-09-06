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
  /**
   * La langue RÉELLEMENT entendue, quand le moteur sait la reconnaître.
   *
   * Un moteur serveur la reçoit de sa transcription ; Web Speech ne la rend pas
   * (on lui a imposé une langue, il n'en détecte aucune). C'est cette
   * information qui évite de redeviner en aval la langue de la réponse.
   */
  onLangue?: (lang: string) => void;
  /** Annulation : on jette ce qui a été capté. Démontage, barge-in, sourdine. */
  signal: AbortSignal;
  /**
   * « J'ai fini de parler » — arrête la CAPTURE et rend ce qui a été dit.
   *
   * Distinct de `signal`, et il a fallu l'ajouter : avec Web Speech, le moteur
   * s'arrête seul en fin d'énoncé et l'utilisateur n'a presque jamais besoin de
   * le lui dire. Un moteur serveur enregistre jusqu'à ce qu'on l'arrête — sans
   * ce signal, le seul contrôle disponible était l'annulation, qui jette
   * l'enregistrement au moment précis où l'on voulait le transcrire.
   *
   * Optionnel : un appelant qui ne le fournit pas laisse le moteur décider de sa
   * fin (silence, plafond de durée).
   */
  signalFin?: AbortSignal;
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
   *
   * `lang` est passée à `peutEcouter` parce qu'un moteur peut savoir écouter
   * sans savoir écouter CETTE langue — c'est le cas de Web Speech pour le
   * wolof. Sans elle, le premier moteur de la liste se déclarerait capable et
   * la dictée wolof partirait chez un service qui ne la connaît pas. Absente =
   * « sais-tu écouter, quelle que soit la langue ». Toujours un paramètre,
   * jamais une valeur portée par l'interface.
   */
  peutEcouter(lang?: string): boolean;
  /**
   * `lang` pour la même raison que `peutEcouter` : Web Speech sait parler, mais
   * aucune voix wolof n'existe côté navigateur. Sans ce paramètre, il se
   * déclarerait capable et lirait une réponse wolof avec une voix française —
   * du charabia, là où l'absence de bouton aurait été honnête.
   */
  peutParler(lang?: string): boolean;

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

  /**
   * Consomme l'activation utilisateur pour débloquer la synthèse.
   *
   * ⚠️ **DOIT être appelée SYNCHRONIQUEMENT depuis un gestionnaire d'événement
   * utilisateur** (le clic sur le bouton son). iOS n'autorise la synthèse que si
   * le tout PREMIER `speak()` part d'un geste : sans cette amorce, tous les
   * énoncés suivants — qui partent d'une continuation asynchrone du flux SSE —
   * sont ignorés **en silence**, sans erreur ni événement.
   *
   * ⚠️ **« Un moteur serveur n'aura pas cette contrainte » — c'est ce qui était
   * écrit ici, et c'est FAUX.** Mesuré sur iPhone le 2026-09-05 : un moteur qui
   * joue un `<audio>` après un appel réseau se heurte au même mur, et pour la
   * même raison — le `play()` ne part plus du geste. La parade est la même :
   * débloquer un élément DANS le clic, puis le réutiliser.
   *
   * Optionnelle au sens du contrat : un moteur qui n'en a pas besoin l'omet.
   */
  amorcer?(): void;

  /** Nombre de voix installées pour `lang`. Diagnostic uniquement. */
  voixDisponibles?(lang: string): number;
}
