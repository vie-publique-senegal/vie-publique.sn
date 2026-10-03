// server/api/elections/map/national.get.ts
import { readItems, aggregate } from '@directus/sdk';
import { normalizeGeoName } from '#shared/geo-name';

interface StationRow {
  id: number;
  municipality: string | null;
  polling_place: string;
  office_number: string;
  voters: number | null;
  constituency?: ({ name?: string } & Record<string, unknown>) | null;
}

interface StationStatsRow {
  constituency: number | string;
  count?: Record<string, string>;
  sum?: Record<string, string>;
  countDistinct?: Record<string, string>;
}

/**
 * Endpoint pour récupérer les données de la carte électorale nationale
 * Route: /api/elections/map/national
 *
 * Query params:
 * - department: Filtrer par département spécifique
 * - groupBy: "department" (stats par département) ou "municipality" (stats par
 *   commune d'un département — nécessite department, nouvelles collections seulement)
 * - election: ID de l'élection pour filtrer les données
 * - electoral_file: ID du fichier électoral national (prioritaire sur election)
 *
 * Source : election_polling_stations via le fichier électoral national de
 * l'élection (fichier publié le plus récent sans paramètre election).
 * Fallback : election_map_national tant que la prod n'est pas migrée.
 *
 * ⚠️ `department` est accepté dans les deux graphies (fichiers électoraux et référentiel) :
 * il est résolu en identifiant de circonscription, jamais comparé en égalité de nom.
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);

    const department = query.department as string | undefined;
    const groupByDepartment = query.groupBy === 'department';
    const groupByMunicipality = query.groupBy === 'municipality';
    const electionId = query.election as string | undefined;
    const electoralFileParam = query.electoral_file as string | undefined;

    try {
      const fileId = electoralFileParam
        ? parseInt(electoralFileParam)
        : await resolveElectoralFileId(electionId ? parseInt(electionId) : null, 'national');

      if (fileId) {
        const match = department
          ? await resolveConstituencyByName(department, { nationaleType: 'departement' })
          : null;

        // Nom inconnu : réponse vide, comme le faisait l'ancienne égalité de nom
        if (department && !match) {
          return { data: [] };
        }

        const baseFilter: Record<string, unknown> = { electoral_file: { _eq: fileId } };
        if (match) {
          baseFilter.constituency = { _in: match.ids };
        }

        // Stats par commune d'un département (additif — panneau département)
        if (groupByMunicipality && department) {
          const municipalityStats = (await directus.request(
            aggregate('election_polling_stations', {
              aggregate: {
                count: ['office_number'],
                sum: ['voters'],
                countDistinct: ['polling_place'],
              },
              groupBy: ['municipality'],
              query: {
                filter: baseFilter,
                limit: 2000,
              },
            }),
          )) as {
            municipality: string | null;
            count?: Record<string, string>;
            sum?: Record<string, string>;
            countDistinct?: Record<string, string>;
          }[];

          return {
            data: municipalityStats.map((row) => ({
              municipality: row.municipality,
              voters: parseInt(row.sum?.voters || '0'),
              offices: parseInt(row.count?.office_number || '0'),
              places: parseInt(row.countDistinct?.polling_place || '0'),
            })),
          };
        }

        // Détails d'un département (liste des bureaux)
        if (department && !groupByDepartment) {
          const [pollingStations, geoSnapshot] = await Promise.all([
            directus.request(
              readItems('election_polling_stations', {
                fields: [
                  'id',
                  'municipality',
                  'polling_place',
                  'office_number',
                  'voters',
                  'constituency.name',
                  ...GEO_UNIT_FIELDS.map((f) => `constituency.${f}`),
                ],
                filter: baseFilter,
                limit: 2000,
                sort: ['municipality', 'polling_place', 'office_number'],
              }),
            ) as Promise<StationRow[]>,
            getGeoSnapshot(),
          ]);

          return {
            data: pollingStations.map((station) => ({
              id: station.id,
              department: station.constituency?.name || null,
              municipality: station.municipality,
              polling_place: station.polling_place,
              office_number: station.office_number,
              voters: station.voters,
              region: resolveGeoUnit(station.constituency, geoSnapshot)?.region?.name || null,
            })),
          };
        }

        // Statistiques groupées par département (avec ou sans filtre)
        const statsData = (await directus.request(
          aggregate('election_polling_stations', {
            aggregate: {
              count: ['polling_place', 'office_number'],
              sum: ['voters'],
              countDistinct: ['municipality', 'polling_place'],
            },
            groupBy: ['constituency'],
            query: {
              filter: baseFilter,
              limit: 2000,
            },
          }),
        )) as StationStatsRow[];

        const namesById = await getConstituencyNamesById(statsData.map((row) => row.constituency));

        return {
          data: statsData.map((row) => ({
            department: namesById.get(Number(row.constituency))?.name || null,
            // Clé d'URL historique, à utiliser pour construire les liens et la canonical
            electoral_name: namesById.get(Number(row.constituency))?.electoral_name || null,
            slug: namesById.get(Number(row.constituency))?.slug || null,
            geo_slug: namesById.get(Number(row.constituency))?.geo_slug ?? null,
            population: namesById.get(Number(row.constituency))?.population ?? null,
            region: namesById.get(Number(row.constituency))?.region ?? null,
            count: row.count,
            sum: row.sum,
            countDistinct: row.countDistinct,
          })),
        };
      }

      // Fallback legacy : election_map_national
      warnElectoralLegacyFallback(
        '/api/elections/map/national',
        electionId ? `election ${electionId}` : undefined,
      );

      const buildFilter = (additionalFilters: Record<string, any> = {}) => {
        const filter: any = { ...additionalFilters };
        if (electionId) {
          filter.election = { _eq: parseInt(electionId) };
        }
        return filter;
      };

      if (groupByDepartment) {
        const filter = buildFilter(department ? { department: { _eq: department } } : {});

        const statsData = await directus.request(
          aggregate('election_map_national', {
            aggregate: {
              count: ['polling_place', 'office_number'],
              sum: ['voters'],
              countDistinct: ['municipality', 'polling_place'],
            },
            groupBy: ['department'],
            query: {
              filter,
              limit: 2000,
            },
          }),
        );

        return {
          data: statsData,
        };
      }

      if (department) {
        const filter = buildFilter({ department: { _eq: department } });

        const pollingStations = await directus.request(
          readItems('election_map_national', {
            fields: [
              'id',
              'department',
              'municipality',
              'polling_place',
              'office_number',
              'voters',
              'region',
            ],
            filter,
            limit: 2000,
            sort: ['municipality', 'polling_place', 'office_number'],
          }),
        );

        return {
          data: pollingStations,
        };
      }

      const filter = buildFilter();

      const allStats = await directus.request(
        aggregate('election_map_national', {
          aggregate: {
            count: ['polling_place', 'office_number'],
            sum: ['voters'],
            countDistinct: ['municipality', 'polling_place'],
          },
          groupBy: ['department'],
          // ⚠️ Ne jamais passer `filter: undefined` : le SDK le sérialise en
          // `filter=undefined` littéral → Directus 400 « Invalid JSON for filter »
          query: {
            ...(Object.keys(filter).length > 0 ? { filter } : {}),
            limit: 2000,
          },
        }),
      );

      return {
        data: allStats,
      };
    } catch (error) {
      reportServerError(error, 'api/elections/map/national', {
        department,
        electionId,
        groupByDepartment,
      });
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération des données de la carte nationale',
      });
    }
  },
  {
    maxAge: 60 * 60, // Cache de 1 heure
    name: 'election-map-national-v4',
    // `department` est normalisé dans la clé : les deux graphies partagent une entrée de cache
    getKey: (event) => {
      const query = { ...getQuery(event) };
      if (query.department) query.department = normalizeGeoName(String(query.department));
      return buildCacheKey('election-map-national', query);
    },
  },
);
