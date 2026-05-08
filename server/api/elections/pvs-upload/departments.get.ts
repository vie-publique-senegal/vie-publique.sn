import { readItems } from "@directus/sdk";

/**
 * Liste des départements filtrés par région
 * Route: GET /api/elections/pvs-upload/departments
 * Query params: ?region=REGION_NAME (requis)
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const region = query.region as string;

    if (!region) {
      throw createError({
        statusCode: 400,
        message: "Le paramètre 'region' est requis",
      });
    }

    try {
      const data = await directus.request(
        readItems("election_map_national", {
          fields: ["department"],
          filter: {
            region: { _eq: region },
            department: { _nnull: true },
          },
          limit: -1,
        })
      );

      // Extraire les départements uniques et trier
      const departments = [...new Set((data as any[]).map((item) => item.department))]
        .filter(Boolean)
        .sort();

      return { data: departments };
    } catch (error: any) {
      console.error("[pvs-upload/departments] Erreur:", error);
      throw createError({
        statusCode: 500,
        message: "Erreur lors de la récupération des départements",
      });
    }
  },
  {
    maxAge: 300, // Cache 5 minutes
    name: "election-pvs-departments",
    getKey: (event) => {
      const query = getQuery(event);
      return `departments-${query.region || "all"}`;
    },
  }
);
