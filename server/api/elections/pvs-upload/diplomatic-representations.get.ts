import { readItems } from "@directus/sdk";

/**
 * Liste des représentations diplomatiques filtrées par pays
 * Route: GET /api/elections/pvs-upload/diplomatic-representations
 * Query params: ?country=COUNTRY_NAME (requis)
 *
 * Source : election_polling_stations via le fichier électoral diaspora publié
 * le plus récent. Fallback : election_map_diaspora tant que la prod n'est pas
 * migrée.
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const country = query.country as string;

    if (!country) {
      throw createError({
        statusCode: 400,
        message: "Le paramètre 'country' est requis",
      });
    }

    try {
      const fileId = await resolveElectoralFileId(null, "diaspora");

      let data: { diplomatic_representation: string }[];

      if (fileId) {
        data = (await directus.request(
          readItems("election_polling_stations", {
            fields: ["diplomatic_representation"],
            filter: {
              electoral_file: { _eq: fileId },
              country: { _eq: country },
              diplomatic_representation: { _nnull: true },
            },
            limit: -1,
          })
        )) as { diplomatic_representation: string }[];
      } else {
        // Fallback legacy : election_map_diaspora
        warnElectoralLegacyFallback("/api/elections/pvs-upload/diplomatic-representations", country);
        data = (await directus.request(
          readItems("election_map_diaspora", {
            fields: ["diplomatic_representation"],
            filter: {
              country: { _eq: country },
              diplomatic_representation: { _nnull: true },
            },
            limit: -1,
          })
        )) as { diplomatic_representation: string }[];
      }

      // Extraire les représentations uniques et trier
      const representations = [
        ...new Set(data.map((item) => item.diplomatic_representation)),
      ]
        .filter(Boolean)
        .sort();

      return { data: representations };
    } catch (error: any) {
      console.error("[pvs-upload/diplomatic-representations] Erreur:", error);
      throw createError({
        statusCode: 500,
        message: "Erreur lors de la récupération des représentations diplomatiques",
      });
    }
  },
  {
    maxAge: 300, // Cache 5 minutes
    name: "election-pvs-diplomatic-representations-v2",
    getKey: (event) => {
      const query = getQuery(event);
      return `representations-${query.country || "all"}`;
    },
  }
);
