import { readItems } from "@directus/sdk";

/**
 * Liste des départements filtrés par région
 * Route: GET /api/elections/pvs-upload/departments
 * Query params: ?region=REGION_NAME (requis)
 *
 * Source : référentiel election_constituencies (départements enfants de la région).
 * Fallback : textes department de election_map_national tant que la prod n'est pas migrée.
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
      const referentialDepartments = (await directus
        .request(
          readItems("election_constituencies", {
            fields: ["name"],
            filter: {
              nationale_type: { _eq: "departement" },
              status: { _neq: "archived" },
              parent: { name: { _eq: region } },
            },
            sort: ["name"],
            limit: -1,
          })
        )
        .catch(() => [])) as { name: string }[];

      if (referentialDepartments.length > 0) {
        return { data: referentialDepartments.map((d) => d.name).filter(Boolean) };
      }

      // Fallback legacy : textes department des bureaux election_map_national
      warnElectoralLegacyFallback("/api/elections/pvs-upload/departments", region);

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
    name: "election-pvs-departments-v2",
    getKey: (event) => {
      const query = getQuery(event);
      return `departments-${query.region || "all"}`;
    },
  }
);
