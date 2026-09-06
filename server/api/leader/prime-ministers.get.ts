import type { PrimeMinistersResponse } from '~~/types/leader-history';

/**
 * API : liste de tous les mandats de Premiers ministres du Sénégal depuis 1960.
 * Dérivée de `governments` (regroupement par `prime_minister.id`) + périodes
 * de présidence directe (gaps).
 */
export default defineCachedEventHandler(
  async (): Promise<PrimeMinistersResponse> => {
    try {
      const govs = await fetchGovernmentsAsc();
      const { terms, gaps } = buildPrimeMinisterialTerms(govs);
      return { terms, total: terms.length, gaps };
    } catch (error: any) {
      if (error?.statusCode) throw error;
      console.error('Erreur API premiers ministres:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération des Premiers ministres',
      });
    }
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 60 * 60 * 2 : 0,
    name: 'leader-prime-ministers',
    getKey: () => 'leader-prime-ministers',
  },
);
