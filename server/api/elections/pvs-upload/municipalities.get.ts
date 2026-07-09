import { readItems } from "@directus/sdk";

/**
 * Liste des communes filtrées par département
 * Route: GET /api/elections/pvs-upload/municipalities
 * Query params: ?department=DEPT_NAME (requis)
 *
 * Source : election_polling_stations (texte municipality) via le fichier
 * électoral national publié le plus récent. Fallback : election_map_national
 * tant que la prod n'est pas migrée.
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
      const fileId = await resolveElectoralFileId(null, "national");

      let data: { municipality: string }[];

      if (fileId) {
        data = (await directus.request(
          readItems("election_polling_stations", {
            fields: ["municipality"],
            filter: {
              electoral_file: { _eq: fileId },
              constituency: { name: { _eq: department } },
              municipality: { _nnull: true },
            },
            limit: -1,
          })
        )) as { municipality: string }[];
      } else {
        // Fallback legacy : election_map_national
        warnElectoralLegacyFallback("/api/elections/pvs-upload/municipalities", department);
        data = (await directus.request(
          readItems("election_map_national", {
            fields: ["municipality"],
            filter: {
              department: { _eq: department },
              municipality: { _nnull: true },
            },
            limit: -1,
          })
        )) as { municipality: string }[];
      }

      // Extraire les communes uniques et trier
      const municipalities = [...new Set(data.map((item) => item.municipality))]
        .filter(Boolean)
        .sort();

      return { data: municipalities };
    } catch (error: any) {
      console.error("[pvs-upload/municipalities] Erreur:", error);
      throw createError({
        statusCode: 500,
        message: "Erreur lors de la récupération des communes",
      });
    }
  },
  {
    maxAge: 300, // Cache 5 minutes
    name: "election-pvs-municipalities-v2",
    getKey: (event) => {
      const query = getQuery(event);
      return `municipalities-${query.department || "all"}`;
    },
  }
);
