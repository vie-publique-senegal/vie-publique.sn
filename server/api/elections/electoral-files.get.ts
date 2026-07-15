import { readItems } from "@directus/sdk";

interface FileRow {
  id: number;
  scope: "national" | "diaspora";
  year: number | null;
  revision_type: string | null;
  period_start: string | null;
  period_end: string | null;
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
 * Révisions de la carte électorale (fichiers électoraux national + diaspora
 * regroupés par année/type/période), avec les élections rattachées et les
 * documents officiels (arrêtés).
 * Route: GET /api/elections/electoral-files
 *
 * Alimente le sélecteur de révision de la page carte électorale.
 */
export default defineCachedEventHandler(
  async () => {
    const directus = getCmsClient();

    try {
      const [files, elections] = await Promise.all([
        directus.request(
          readItems("election_electoral_files", {
            fields: [
              "id",
              "scope",
              "year",
              "revision_type",
              "period_start",
              "period_end",
              "document.id",
              "document.slug",
              "document.title",
              "document.status",
            ],
            filter: { status: { _nin: ["draft", "archived"] } },
            sort: ["-year", "-id"],
            limit: -1,
          })
        ) as Promise<FileRow[]>,
        directus.request(
          readItems("elections", {
            fields: [
              "id",
              "name",
              "type",
              "year",
              "slug",
              "electoral_file_national",
              "electoral_file_diaspora",
            ],
            filter: { status: { _nin: ["draft", "archived"] } },
            sort: ["-year", "-id"],
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

      const revisionKey = (file: FileRow) => `${file.year}|${file.revision_type}|${file.period_start}`;

      const filesByRevision = new Map<
        string,
        {
          year: number | null;
          revision_type: string | null;
          period_start: string | null;
          period_end: string | null;
          national: ReturnType<typeof cleanFile> | null;
          diaspora: ReturnType<typeof cleanFile> | null;
        }
      >();
      for (const file of files) {
        const key = revisionKey(file);
        if (!filesByRevision.has(key)) {
          filesByRevision.set(key, {
            year: file.year,
            revision_type: file.revision_type,
            period_start: file.period_start,
            period_end: file.period_end,
            national: null,
            diaspora: null,
          });
        }
        const entry = filesByRevision.get(key)!;
        if (file.scope === "diaspora") entry.diaspora = cleanFile(file);
        else entry.national = cleanFile(file);
      }

      const revisions = Array.from(filesByRevision.entries())
        .map(([key, revisionFiles]) => {
          const fileIds = [revisionFiles.national?.id, revisionFiles.diaspora?.id].filter(Boolean);
          const revisionElections = elections
            .filter(
              (e) =>
                (e.electoral_file_national && fileIds.includes(e.electoral_file_national)) ||
                (e.electoral_file_diaspora && fileIds.includes(e.electoral_file_diaspora))
            )
            .map((e) => ({ id: e.id, name: e.name, type: e.type, year: e.year, slug: e.slug }));

          return {
            key,
            year: revisionFiles.year,
            revision_type: revisionFiles.revision_type,
            period_start: revisionFiles.period_start,
            period_end: revisionFiles.period_end,
            national: revisionFiles.national,
            diaspora: revisionFiles.diaspora,
            elections: revisionElections,
          };
        })
        .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

      return { revisions };
    } catch (error) {
      console.error("Error fetching electoral files:", error);
      return { revisions: [] };
    }
  },
  {
    maxAge: 10 * 60,
    name: "elections-electoral-files-v2",
    getKey: () => "elections-electoral-files-v2",
  }
);
