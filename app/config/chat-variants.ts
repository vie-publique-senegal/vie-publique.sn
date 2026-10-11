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

/** Nom public de l'assistant, commun à toutes les variantes. */
export const CHAT_ASSISTANT_NAME = 'Sira';

export const CHAT_ASSISTANT_TAGLINE =
  'Sira, l’assistant de Vie Publique Sénégal. Il recherche dans les lois, rapports, décrets, budgets et autres documents publics pour vous fournir une réponse sourcée.';

/** Cible de la redirection `/chat`. ⚠️ Dupliqué en dur dans les `routeRules` de nuxt.config.ts. */
export const CHAT_DEFAULT_VARIANT = 'gemini';

// Le corpus indexé ne couvre pas tout le site : une question hors périmètre
// reçoit « je ne sais pas ». C'est le comportement attendu, pas une panne. Le
// périmètre vient de la réconciliation d'ingestion (fichiers < 5 Mo, législation
// depuis 2023) ; le décompte est arrondi car il bouge à chaque passage — relevé
// sur `GET /documents` de rag.vie-publique.sn. Partagé par les variantes qui
// interrogent ce RAG : c'est le même corpus.
const AVERTISSEMENT_CORPUS_RAG =
  'Corpus partiel : environ 5 400 des 12 600 documents publiés sont indexés (fichiers de moins de 5 Mo, textes législatifs depuis 2023).';

const QUESTIONS_RAG = [
  'Quels départements sont touchés par l’insécurité alimentaire sévère ?',
  'Quel déficit budgétaire le projet de loi de finances 2026 prévoit-il ?',
  'À quel taux la LFR 2025 révise-t-elle la croissance du PIB ?',
];

const chargerAdaptateurRag = () =>
  import('~/lib/chat/adapters/gemini').then((m) => m.createGeminiAdapter);

export const CHAT_VARIANTS: ChatVariant[] = [
  {
    id: 'gemini',
    label: 'API RAG Gemini',
    description:
      'Recherche dans les documents publics puis réponse générée avec citation des sources. API développée en interne.',
    status: 'active',
    icon: 'i-simple-icons-googlegemini',
    available: true,
    warning: AVERTISSEMENT_CORPUS_RAG,
    starterQuestions: QUESTIONS_RAG,
    loadAdapter: chargerAdaptateurRag,
  },
  {
    id: 'gemini-voix-kiriku',
    label: 'API RAG Gemini — voix Kiriku',
    description:
      'Le même RAG, avec la dictée et la lecture wolof servies par l’API Kiriku d’AI Hub Senegal (modèles M-Kiriku et Kiriku TTS) au lieu de nos propres moteurs.',
    status: 'active',
    icon: 'i-heroicons-speaker-wave',
    available: true,
    // Kiriku ne parle que wolof : en français, Web Speech garde la main et
    // cette variante se comporte exactement comme `gemini`. D'où le wolof par
    // défaut — le sélecteur de langue permet toujours de repasser en français.
    voiceLang: 'wo-SN',
    // Nom opaque déclaré côté API (`RAG_KIRIKU_API_PROFILE`) et autorisé dans
    // les `voice_profiles` du tenant. Sans cela, /speak et /transcribe : 422.
    voiceProfile: 'alt',
    warning: AVERTISSEMENT_CORPUS_RAG,
    starterQuestions: QUESTIONS_RAG,
    loadAdapter: chargerAdaptateurRag,
  },
  {
    id: 'azure',
    label: 'Azure AI Search',
    description:
      'Le chatbot en service depuis 2025, adossé au backend Azure. Conservé comme point de comparaison.',
    status: 'legacy',
    icon: 'i-simple-icons-microsoftazure',
    // Pas d'adaptateur tant que le backend n'est pas branché : faire tester un
    // faux chat produirait de faux retours, ce qui ruinerait la comparaison.
    available: false,
    loadAdapter: undefined,
  },
];

export const CHAT_STATUS_LABELS: Record<ChatVariantStatus, string> = {
  active: 'En test',
  legacy: 'Historique',
  retired: 'Abandonné',
};

export function findChatVariant(id: string | undefined): ChatVariant | undefined {
  return CHAT_VARIANTS.find((variant) => variant.id === id);
}
