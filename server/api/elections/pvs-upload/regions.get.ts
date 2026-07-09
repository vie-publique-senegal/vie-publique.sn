import { readItems } from "@directus/sdk";

/**
 * Liste des régions
 * Route: GET /api/elections/pvs-upload/regions
 * Query params: ?election=ID (optionnel, ignoré par le référentiel — conservé pour compat)
 *
 * Source : référentiel election_constituencies (lignes région).
 * Fallback : textes region de election_map_national tant que la prod n'est pas migrée.
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const electionId = query.election ? Number(query.election) : null;

    try {
      const referentialRegions = (await directus
        .request(
          readItems("election_constituencies", {
            fields: ["name"],
            filter: {
              nationale_type: { _eq: "region" },
              status: { _neq: "archived" },
            },
            sort: ["name"],
            limit: -1,
          })
        )
        .catch(() => [])) as { name: string }[];

      if (referentialRegions.length > 0) {
        return { data: referentialRegions.map((r) => r.name).filter(Boolean) };
      }

      // Fallback legacy : textes region des bureaux election_map_national
      warnElectoralLegacyFallback("/api/elections/pvs-upload/regions");

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
    name: "election-pvs-regions-v2",
  }
);
