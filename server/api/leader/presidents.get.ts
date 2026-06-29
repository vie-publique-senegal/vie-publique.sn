import type { PresidentsResponse } from '~~/types/leader-history';

/**
 * API : liste de tous les mandats présidentiels du Sénégal depuis 1960.
 * Dérivée de la collection `governments` (regroupement par `president.id`).
 * Réponse identique pour tous (aucun param) → cache stable.
 */
export default defineCachedEventHandler(
  async (): Promise<PresidentsResponse> => {
    try {
      const govs = await fetchGovernmentsAsc();
      const terms = buildPresidentialTerms(govs);
      return { terms, total: terms.length };
    } catch (error: any) {
      if (error?.statusCode) throw error;
      console.error('Erreur API présidents:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération des présidents',
      });
    }
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 60 * 60 * 2 : 0,
    name: 'leader-presidents',
    getKey: () => 'leader-presidents',
  },
);
