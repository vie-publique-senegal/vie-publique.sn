import type { ChatVariant, ChatVariantStatus } from '~~/types/chat';

/**
 * Registre des variantes du banc d'essai — SOURCE DE VÉRITÉ UNIQUE.
 *
 * Il alimente le routage (`/chat/[variant]`), la page `/chat/liste` et le choix
 * du défaut de `/chat`. Ajouter une stack coûte : une entrée ici + un adaptateur.
 * Zéro nouvelle page, zéro modification de la coquille.
 *
 * Les variantes sont nommées PAR STACK (`gemini`, `azure`, `ragflow`), jamais par
 * numéro de version : « V2 » désigne déjà autre chose dans le projet rag-platform
 * (le wolof comme langue d'interaction).
 */

/** Cible de la redirection `/chat`. ⚠️ Dupliqué en dur dans les `routeRules` de nuxt.config.ts. */
export const CHAT_DEFAULT_VARIANT = 'gemini';

export const CHAT_VARIANTS: ChatVariant[] = [
  {
    id: 'gemini',
    label: 'API RAG Gemini',
    description:
      "POC d'API RAG développée en interne : recherche dans les documents publics puis réponse générée, avec citation des sources.",
    status: 'active',
    // Le corpus indexé est volontairement étroit : une question hors périmètre
    // reçoit « je ne sais pas ». C'est le comportement attendu, pas une panne —
    // le dire ici évite des retours de testeurs sur un faux bug.
    warning:
      'Corpus indexé limité à 136 documents (conseils des ministres, lois de finances, Cour des comptes, statistiques ANSD). Toute autre question recevra « je ne sais pas ».',
    starterQuestions: [
      'Quels départements sont cités comme touchés par l’insécurité alimentaire sévère ?',
      'Quel déficit budgétaire le projet de loi de finances 2026 prévoit-il ?',
      'À quel taux la loi de finances rectificative 2025 révise-t-elle la croissance du PIB ?',
    ],
    loadAdapter: () => import('~/lib/chat/adapters/gemini').then((m) => m.createGeminiAdapter),
  },
  {
    id: 'azure',
    label: 'Chat historique (Azure)',
    description:
      'Le chatbot en service depuis 2025, adossé au backend Azure. Conservé comme point de comparaison.',
    status: 'legacy',
    warning: "Adaptateur factice — aucun backend n'est encore branché sur cette variante.",
    starterQuestions: [
      'Résumé du dernier conseil des ministres ?',
      'Quel âge faut-il avoir pour se syndiquer au Sénégal ?',
    ],
    loadAdapter: () => import('~/lib/chat/adapters/mock').then((m) => m.createMockAdapter),
  },
];

export const CHAT_STATUS_LABELS: Record<ChatVariantStatus, string> = {
  active: 'En cours',
  legacy: 'Historique',
  retired: 'Abandonné',
};

export function findChatVariant(id: string | undefined): ChatVariant | undefined {
  return CHAT_VARIANTS.find((variant) => variant.id === id);
}
