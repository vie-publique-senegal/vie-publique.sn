// server/api/elections/diaspora/countries.get.ts
import { readItems } from '@directus/sdk';

/**
 * Endpoint pour récupérer les statistiques des pays de la diaspora
 * Route: /api/elections/diaspora/countries
 *
 * Query params:
 * - election: ID de l'élection pour filtrer les données
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const electionId = query.election as string | undefined;

    try {
      // Construire le filtre avec l'élection si fournie
      const filter: any = {};
      if (electionId) {
        filter.election = { _eq: parseInt(electionId) };
      }

      // Récupération des données agrégées par pays
      // ⚠️ Ne jamais passer `filter: undefined` : le SDK le sérialise en
      // `filter=undefined` littéral → Directus 400 « Invalid JSON for filter »
      const countriesData = await directus.request(
        readItems('election_map_diaspora', {
          limit: 2000,
          groupBy: ['country'],
          aggregate: {
            count: ['polling_place', 'office_number'],
            sum: ['voters'],
            countDistinct: ['polling_place'],
          },
          ...(Object.keys(filter).length > 0 ? { filter } : {}),
        }),
      );

      return {
        countries: countriesData,
      };
    } catch (error) {
      reportServerError(error, 'api/elections/diaspora/countries', { electionId });
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération des pays de la diaspora',
      });
    }
  },
  {
    maxAge: 60 * 60, // Cache de 1 heure
    name: 'election-diaspora-countries',
  },
);
