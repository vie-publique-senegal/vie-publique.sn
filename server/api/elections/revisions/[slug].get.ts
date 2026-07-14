import { readItems } from "@directus/sdk";

interface RevisionRow {
  id: number;
  slug: string;
  year: number | null;
  type: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  description: string | null;
  faq: { question: string; answer: string }[] | null;
  document: {
    id: number;
    slug: string | null;
    title: string | null;
    status: string;
  } | null;
}

interface FileRow {
  id: number;
  scope: "national" | "diaspora";
  document: {
    id: number;
    slug: string | null;
    title: string | null;
    status: string;
  } | null;
}

interface ElectionRow {
  id: number;
  name: string;
  type: string;
  year: number;
  slug: string | null;
  electoral_file_national: number | null;
  electoral_file_diaspora: number | null;
}

/**
 * Détail d'une révision électorale (période, définition, FAQ, décret, fichiers et
 * scrutins rattachés) — alimente /elections-senegal/revision-electorale/[slug].
 * Route: GET /api/elections/revisions/[slug]
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const slug = getRouterParam(event, "slug");

    if (!slug) {
      throw createError({ statusCode: 400, statusMessage: "Parametre slug requis" });
    }

    try {
      const revisions = (await directus.request(
        readItems("election_revisions", {
          fields: [
            "id",
            "slug",
            "year",
            "type",
            "status",
            "period_start",
            "period_end",
            "description",
            "faq",
            "document.id",
            "document.slug",
            "document.title",
            "document.status",
          ],
          filter: { slug: { _eq: slug }, status: { _nin: ["draft", "archived"] } },
          limit: 1,
        })
      )) as RevisionRow[];

      const revision = revisions?.[0];
      if (!revision) return { data: null };

      const [files, elections] = await Promise.all([
        directus.request(
          readItems("election_electoral_files", {
            fields: ["id", "scope", "document.id", "document.slug", "document.title", "document.status"],
            filter: { revision: { _eq: revision.id } },
            limit: -1,
          })
        ) as Promise<FileRow[]>,
        directus.request(
          readItems("elections", {
            fields: ["id", "name", "type", "year", "slug", "electoral_file_national", "electoral_file_diaspora"],
            filter: { status: { _nin: ["draft", "archived"] } },
            limit: -1,
          })
        ) as Promise<ElectionRow[]>,
      ]);

      const cleanFile = (file: FileRow) => ({
        id: file.id,
        document:
          file.document?.id && file.document.status === "published"
            ? { id: file.document.id, slug: file.document.slug, title: file.document.title }
            : null,
      });

      const national = files.find((f) => f.scope === "national");
      const diaspora = files.find((f) => f.scope === "diaspora");
      const fileIds = [national?.id, diaspora?.id].filter(Boolean);

      const revisionElections = elections
        .filter(
          (e) =>
            (e.electoral_file_national && fileIds.includes(e.electoral_file_national)) ||
            (e.electoral_file_diaspora && fileIds.includes(e.electoral_file_diaspora))
        )
        .map((e) => ({ id: e.id, name: e.name, type: e.type, year: e.year, slug: e.slug }));

      const document =
        revision.document?.id && revision.document.status === "published"
          ? { id: revision.document.id, slug: revision.document.slug, title: revision.document.title }
          : null;

      return {
        data: {
          id: revision.id,
          slug: revision.slug,
          year: revision.year,
          type: revision.type,
          status: revision.status,
          period_start: revision.period_start,
          period_end: revision.period_end,
          description: revision.description,
          faq: revision.faq || [],
          document,
          national: national ? cleanFile(national) : null,
          diaspora: diaspora ? cleanFile(diaspora) : null,
          elections: revisionElections,
        },
      };
    } catch (error) {
      console.error("Error fetching election revision detail:", error);
      return { data: null };
    }
  },
  {
    maxAge: 10 * 60,
    name: "elections-revision-detail",
    getKey: (event) => `elections-revision-detail-${getRouterParam(event, "slug") || "unknown"}`,
  }
);
