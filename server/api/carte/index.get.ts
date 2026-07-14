import { readItems, aggregate } from '@directus/sdk'

interface StationAggregateRow {
  electoral_file: number | string;
  constituency: number | string;
  count?: { id?: string };
  countDistinct?: { polling_place?: string };
}

interface ResultRow {
  id: number;
  voters: number | null;
  seat: number | null;
  participation_10h: number | null;
  participation_12h: number | null;
  participation_14h: number | null;
  participation_17h: number | null;
  election: { id: number; type: string; year: number } | null;
  constituency: {
    id: number;
    name: string;
    slug: string | null;
    type: string;
    nationale_type: string | null;
    region: string | null;
    population: number | null;
    parent: { name: string; region: string | null } | null;
  } & Record<string, unknown> | null;
}

/**
 * Données carte par circonscription (électeurs, bureaux, participation).
 * Source : election_constituency_results + agrégats election_polling_stations.
 * L'identité géographique (departement/region/municipality/population) est résolue
 * via le référentiel geo_* (resolveGeoUnit, fallback champs legacy pour les lignes
 * diaspora/Territoire National). Fallback : collection legacy `carte` tant que les
 * résultats ne sont pas backfillés (prod non migrée). Les contours ne sont plus
 * servis : le front les charge depuis public/geo/ et les joint par constituencie.slug.
 */
export default defineCachedEventHandler(
  async (event) => {
    try {
      const query = getQuery(event);
      const electionId = query.election as string | undefined;

      const cmsClient = getCmsClient();

      const results = (await cmsClient
        .request(
          readItems('election_constituency_results', {
            fields: [
              'id',
              'voters',
              'seat',
              'participation_10h',
              'participation_12h',
              'participation_14h',
              'participation_17h',
              'election.id',
              'election.type',
              'election.year',
              'constituency.id',
              'constituency.name',
              'constituency.slug',
              'constituency.type',
              'constituency.nationale_type',
              'constituency.region',
              'constituency.population',
              'constituency.parent.name',
              'constituency.parent.region',
              ...GEO_UNIT_FIELDS.map((f) => `constituency.${f}`),
            ],
            ...(electionId ? { filter: { election: { _eq: parseInt(electionId) } } } : {}),
            limit: -1,
            sort: ['id'],
          })
        )
        .catch(() => null)) as ResultRow[] | null;

      if (!results || results.length === 0) {
        // Fallback legacy : lecture de `carte` (comportement d'avant la bascule)
        warnElectoralLegacyFallback('/api/carte', electionId ? `election ${electionId}` : 'all');
        const fields = ['*', 'election.id', 'election.type', 'election.year'];
        return await cmsClient.request(
          readItems('carte', {
            fields,
            ...(electionId ? { filter: { election: { _eq: parseInt(electionId) } } } : {}),
            limit: -1,
          })
        );
      }

      // Agrégats bureaux/lieux par circonscription, via les fichiers électoraux
      // nationaux des élections présentes dans les résultats
      const electionIds = [...new Set(results.map((r) => r.election?.id).filter(Boolean))] as number[];
      const fileIdByElection = new Map<number, number | null>();
      await Promise.all(
        electionIds.map(async (id) => {
          fileIdByElection.set(id, await resolveElectoralFileId(id, 'national'));
        })
      );
      const fileIds = [...new Set([...fileIdByElection.values()].filter(Boolean))] as number[];

      const stationAggregates = new Map<string, { offices: number; places: number }>();
      if (fileIds.length > 0) {
        const aggregates = (await cmsClient
          .request(
            aggregate('election_polling_stations', {
              aggregate: {
                count: ['id'],
                countDistinct: ['polling_place'],
              },
              groupBy: ['electoral_file', 'constituency'],
              query: {
                filter: { electoral_file: { _in: fileIds } },
                limit: -1,
              },
            })
          )
          .catch(() => [])) as StationAggregateRow[];

        for (const row of aggregates) {
          stationAggregates.set(`${row.electoral_file}:${row.constituency}`, {
            offices: parseInt(row.count?.id || '0'),
            places: parseInt(row.countDistinct?.polling_place || '0'),
          });
        }
      }

      // Contrat de réponse conservé (clés de `carte`), sans Position ;
      // constituencie.slug ajouté pour la jointure des contours statiques ;
      // identité géographique résolue via le référentiel geo_* (fallback legacy)
      return results.map((row) => {
        const constituency = row.constituency;
        const geo = resolveGeoUnit(constituency);
        const isCommune = constituency?.nationale_type === 'commune';
        const fileId = row.election ? fileIdByElection.get(row.election.id) : null;
        const stats = fileId && constituency ? stationAggregates.get(`${fileId}:${constituency.id}`) : undefined;

        return {
          id: row.id,
          election: row.election,
          constituencie: constituency
            ? {
                id: constituency.id,
                name: geo?.name || constituency.name,
                slug: geo?.slug ?? constituency.slug,
                type: constituency.type,
                nationale_type: constituency.nationale_type,
                region: geo?.region?.name ?? constituency.region,
              }
            : null,
          departement: isCommune ? geo?.parent?.name || null : geo?.name || constituency?.name || null,
          region: geo?.region?.name || null,
          municipality: isCommune ? geo?.name || constituency?.name || null : null,
          voters: row.voters,
          seat: row.seat,
          offices: stats?.offices ?? null,
          places: stats?.places ?? null,
          population: geo?.population ?? null,
          participation_10h: row.participation_10h,
          participation_12h: row.participation_12h,
          participation_14h: row.participation_14h,
          participation_17h: row.participation_17h,
        };
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des données de carte:', error);

      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération des données de carte'
      });
    }
  },
  {
    maxAge: 60 * 60, // 1 heure
    name: 'carte-v3',
    getKey: (event) => {
      const query = getQuery(event);
      return `carte-${query.election || 'all'}`;
    },
  },
);
