/**
 * Mémorise (côté client uniquement) les filtres actifs de l'annuaire des personnalités
 * pour que le bouton « Retour » d'une fiche ramène à la liste filtrée, SANS propager
 * les filtres dans l'URL des fiches (URL propres, une seule URL crawlable par fiche).
 */
const STORAGE_KEY = 'vp:personnalites:list-url';
const LIST_PREFIX = '/personnalites-senegal';

export const usePersonsListMemory = () => {
  /** Enregistre le chemin (hub ou sous-page catégorie) + la query string courante de la liste. */
  const save = (path: string, query: Record<string, unknown>) => {
    if (!import.meta.client) return;
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (typeof value === 'string' && value !== '') params.set(key, value);
      }
      const qs = params.toString();
      sessionStorage.setItem(STORAGE_KEY, qs ? `${path}?${qs}` : path);
    } catch {
      // sessionStorage indisponible (navigation privée stricte…) — on continue sans mémoire
    }
  };

  /** URL de liste mémorisée (`/personnalites-senegal/...?...`), ou chaîne vide. */
  const restore = (): string => {
    if (!import.meta.client) return '';
    try {
      const url = sessionStorage.getItem(STORAGE_KEY) || '';
      return url.startsWith(LIST_PREFIX) ? url : '';
    } catch {
      return '';
    }
  };

  return { save, restore };
};
