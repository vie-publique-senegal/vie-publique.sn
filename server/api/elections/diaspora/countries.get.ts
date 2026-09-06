// server/api/elections/diaspora/countries.get.ts
import { readItems } from '@directus/sdk';

/**
 * Endpoint pour récupérer les statistiques des pays de la diaspora
 * Route: /api/elections/diaspora/countries
 *
 * Query params:
 * - election: ID de l'élection pour filtrer les données
 * - electoral_file: ID du fichier électoral diaspora (prioritaire sur election)
 * - zone: slug de la zone diaspora du référentiel (nouvelles collections seulement)
 *
 * Source : election_polling_stations via le fichier électoral diaspora de
 * l'élection (fichier publié le plus récent sans paramètre election).
 * Fallback : election_map_diaspora tant que la prod n'est pas migrée.
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const electionId = query.election as string | undefined;
    const electoralFileParam = query.electoral_file as string | undefined;
    const zone = query.zone as string | undefined;

    try {
      const fileId = electoralFileParam
        ? parseInt(electoralFileParam)
        : await resolveElectoralFileId(electionId ? parseInt(electionId) : null, 'diaspora');

      if (fileId) {
        const filter: Record<string, unknown> = { electoral_file: { _eq: fileId } };
        if (zone) {
          filter.constituency = { slug: { _eq: zone } };
        }

        const countriesData = await directus.request(
          readItems('election_polling_stations', {
            limit: 2000,
            groupBy: ['country'],
            aggregate: {
              count: ['polling_place', 'office_number'],
              sum: ['voters'],
              countDistinct: ['polling_place'],
            },
            filter,
          }),
        );

        return {
          countries: countriesData,
        };
      }

      // Fallback legacy : election_map_diaspora
      warnElectoralLegacyFallback(
        '/api/elections/diaspora/countries',
        electionId ? `election ${electionId}` : undefined,
      );

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
    name: 'election-diaspora-countries-v2',
    getKey: (event) => buildCacheKey('election-diaspora-countries', getQuery(event)),
  },
);
