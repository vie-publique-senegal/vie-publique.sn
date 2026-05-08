import { readItems } from "@directus/sdk";

/**
 * Liste des représentations diplomatiques filtrées par pays
 * Route: GET /api/elections/pvs-upload/diplomatic-representations
 * Query params: ?country=COUNTRY_NAME (requis)
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
      const data = await directus.request(
        readItems("election_map_diaspora", {
          fields: ["diplomatic_representation"],
          filter: {
            country: { _eq: country },
            diplomatic_representation: { _nnull: true },
          },
          limit: -1,
        })
      );

      // Extraire les représentations uniques et trier
      const representations = [
        ...new Set((data as any[]).map((item) => item.diplomatic_representation)),
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
    name: "election-pvs-diplomatic-representations",
    getKey: (event) => {
      const query = getQuery(event);
      return `representations-${query.country || "all"}`;
    },
  }
);
