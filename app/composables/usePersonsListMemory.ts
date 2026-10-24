/**
 * Mémorise (côté client uniquement) les filtres actifs de l'annuaire des personnalités
 * pour que le bouton « Retour » d'une fiche ramène à la liste filtrée, SANS propager
 * les filtres dans l'URL des fiches (URL propres, une seule URL crawlable par fiche).
 */
const STORAGE_KEY = 'vp:personnalites:list-query';

export const usePersonsListMemory = () => {
  /** Enregistre la query string courante de la liste (vide → efface). */
  const save = (query: Record<string, unknown>) => {
    if (!import.meta.client) return;
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (typeof value === 'string' && value !== '') params.set(key, value);
      }
      const qs = params.toString();
      if (qs) sessionStorage.setItem(STORAGE_KEY, qs);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // sessionStorage indisponible (navigation privée stricte…) — on continue sans mémoire
    }
  };

  /** Query string mémorisée (sans `?`), ou chaîne vide. */
  const restore = (): string => {
    if (!import.meta.client) return '';
    try {
      return sessionStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  };

  return { save, restore };
};
