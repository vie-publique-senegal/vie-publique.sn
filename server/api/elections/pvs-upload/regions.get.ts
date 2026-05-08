import { readItems } from "@directus/sdk";

/**
 * Liste des régions depuis election_map_national
 * Route: GET /api/elections/pvs-upload/regions
 * Query params: ?election=ID (optionnel)
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const electionId = query.election ? Number(query.election) : null;

    try {
      const filter: any = { region: { _nnull: true } };
      if (electionId) {
        filter.election = { _eq: electionId };
      }

      const data = await directus.request(
        readItems("election_map_national", {
          fields: ["region"],
          filter,
          limit: -1,
        })
      );

      // Extraire les régions uniques et trier
      const regions = [...new Set((data as any[]).map((item) => item.region))]
        .filter(Boolean)
        .sort();

      return { data: regions };
    } catch (error: any) {
      console.error("[pvs-upload/regions] Erreur:", error);
      throw createError({
        statusCode: 500,
        message: "Erreur lors de la récupération des régions",
      });
    }
  },
  {
    maxAge: 300, // Cache 5 minutes
    name: "election-pvs-regions",
  }
);
