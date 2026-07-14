import { readItems } from "@directus/sdk";

interface RevisionRow {
  id: number;
  slug: string;
  year: number | null;
  type: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
}

/**
 * Liste de toutes les révisions électorales publiées (registre DAF), avec ou sans
 * carte électorale rattachée — alimente la page évergreen /elections-senegal/revision-electorale.
 * Route: GET /api/elections/revisions
 */
export default defineCachedEventHandler(
  async () => {
    const directus = getCmsClient();

    try {
      const revisions = (await directus.request(
        readItems("election_revisions", {
          fields: ["id", "slug", "year", "type", "status", "period_start", "period_end"],
          filter: { status: { _nin: ["draft", "archived"] } },
          sort: ["-year", "-id"],
          limit: -1,
        })
      )) as RevisionRow[];

      return { revisions };
    } catch (error) {
      console.error("Error fetching election revisions:", error);
      return { revisions: [] };
    }
  },
  {
    maxAge: 10 * 60,
    name: "elections-revisions-list",
    getKey: () => "elections-revisions-list",
  }
);
