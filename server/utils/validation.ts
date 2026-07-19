/**
 * Utilitaires de validation et de sécurité pour les API
 * Utilisés pour la validation backend des formulaires
 */

/**
 * Expressions régulières de validation
 */
export const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone:
    /^(\+221|00221)?[\s.-]?(7[0-8]|76|77|78|33)[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}$|^(\+|00)?[1-9]\d{6,14}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  twitterHandle: /^@?[a-zA-Z0-9_]{1,15}$/,
  linkedinUrl: /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9_-]+\/?$/,
  facebookUrl: /^(https?:\/\/)?(www\.)?facebook\.com\/[a-zA-Z0-9._-]+\/?$/,
  instagramHandle: /^@?[a-zA-Z0-9._]{1,30}$/,
  // Pattern pour détecter les tentatives d'injection
  dangerousPatterns: /<script|javascript:|data:|on\w+\s*=/i,
} as const;

/**
 * Limites de longueur des champs
 */
export const FIELD_LIMITS = {
  fullName: { min: 2, max: 100 },
  email: { min: 5, max: 255 },
  phone: { min: 8, max: 20 },
  organization: { min: 0, max: 200 },
  position: { min: 0, max: 150 },
  topicInterest: { min: 20, max: 2000 },
  expertiseArea: { min: 0, max: 1000 },
  motivation: { min: 30, max: 3000 },
  availability: { min: 0, max: 500 },
  socialHandle: { min: 0, max: 200 },
  website: { min: 0, max: 500 },
} as const;

/**
 * Messages d'erreur de validation
 */
export const VALIDATION_MESSAGES = {
  required: (field: string) => `${field} est requis`,
  minLength: (field: string, min: number) => `${field} doit contenir au moins ${min} caractères`,
  maxLength: (field: string, max: number) => `${field} ne doit pas dépasser ${max} caractères`,
  invalidEmail: 'Adresse email invalide',
  invalidPhone: 'Numéro de téléphone invalide',
  invalidUrl: 'URL invalide',
  invalidTwitter: 'Identifiant Twitter/X invalide',
  invalidLinkedin: 'URL LinkedIn invalide',
  invalidFacebook: 'URL Facebook invalide',
  invalidInstagram: 'Identifiant Instagram invalide',
  dangerousContent: 'Le contenu contient des caractères non autorisés',
  rateLimitExceeded: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.',
} as const;

/**
 * Nettoie et échappe une chaîne pour éviter les injections
 */
export const sanitizeString = (input: string | undefined | null): string => {
  if (!input) return '';

  return (
    input
      .trim()
      // Supprime les balises HTML
      .replace(/<[^>]*>/g, '')
      // Échappe les caractères spéciaux HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      // Supprime les caractères de contrôle (sauf newline et tab)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  );
};

/**
 * Nettoie une chaîne pour stockage (version plus légère)
 */
export const sanitizeForStorage = (input: string | undefined | null): string => {
  if (!input) return '';

  return (
    input
      .trim()
      // Supprime les balises script et événements inline
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      // Supprime les caractères de contrôle (sauf newline et tab)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  );
};

/**
 * Vérifie si le contenu contient des patterns dangereux
 */
export const containsDangerousPatterns = (input: string): boolean => {
  return VALIDATION_PATTERNS.dangerousPatterns.test(input);
};

/**
 * Valide un email
 */
export const isValidEmail = (email: string): boolean => {
  return VALIDATION_PATTERNS.email.test(email);
};

/**
 * Valide un numéro de téléphone (format Sénégal ou international)
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone) return true; // Optionnel
  const cleaned = phone.replace(/[\s.-]/g, '');
  return VALIDATION_PATTERNS.phone.test(cleaned);
};

/**
 * Valide une URL
 */
export const isValidUrl = (url: string): boolean => {
  if (!url) return true; // Optionnel
  return VALIDATION_PATTERNS.url.test(url);
};

/**
 * Valide un handle Twitter/X
 */
export const isValidTwitterHandle = (handle: string): boolean => {
  if (!handle) return true; // Optionnel
  return VALIDATION_PATTERNS.twitterHandle.test(handle);
};

/**
 * Valide une URL LinkedIn
 */
export const isValidLinkedinUrl = (url: string): boolean => {
  if (!url) return true; // Optionnel
  // Accepte aussi les URL partielles ou les usernames
  return VALIDATION_PATTERNS.linkedinUrl.test(url) || /^[a-zA-Z0-9_-]+$/.test(url);
};

/**
 * Valide une URL Facebook
 */
export const isValidFacebookUrl = (url: string): boolean => {
  if (!url) return true; // Optionnel
  return VALIDATION_PATTERNS.facebookUrl.test(url) || /^[a-zA-Z0-9._-]+$/.test(url);
};

/**
 * Valide un handle Instagram
 */
export const isValidInstagramHandle = (handle: string): boolean => {
  if (!handle) return true; // Optionnel
  return VALIDATION_PATTERNS.instagramHandle.test(handle);
};

/**
 * Valide la longueur d'un champ
 */
export const isValidLength = (value: string, min: number, max: number): boolean => {
  const length = value?.length || 0;
  return length >= min && length <= max;
};

/**
 * Interface pour les résultats de validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// NB (2026-07-19) : le formulaire « invitation podcast » (seul consommateur historique de ce
// fichier) a été supprimé — voir QUAL-2 dans docs/audits/audit-complet-2026-07.md. Les
// validateurs génériques ci-dessus sont conservés pour le fix SEC-4 (Turnstile + validation
// des formulaires publics) qui prévoit de les réutiliser.
