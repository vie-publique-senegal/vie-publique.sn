import { readItems } from "@directus/sdk";

/**
 * Liste des communes filtrées par département
 * Route: GET /api/elections/pvs-upload/municipalities
 * Query params: ?department=DEPT_NAME (requis)
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
      const data = await directus.request(
        readItems("election_map_national", {
          fields: ["municipality"],
          filter: {
            department: { _eq: department },
            municipality: { _nnull: true },
          },
          limit: -1,
        })
      );

      // Extraire les communes uniques et trier
      const municipalities = [...new Set((data as any[]).map((item) => item.municipality))]
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
    name: "election-pvs-municipalities",
    getKey: (event) => {
      const query = getQuery(event);
      return `municipalities-${query.department || "all"}`;
    },
  }
);
