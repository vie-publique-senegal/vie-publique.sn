/**
 * Contrat commun du banc d'essai de chatbots (voir docs/modules/chat/).
 *
 * Toutes les variantes s'expriment dans ces types, quel que soit leur backend.
 * Un backend sans streaming n'est pas un cas particulier : il émet un unique
 * `token` puis `done`, et la coquille ignore qu'il ne streamait pas.
 *
 * Les noms sont en anglais et en camelCase : c'est le contrat CLIENT, pas le
 * format de transport. Chaque adaptateur traduit le format de son backend
 * (snake_case côté API RAG, autre chose ailleurs) vers ces types.
 */

/**
 * Document cité par une réponse.
 *
 * ⚠️ Les URLs sont FOURNIES par le backend, jamais recomposées ici depuis
 * `externalId` ou un slug : le jour où le patron d'URL change côté serveur,
 * un client qui les fabrique casse en silence.
 */
export interface ChatSource {
  externalId?: string;
  title: string;
  pageUrl?: string;
  fileUrl?: string;
  publishDate?: string;
  page?: number;
  excerpt?: string;
}

export type ChatEvent =
  /** Fragment de réponse à afficher au fil de l'eau. */
  | { type: 'token'; text: string }
  /** Documents cités. Au plus une fois, avant l'événement terminal. */
  | { type: 'sources'; sources: ChatSource[] }
  /** Questions de relance proposées par le backend (Azure en fournit, pas tous). */
  | { type: 'suggestions'; questions: string[] }
  /** Événement terminal de succès. */
  | {
      type: 'done';
      conversationId?: string;
      /** Le backend avait perdu le contexte : la réponse ignore les tours précédents. */
      conversationReset?: boolean;
      /**
       * Métadonnées de diagnostic (latence, modèle…). Volontairement opaque :
       * la coquille les affiche en clé/valeur sans jamais nommer une clé, ce
       * qui la garde ignorante du backend qu'elle sert.
       */
      meta?: Record<string, unknown>;
    }
  /** Événement terminal d'échec. `message` est destiné à l'utilisateur, en français. */
  | { type: 'error'; code: string; message: string; retryAfterSeconds?: number };

export interface ChatSendContext {
  /** Identifiant du fil, quand le backend en gère un. */
  conversationId?: string;
  signal: AbortSignal;
}

export interface ChatAdapter {
  id: string;
  send(question: string, ctx: ChatSendContext): AsyncIterable<ChatEvent>;
}

/** `runtimeConfig.public`, passé tel quel : chaque adaptateur y pioche ce dont il a besoin. */
export type ChatPublicConfig = Record<string, unknown>;

export type ChatAdapterFactory = (config: ChatPublicConfig) => ChatAdapter;

/** `active` = POC en cours, `legacy` = conservé pour comparaison, `retired` = abandonné. */
export type ChatVariantStatus = 'active' | 'legacy' | 'retired';

export interface ChatVariant {
  /** Identifiant d'URL (`/chat/<id>`) ET de stack. Jamais un numéro de version. */
  id: string;
  label: string;
  description: string;
  status: ChatVariantStatus;
  /** Icône de la stack (Iconify), affichée dans la liste et l'en-tête. */
  icon?: string;
  /**
   * Variante listée mais NON testable (backend pas encore branché).
   * On la laisse visible — le banc doit montrer ce qui est prévu — mais sans
   * adaptateur : faire tester un faux chat produirait de faux retours.
   */
  available: boolean;
  /** Limite connue, affichée à l'accueil de la conversation (jamais en bandeau fixe). */
  warning?: string;
  starterQuestions?: string[];
  /** Chargement paresseux : le code d'une variante ne pèse pas sur les autres. */
  loadAdapter?: () => Promise<ChatAdapterFactory>;
}
