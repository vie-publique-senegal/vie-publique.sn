// server/api/elections/map/summary.get.ts
import { aggregate } from '@directus/sdk';

/**
 * Endpoint pour récupérer le résumé des statistiques électorales
 * Route: /api/elections/map/summary
 *
 * Query params:
 * - election: ID de l'élection pour filtrer les données
 *
 * Retourne:
 * - Statistiques totales (national + diaspora)
 * - Statistiques nationales uniquement
 * - Statistiques diaspora uniquement
 *
 * Source : election_polling_stations via les fichiers électoraux national et
 * diaspora. Fallback : election_map_national/diaspora tant que la prod n'est
 * pas migrée.
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const electionId = query.election as string | undefined;

    try {
      const parsedElectionId = electionId ? parseInt(electionId) : null;
      const [nationalFileId, diasporaFileId] = await Promise.all([
        resolveElectoralFileId(parsedElectionId, 'national'),
        resolveElectoralFileId(parsedElectionId, 'diaspora'),
      ]);

      interface AggregateTotals {
        sum?: Record<string, string>;
        count?: Record<string, string>;
        countDistinct?: Record<string, string>;
      }

      let national: AggregateTotals = {};
      let diaspora: AggregateTotals = {};
      let nationalDepartments = 0;

      if (nationalFileId && diasporaFileId) {
        const [nationalStats, diasporaStats] = await Promise.all([
          directus.request(
            aggregate('election_polling_stations', {
              aggregate: {
                sum: ['voters'],
                count: ['office_number'],
                countDistinct: ['polling_place', 'constituency', 'municipality'],
              },
              query: {
                filter: { electoral_file: { _eq: nationalFileId } },
              },
            }),
          ),
          directus.request(
            aggregate('election_polling_stations', {
              aggregate: {
                sum: ['voters'],
                count: ['office_number'],
                countDistinct: ['polling_place', 'country', 'locality', 'diplomatic_representation'],
              },
              query: {
                filter: { electoral_file: { _eq: diasporaFileId } },
              },
            }),
          ),
        ]);

        national = nationalStats[0] || {};
        diaspora = diasporaStats[0] || {};
        nationalDepartments = parseInt(national.countDistinct?.constituency || '0');
      } else {
        // Fallback legacy : election_map_national + election_map_diaspora
        warnElectoralLegacyFallback('/api/elections/map/summary', electionId ? `election ${electionId}` : undefined);

        const filter: any = {};
        if (electionId) {
          filter.election = { _eq: parseInt(electionId) };
        }

        const [nationalStats, diasporaStats] = await Promise.all([
          directus.request(
            aggregate('election_map_national', {
              aggregate: {
                sum: ['voters'],
                count: ['office_number'],
                countDistinct: ['polling_place', 'department', 'municipality'],
              },
              // ⚠️ Ne jamais passer `filter: undefined` : le SDK le sérialise en
              // `filter=undefined` littéral → Directus 400 « Invalid JSON for filter »
              query: Object.keys(filter).length > 0 ? { filter } : {},
            }),
          ),
          directus.request(
            aggregate('election_map_diaspora', {
              aggregate: {
                sum: ['voters'],
                count: ['office_number'],
                countDistinct: ['polling_place', 'country', 'locality', 'diplomatic_representation'],
              },
              query: Object.keys(filter).length > 0 ? { filter } : {},
            }),
          ),
        ]);

        national = nationalStats[0] || {};
        diaspora = diasporaStats[0] || {};
        nationalDepartments = parseInt(national.countDistinct?.department || '0');
      }

      // Calculer les totaux
      const nationalVoters = parseInt(national.sum?.voters || '0');
      const diasporaVoters = parseInt(diaspora.sum?.voters || '0');
      const totalVoters = nationalVoters + diasporaVoters;

      const nationalOffices = parseInt(national.count?.office_number || '0');
      const diasporaOffices = parseInt(diaspora.count?.office_number || '0');
      const totalOffices = nationalOffices + diasporaOffices;

      const nationalPlaces = parseInt(national.countDistinct?.polling_place || '0');
      const diasporaPlaces = parseInt(diaspora.countDistinct?.polling_place || '0');
      const totalPlaces = nationalPlaces + diasporaPlaces;

      const diasporaCountries = parseInt(diaspora.countDistinct?.country || '0');
      const totalDepartments = nationalDepartments + diasporaCountries;

      return {
        total: {
          voters: totalVoters,
          offices: totalOffices,
          places: totalPlaces,
          departments: totalDepartments,
        },
        national: {
          voters: nationalVoters,
          offices: nationalOffices,
          places: nationalPlaces,
          departments: nationalDepartments,
          municipalities: parseInt(national.countDistinct?.municipality || '0'),
        },
        diaspora: {
          voters: diasporaVoters,
          offices: diasporaOffices,
          places: diasporaPlaces,
          countries: diasporaCountries,
          localities: parseInt(diaspora.countDistinct?.locality || '0'),
          diplomaticRepresentations: parseInt(
            diaspora.countDistinct?.diplomatic_representation || '0',
          ),
        },
      };
    } catch (error) {
      reportServerError(error, 'api/elections/map/summary', { electionId });
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération du résumé de la carte électorale',
      });
    }
  },
  {
    maxAge: 60 * 60, // Cache de 1 heure
    name: 'election-carte-summary-v2',
    getKey: (event) => buildCacheKey("election-carte-summary", getQuery(event)),
  },
);
