/**
 * Traduction d'une erreur technique en message affichable par un citoyen.
 *
 * Règle projet (cf. CLAUDE.md) : AUCUN message d'erreur technique ne doit
 * atteindre l'écran — ni `Error: [GET] "/api/…": 500`, ni `fetch failed`,
 * ni un objet `Error` interpolé tel quel dans un template.
 *
 * Source de vérité partagée app + serveur ; ré-exportée côté app par
 * `app/composables/useErrorHandler.ts` (auto-import).
 */

/** Forme minimale et permissive d'une erreur (ofetch, h3, DOMException, string…). */
interface ErrorLike {
  message?: unknown;
  statusCode?: unknown;
  status?: unknown;
  statusMessage?: unknown;
  response?: { status?: unknown };
  data?: { statusCode?: unknown; statusMessage?: unknown; message?: unknown };
  cause?: { statusCode?: unknown };
}

const asErrorLike = (error: unknown): ErrorLike =>
  error && typeof error === 'object' ? (error as ErrorLike) : {};

/** Motifs qui trahissent une erreur technique (jamais montrés à l'utilisateur). */
const TECHNICAL_PATTERNS: RegExp[] = [
  /\[(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\]/i, // message ofetch : [GET] "/api/…": 500 …
  /https?:\/\//i, // URL brute
  /\/api\//i, // chemin d'API
  /fetch\s*failed/i,
  /\bE(CONN\w*|TIMEDOUT|NOTFOUND|AI_AGAIN|PIPE|HOSTUNREACH)\b/i,
  /\b(TypeError|ReferenceError|SyntaxError|AbortError|FetchError)\b/,
  /\b(?:undefined|null|NaN)\b/,
  /\bat\s+\S+\s*\(/, // fragment de stack trace
  /\b(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\bFROM\b/i,
  /<[a-z][\s\S]*>/i, // HTML (page d'erreur d'un proxy)
  /^\s*[{[]/, // JSON brut
  /\b\d{3}\s+(?:Internal|Bad|Service|Gateway|Forbidden|Unauthorized)\b/i,
  /certificate|SSL|TLS|CORS|socket|token|directus/i,
];

/**
 * Marqueurs de rédaction en français. Le site est francophone : un message
 * uniquement en anglais vient forcément d'une bibliothèque ou du navigateur
 * (« Registration failed », « Load failed »…) — donc technique.
 */
const FRENCH_HINT =
  /[éèêëàâäîïôöùûüçœ]|\b(?:le|la|les|un|une|des|du|de|au|aux|est|sont|vous|nous|votre|cette|ce|pas|plus|merci|veuillez|impossible|erreur|donnees?|reessayer)\b/i;

/** Le message est-il présentable en l'état à un utilisateur non technique ? */
export function isUserFriendlyMessage(message: unknown): message is string {
  if (typeof message !== 'string') return false;
  const text = message.trim();
  if (text.length < 8 || text.length > 200) return false;
  if (!FRENCH_HINT.test(text)) return false;
  return !TECHNICAL_PATTERNS.some((pattern) => pattern.test(text));
}

/** Extrait le code HTTP quelle que soit la forme de l'erreur (ofetch, h3, Response…). */
export function getErrorStatusCode(error: unknown): number | undefined {
  const candidate = asErrorLike(error);
  const status =
    candidate.statusCode ??
    candidate.status ??
    candidate.response?.status ??
    candidate.data?.statusCode ??
    candidate.cause?.statusCode;
  return typeof status === 'number' && status >= 100 ? status : undefined;
}

/** L'erreur vient-elle d'un problème de réseau côté visiteur ? */
export function isNetworkError(error: unknown): boolean {
  if (getErrorStatusCode(error) !== undefined) return false;
  const message = asErrorLike(error).message;
  const raw = typeof message === 'string' ? message : '';
  return /fetch\s*failed|network|Failed to fetch|load failed|ECONN|ETIMEDOUT|timeout/i.test(raw);
}

/**
 * Message user-friendly correspondant à une erreur.
 *
 * On raisonne d'abord sur le **code HTTP** ; le `message` brut n'est jamais
 * réutilisé, sauf s'il provient explicitement de l'API sur une erreur 4xx
 * (message rédigé pour l'utilisateur) ET qu'il passe `isUserFriendlyMessage`.
 */
export function getFriendlyErrorMessage(error: unknown, fallback?: string): string {
  const genericFallback =
    fallback ?? 'Ces informations sont momentanément indisponibles. Merci de réessayer.';

  if (!error) return genericFallback;

  if (isNetworkError(error)) {
    return 'Connexion interrompue. Vérifiez votre connexion internet puis réessayez.';
  }

  const status = getErrorStatusCode(error);

  // Sur une erreur serveur, le message de l'API décrit une panne interne :
  // on ne le montre jamais, même s'il est rédigé en français.
  if (typeof status === 'number' && status >= 500) {
    if (status === 503) {
      return 'Le service est momentanément indisponible pour maintenance. Réessayez dans quelques minutes.';
    }
    if (status === 504) {
      return 'Le chargement a pris trop de temps. Merci de réessayer dans un instant.';
    }
    return 'Nos serveurs rencontrent une difficulté. Notre équipe est prévenue : merci de réessayer dans quelques instants.';
  }

  // Erreur 4xx : le message de l'API est souvent volontairement rédigé pour
  // l'utilisateur (validation de formulaire, quota…) — on le garde s'il est propre.
  const data = asErrorLike(error).data;
  const apiMessage = data?.message ?? data?.statusMessage;
  if (isUserFriendlyMessage(apiMessage)) return apiMessage;

  if (status === 400 || status === 422) {
    return 'Les informations saisies semblent incorrectes. Vérifiez-les puis réessayez.';
  }
  if (status === 401) return 'Votre session a expiré. Reconnectez-vous pour continuer.';
  if (status === 403) return "Vous n'avez pas accès à ce contenu.";
  if (status === 404) return 'Ce contenu est introuvable. Il a peut-être été déplacé ou retiré.';
  if (status === 408)
    return 'Le chargement a pris trop de temps. Merci de réessayer dans un instant.';
  if (status === 429) {
    return 'Vous avez effectué trop de tentatives. Patientez quelques minutes puis réessayez.';
  }

  // Dernier recours : un message déjà rédigé pour l'utilisateur en amont
  const rawMessage = asErrorLike(error).message;
  if (isUserFriendlyMessage(rawMessage)) return rawMessage;

  return genericFallback;
}
