import { readItems } from "@directus/sdk";

interface FileRow {
  id: number;
  name: string;
  scope: "national" | "diaspora";
  year: number | null;
  revision_date: string | null;
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
 * Révisions du fichier électoral (paires national + diaspora par année),
 * avec les élections rattachées et les documents officiels (arrêtés).
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
              "name",
              "scope",
              "year",
              "revision_date",
              "document.id",
              "document.slug",
              "document.title",
              "document.status",
            ],
            filter: { status: { _eq: "published" } },
            sort: ["-year", "-revision_date", "-id"],
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
        name: file.name,
        year: file.year,
        revision_date: file.revision_date,
        document:
          file.document?.id && file.document.status === "published"
            ? { id: file.document.id, slug: file.document.slug, title: file.document.title }
            : null,
      });

      // Grouper les fichiers par révision (année + date de révision)
      const revisionsByKey = new Map<
        string,
        {
          year: number | null;
          revision_date: string | null;
          national: ReturnType<typeof cleanFile> | null;
          diaspora: ReturnType<typeof cleanFile> | null;
          elections: { id: number; name: string; type: string; year: number; slug: string | null }[];
        }
      >();

      for (const file of files) {
        const key = `${file.year ?? ""}|${file.revision_date ?? ""}`;
        if (!revisionsByKey.has(key)) {
          revisionsByKey.set(key, {
            year: file.year,
            revision_date: file.revision_date,
            national: null,
            diaspora: null,
            elections: [],
          });
        }
        const revision = revisionsByKey.get(key)!;
        if (file.scope === "diaspora") revision.diaspora = cleanFile(file);
        else revision.national = cleanFile(file);
      }

      // Rattacher les élections (lookup inverse par les 2 FK)
      for (const revision of revisionsByKey.values()) {
        const fileIds = [revision.national?.id, revision.diaspora?.id].filter(Boolean);
        revision.elections = elections
          .filter(
            (e) =>
              (e.electoral_file_national && fileIds.includes(e.electoral_file_national)) ||
              (e.electoral_file_diaspora && fileIds.includes(e.electoral_file_diaspora))
          )
          .map((e) => ({ id: e.id, name: e.name, type: e.type, year: e.year, slug: e.slug }));
      }

      return { revisions: [...revisionsByKey.values()] };
    } catch (error) {
      // Schéma absent (prod pré-migration) : pas de révision connue
      console.error("Error fetching electoral files:", error);
      return { revisions: [] };
    }
  },
  {
    maxAge: 10 * 60,
    name: "elections-electoral-files",
    getKey: () => "elections-electoral-files",
  }
);
