/**
 * Formatage des erreurs pour l'affichage utilisateur.
 *
 * L'implémentation vit dans `shared/friendly-error.ts` (source de vérité
 * partagée avec le serveur) ; ce fichier ne fait que la ré-exporter pour
 * conserver l'auto-import côté app, et ajoute les helpers de toast.
 *
 * Règle projet : aucun message technique à l'écran. Ne JAMAIS interpoler
 * `error`, `error.message` ou `error.statusMessage` dans un template —
 * passer par `getFriendlyErrorMessage()` ou le composant `<AppErrorState>`.
 */
import {
  getErrorStatusCode,
  getFriendlyErrorMessage,
  isNetworkError,
  isUserFriendlyMessage,
} from '#shared/friendly-error';

export { getErrorStatusCode, getFriendlyErrorMessage, isNetworkError, isUserFriendlyMessage };

export const useErrorHandler = () => {
  /** Affiche une notification toast avec un message d'erreur compréhensible. */
  const showErrorToast = (error: unknown, fallback?: string) => {
    const toast = useToast();
    toast.add({
      title: 'Erreur',
      description: getFriendlyErrorMessage(error, fallback),
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
      timeout: 5000,
    });
  };

  /** Affiche une notification toast de succès. */
  const showSuccessToast = (message: string) => {
    const toast = useToast();
    toast.add({
      title: 'Succès',
      description: message,
      color: 'green',
      icon: 'i-heroicons-check-circle',
      timeout: 3000,
    });
  };

  return {
    getFriendlyErrorMessage,
    getErrorStatusCode,
    isNetworkError,
    showErrorToast,
    showSuccessToast,
  };
};
