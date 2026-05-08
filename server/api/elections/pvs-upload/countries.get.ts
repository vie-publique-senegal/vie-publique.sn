import { readItems } from "@directus/sdk";

/**
 * Liste des pays depuis election_map_diaspora
 * Route: GET /api/elections/pvs-upload/countries
 * Query params: ?election=ID (optionnel)
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const electionId = query.election ? Number(query.election) : null;

    try {
      const filter: any = { country: { _nnull: true } };
      if (electionId) {
        filter.election = { _eq: electionId };
      }

      const data = await directus.request(
        readItems("election_map_diaspora", {
          fields: ["country"],
          filter,
          limit: -1,
        })
      );

      // Extraire les pays uniques et trier
      const countries = [...new Set((data as any[]).map((item) => item.country))]
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
    name: "election-pvs-countries",
  }
);
