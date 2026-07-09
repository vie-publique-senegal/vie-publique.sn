import { readItems, aggregate } from "@directus/sdk";

/**
 * Statistiques des 8 zones électorales de la diaspora (circonscriptions de l'étranger)
 * Route: GET /api/elections/diaspora/zones
 *
 * Query params:
 * - election: ID de l'élection (optionnel)
 * - electoral_file: ID du fichier électoral diaspora (optionnel, prioritaire)
 *
 * Source : election_polling_stations agrégés par circonscription de zone.
 * Renvoie { zones: [] } si le fichier n'est pas résolu (prod non migrée) —
 * l'appelant retombe sur la vue pays legacy.
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const electionId = query.election as string | undefined;
    const electoralFileParam = query.electoral_file as string | undefined;

    try {
      const fileId = electoralFileParam
        ? parseInt(electoralFileParam)
        : await resolveElectoralFileId(electionId ? parseInt(electionId) : null, "diaspora");

      if (!fileId) {
        warnElectoralLegacyFallback("/api/elections/diaspora/zones");
        return { zones: [] };
      }

      const statsData = (await directus.request(
        aggregate("election_polling_stations", {
          aggregate: {
            count: ["office_number"],
            sum: ["voters"],
            countDistinct: ["polling_place", "country", "locality"],
          },
          groupBy: ["constituency"],
          query: {
            filter: { electoral_file: { _eq: fileId } },
            limit: 100,
          },
        })
      )) as {
        constituency: number | string;
        count?: Record<string, string>;
        sum?: Record<string, string>;
        countDistinct?: Record<string, string>;
      }[];

      const zoneIds = statsData.map((row) => Number(row.constituency)).filter((id) => !isNaN(id));
      const zoneRows = (await directus.request(
        readItems("election_constituencies", {
          fields: ["id", "name", "slug", "seats"],
          filter: { id: { _in: zoneIds.length > 0 ? zoneIds : [0] } },
          limit: -1,
          sort: ["name"],
        })
      )) as { id: number; name: string; slug: string | null; seats: number | null }[];

      const zonesById = new Map(zoneRows.map((z) => [z.id, z]));

      const zones = statsData
        .map((row) => {
          const zone = zonesById.get(Number(row.constituency));
          return {
            id: Number(row.constituency),
            name: zone?.name || null,
            slug: zone?.slug || null,
            seats: zone?.seats ?? null,
            voters: parseInt(row.sum?.voters || "0"),
            offices: parseInt(row.count?.office_number || "0"),
            places: parseInt(row.countDistinct?.polling_place || "0"),
            countries: parseInt(row.countDistinct?.country || "0"),
            localities: parseInt(row.countDistinct?.locality || "0"),
          };
        })
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      return { zones };
    } catch (error) {
      console.error("Error fetching diaspora zones:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Erreur lors de la récupération des zones de la diaspora",
      });
    }
  },
  {
    maxAge: 60 * 60,
    name: "election-diaspora-zones",
    getKey: (event) => buildCacheKey("election-diaspora-zones", getQuery(event)),
  }
);
