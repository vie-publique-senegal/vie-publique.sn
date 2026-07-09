// server/api/elections/participation.get.ts
import { readItems } from "@directus/sdk";

interface ParticipationRow {
  voters: number | null;
  participation_10h: number | null;
  participation_12h: number | null;
  participation_14h: number | null;
  participation_17h: number | null;
  constituency: {
    name: string;
    nationale_type: string | null;
    region: string | null;
    parent: { name: string; region: string | null } | null;
  } | null;
}

/**
 * Endpoint pour récupérer les données de participation par département
 * Route: /api/elections/participation
 *
 * Query params:
 * - election: ID de l'élection (optionnel, additif — le legacy ne filtrait pas)
 *
 * Source : election_constituency_results (departement/region résolus via le
 * référentiel des circonscriptions). Fallback : collection `carte` tant que
 * les résultats ne sont pas backfillés (prod non migrée).
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const electionId = query.election as string | undefined;

    try {
      const results = (await directus
        .request(
          readItems("election_constituency_results", {
            fields: [
              "voters",
              "participation_10h",
              "participation_12h",
              "participation_14h",
              "participation_17h",
              "constituency.name",
              "constituency.nationale_type",
              "constituency.region",
              "constituency.parent.name",
              "constituency.parent.region",
            ],
            ...(electionId ? { filter: { election: { _eq: parseInt(electionId) } } } : {}),
            limit: -1,
            sort: ["id"],
          })
        )
        .catch(() => null)) as ParticipationRow[] | null;

      if (results && results.length > 0) {
        return results
          .map((row) => {
            const constituency = row.constituency;
            const isCommune = constituency?.nationale_type === "commune";
            return {
              departement: isCommune ? constituency?.parent?.name || null : constituency?.name || null,
              region: (isCommune ? constituency?.parent?.region : constituency?.region) || null,
              voters: row.voters,
              participation_10h: row.participation_10h,
              participation_12h: row.participation_12h,
              participation_14h: row.participation_14h,
              participation_17h: row.participation_17h,
            };
          })
          .sort(
            (a, b) =>
              (a.region || "").localeCompare(b.region || "") ||
              (a.departement || "").localeCompare(b.departement || "")
          );
      }

      // Fallback legacy : lecture de `carte`
      warnElectoralLegacyFallback("/api/elections/participation");
      return await directus.request(
        readItems("carte", {
          fields: [
            "departement",
            "region",
            "voters",
            "participation_10h",
            "participation_12h",
            "participation_14h",
            "participation_17h",
          ],
          sort: ["region", "departement"],
        })
      );
    } catch (error) {
      console.error("Error fetching participation data:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Erreur lors de la récupération des données de participation",
      });
    }
  },
  {
    maxAge: 5 * 60, // Cache de 5 minutes (données en temps réel)
    name: "election-participation-v2",
    getKey: (event) => {
      const query = getQuery(event);
      return `election-participation-${query.election || "all"}`;
    },
  }
);
