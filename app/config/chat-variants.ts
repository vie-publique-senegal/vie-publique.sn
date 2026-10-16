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

/**
 * Nom public de l'assistant, commun à toutes les variantes. « Sira » jusqu'au
 * 2026-10-16 : un nom propre promet un produit, or l'assistant n'est pas encore
 * public. « Vie Publique » seul répétait le logo du site juste au-dessus ;
 * « IA » lève l'ambiguïté et dit franchement à qui l'on parle — attendu d'un
 * service public. Dans une phrase : « l'assistant IA de Vie Publique ».
 */
export const CHAT_ASSISTANT_NAME = 'Vie Publique IA';

/** Une phrase, pas un paragraphe : affichée sous le nom, sur la liste et à l'accueil du chat. */
export const CHAT_ASSISTANT_TAGLINE =
  'Posez vos questions sur les lois, les budgets et les rapports publics : l’assistant répond en citant ses sources.';

/** Cible de la redirection `/chat`. ⚠️ Dupliqué en dur dans les `routeRules` de nuxt.config.ts. */
export const CHAT_DEFAULT_VARIANT = 'gemini';

/**
 * Variantes proposées dans l'interface vocale en essai (`/chat/vocal/<id>`),
 * mises en avant sur `/chat/liste`. La page accepte toute variante
 * disponible ; cette liste ne choisit que les liens proposés. Les deux sont en
 * wolof par défaut (`voiceLang` de la variante) : on compare les voix.
 */
export const CHAT_VOCAL_VARIANTS = ['gemini-voix-kiriku', 'gemini-voix-gemini'];

/**
 * Le corpus interrogé par le RAG, décrit UNE fois : les variantes Gemini
 * partagent le même, seule la voix change. Affiché en bas de `/chat/liste`.
 *
 * Le corpus indexé ne couvre pas tout le site : une question hors périmètre
 * reçoit « je ne sais pas ». C'est le comportement attendu, pas une panne. Le
 * périmètre vient du workflow n8n « Ingestion continue » (fichiers ≤ 30 Mo
 * depuis le 2026-10-16, législation depuis 2023). Le décompte est arrondi
 * (« près de ») : il monte à chaque passage — 4 986 documents
 * distincts relevés dans le store le 2026-10-16 (`scripts/etat_store.py` de
 * rag-platform).
 */
export const CHAT_CORPUS_RAG = {
  title: 'Ce que l’assistant connaît',
  // Espace insécable dans « 5 000 » : sinon le nombre se coupe en fin de ligne.
  summary: 'Près de 5\u00a0000 documents publics sont indexés, en français.',
  included: [
    'Budgets et lois de finances',
    'Rapports de contrôle et de reddition des comptes',
    'Statistiques',
    'Textes législatifs publiés depuis 2023',
  ],
  excluded: ['Textes législatifs antérieurs à 2023', 'Fichiers de plus de 30 Mo'],
  outOfScope:
    'Hors de ce périmètre, l’assistant répond qu’il ne sait pas : il ne répond qu’à partir des documents indexés, et cite toujours ses sources.',
};

// Rappel court, affiché à l'accueil de chaque conversation : quelqu'un qui
// arrive directement sur /chat/<id> n'a pas vu /chat/liste.
const AVERTISSEMENT_CORPUS_RAG =
  'Corpus partiel : près de 5\u00a0000 documents publics indexés (fichiers jusqu’à 30 Mo, textes législatifs depuis 2023).';

const QUESTIONS_RAG = [
  'Quels départements sont touchés par l’insécurité alimentaire sévère ?',
  'Quel déficit budgétaire le projet de loi de finances 2026 prévoit-il ?',
  'À quel taux la LFR 2025 révise-t-elle la croissance du PIB ?',
];

// Espace insécable avant « ? » : sinon il passe seul à la ligne sur mobile.
// Testées sur le RAG le 2026-10-16 : réponses courtes (milliards, %), donc
// supportables à l'écoute, et sourcées. Une année explicite est nécessaire :
// « léegi » (maintenant) ramenait des documents de 2000-2017.
const QUESTIONS_RAG_WOLOF = [
  'Ñaata la budget bu Senegaal ci 2026\u00a0?',
  'Ñaata la déficit bi ci loi de finances 2026 di tollu\u00a0?',
  'Bor bu Senegaal ci 2025, ñaata la tollu ci PIB\u00a0?',
];

const chargerAdaptateurRag = () =>
  import('~/lib/chat/adapters/gemini').then((m) => m.createGeminiAdapter);

export const CHAT_VARIANTS: ChatVariant[] = [
  {
    id: 'gemini',
    label: 'Gemini — voix Kiriku (notre serveur)',
    description:
      'Lecture wolof par la voix Kiriku, hébergée sur notre propre serveur. Dictée par Gemini.',
    status: 'active',
    icon: 'i-simple-icons-googlegemini',
    available: true,
    engines: {
      answer: 'Gemini Flash',
      dictation: 'Gemini',
      voice: 'Kiriku — notre serveur',
    },
    warning: AVERTISSEMENT_CORPUS_RAG,
    starterQuestions: QUESTIONS_RAG,
    starterQuestionsWolof: QUESTIONS_RAG_WOLOF,
    loadAdapter: chargerAdaptateurRag,
  },
  {
    id: 'gemini-voix-kiriku',
    label: 'Gemini — voix Kiriku (AI Hub)',
    description:
      'Dictée et lecture wolof servies par l’API Kiriku d’AI Hub Senegal (modèles M-Kiriku et Kiriku TTS).',
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
    engines: {
      answer: 'Gemini Flash',
      dictation: 'M-Kiriku — AI Hub',
      voice: 'Kiriku — AI Hub',
    },
    warning: AVERTISSEMENT_CORPUS_RAG,
    starterQuestions: QUESTIONS_RAG,
    starterQuestionsWolof: QUESTIONS_RAG_WOLOF,
    loadAdapter: chargerAdaptateurRag,
  },
  {
    id: 'gemini-voix-gemini',
    label: 'Gemini — voix Gemini',
    description:
      'Lecture wolof par le TTS de Gemini : il lit les montants, pourcentages et sigles tels quels, sans conversion préalable.',
    status: 'active',
    icon: 'i-heroicons-sparkles',
    available: true,
    // Même raison que `gemini-voix-kiriku` : en français Web Speech garde la
    // main, la variante n'a d'intérêt qu'en wolof.
    voiceLang: 'wo-SN',
    // Profil `alt2` de l'API (RAG_GEMINI_TTS_PROFILE) : synthèse Gemini, dictée
    // Gemini par défaut. Doit figurer dans les `voice_profiles` du tenant.
    voiceProfile: 'alt2',
    engines: {
      answer: 'Gemini Flash',
      dictation: 'Gemini',
      voice: 'Gemini TTS',
    },
    warning: AVERTISSEMENT_CORPUS_RAG,
    starterQuestions: QUESTIONS_RAG,
    starterQuestionsWolof: QUESTIONS_RAG_WOLOF,
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
