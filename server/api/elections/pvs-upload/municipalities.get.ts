import { readItems } from '@directus/sdk';
import { normalizeGeoName } from '#shared/geo-name';

/**
 * Liste des communes filtrées par département
 * Route: GET /api/elections/pvs-upload/municipalities
 * Query params: ?department=DEPT_NAME (requis)
 *
 * Source : election_polling_stations (texte municipality) via le fichier
 * électoral national publié le plus récent. Fallback : election_map_national
 * tant que la prod n'est pas migrée.
 *
 * ⚠️ `department` est accepté dans les deux graphies (fichiers électoraux et référentiel) :
 * il est résolu en identifiant de circonscription. Les communes renvoyées restent les TEXTES
 * `municipality` des bureaux de vote — l'étape suivante de la cascade les réinjecte tels quels.
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const department = query.department as string;

    if (!department) {
      throw createError({
        statusCode: 400,
        message: "Le paramètre 'department' est requis",
      });
    }

    try {
      const fileId = await resolveElectoralFileId(null, 'national');

      let data: { municipality: string }[];

      if (fileId) {
        const match = await resolveConstituencyByName(department, {
          nationaleType: 'departement',
        });

        // Nom inconnu : cascade vide, comme le faisait l'ancienne égalité de nom
        if (!match) {
          return { data: [] as string[] };
        }

        data = (await directus.request(
          readItems('election_polling_stations', {
            fields: ['municipality'],
            filter: {
              electoral_file: { _eq: fileId },
              constituency: { _in: match.ids },
              municipality: { _nnull: true },
            },
            limit: -1,
          }),
        )) as { municipality: string }[];
      } else {
        // Fallback legacy : election_map_national
        warnElectoralLegacyFallback('/api/elections/pvs-upload/municipalities', department);
        data = (await directus.request(
          readItems('election_map_national', {
            fields: ['municipality'],
            filter: {
              department: { _eq: department },
              municipality: { _nnull: true },
            },
            limit: -1,
          }),
        )) as { municipality: string }[];
      }

      // Extraire les communes uniques et trier
      const municipalities = [...new Set(data.map((item) => item.municipality))]
        .filter(Boolean)
        .sort();

      return { data: municipalities };
    } catch (error: any) {
      console.error('[pvs-upload/municipalities] Erreur:', error);
      throw createError({
        statusCode: 500,
        message: 'Erreur lors de la récupération des communes',
      });
    }
  },
  {
    maxAge: 300, // Cache 5 minutes
    name: 'election-pvs-municipalities-v3',
    // Clé normalisée : les deux graphies d'un même département partagent une entrée de cache
    getKey: (event) => {
      const query = getQuery(event);
      return `municipalities-${query.department ? normalizeGeoName(String(query.department)) : 'all'}`;
    },
  },
);
