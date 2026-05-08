/**
 * Composable pour formater les messages d'erreur de manière user-friendly
 */

export const useErrorHandler = () => {
  /**
   * Convertit une erreur technique en message compréhensible
   */
  const getFriendlyErrorMessage = (error: any): string => {
    // Erreur réseau (pas de réponse du serveur)
    if (!error?.data && (error?.message?.includes('fetch') || error?.message?.includes('network'))) {
      return "Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez.";
    }

    // Erreur serveur (500)
    if (error?.statusCode === 500 || error?.status === 500) {
      return "Une erreur est survenue sur le serveur. Nos équipes en ont été informées. Veuillez réessayer dans quelques instants.";
    }

    // Erreur d'authentification (401)
    if (error?.statusCode === 401 || error?.status === 401) {
      return "Votre session a expiré. Veuillez vous reconnecter pour continuer.";
    }

    // Erreur d'accès interdit (403)
    if (error?.statusCode === 403 || error?.status === 403) {
      return "Vous n'avez pas l'autorisation d'effectuer cette action. Contactez un administrateur si nécessaire.";
    }

    // Erreur de validation (400)
    if (error?.statusCode === 400 || error?.status === 400) {
      return error?.data?.message || "Les informations saisies sont incorrectes. Veuillez vérifier et réessayer.";
    }

    // Erreur de rate limiting (429)
    if (error?.statusCode === 429 || error?.status === 429) {
      return error?.data?.message || "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.";
    }

    // Erreur Not Found (404)
    if (error?.statusCode === 404 || error?.status === 404) {
      return "La ressource demandée est introuvable. Elle a peut-être été supprimée.";
    }

    // Message spécifique de l'API (si disponible)
    if (error?.data?.message) {
      return error.data.message;
    }

    // Message d'erreur générique de l'objet error
    if (error?.message && !error.message.includes('fetch')) {
      return error.message;
    }

    // Par défaut
    return "Une erreur inattendue est survenue. Veuillez réessayer ou contacter le support si le problème persiste.";
  };

  /**
   * Affiche une notification toast avec le message d'erreur
   */
  const showErrorToast = (error: any) => {
    const toast = useToast();
    toast.add({
      title: "Erreur",
      description: getFriendlyErrorMessage(error),
      color: "red",
      icon: "i-heroicons-exclamation-circle",
      timeout: 5000,
    });
  };

  /**
   * Affiche une notification toast de succès
   */
  const showSuccessToast = (message: string) => {
    const toast = useToast();
    toast.add({
      title: "Succès",
      description: message,
      color: "green",
      icon: "i-heroicons-check-circle",
      timeout: 3000,
    });
  };

  return {
    getFriendlyErrorMessage,
    showErrorToast,
    showSuccessToast,
  };
};
