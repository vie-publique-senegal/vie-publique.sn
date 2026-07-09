import { readItems } from "@directus/sdk";

/**
 * Liste des pays de la diaspora
 * Route: GET /api/elections/pvs-upload/countries
 * Query params: ?election=ID (optionnel)
 *
 * Source : election_polling_stations (texte country) via le fichier électoral
 * diaspora. Fallback : election_map_diaspora tant que la prod n'est pas migrée.
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const electionId = query.election ? Number(query.election) : null;

    try {
      const fileId = await resolveElectoralFileId(electionId, "diaspora");

      let data: { country: string }[];

      if (fileId) {
        data = (await directus.request(
          readItems("election_polling_stations", {
            fields: ["country"],
            filter: {
              electoral_file: { _eq: fileId },
              country: { _nnull: true },
            },
            limit: -1,
          })
        )) as { country: string }[];
      } else {
        // Fallback legacy : election_map_diaspora
        warnElectoralLegacyFallback("/api/elections/pvs-upload/countries");
        const filter: any = { country: { _nnull: true } };
        if (electionId) {
          filter.election = { _eq: electionId };
        }
        data = (await directus.request(
          readItems("election_map_diaspora", {
            fields: ["country"],
            filter,
            limit: -1,
          })
        )) as { country: string }[];
      }

      // Extraire les pays uniques et trier
      const countries = [...new Set(data.map((item) => item.country))]
        .filter(Boolean)
        .sort();

      return { data: countries };
    } catch (error: any) {
      console.error("[pvs-upload/countries] Erreur:", error);
      throw createError({
        statusCode: 500,
        message: "Erreur lors de la récupération des pays",
      });
    }
  },
  {
    maxAge: 300, // Cache 5 minutes
    name: "election-pvs-countries-v2",
  }
);
