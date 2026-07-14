import { readItems } from "@directus/sdk";

interface RevisionRow {
  id: number;
  slug: string;
  year: number | null;
  type: string;
  status: string;
}

interface FileRow {
  id: number;
  scope: "national" | "diaspora";
  revision: number | null;
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
 * Révisions de la carte électorale (une ligne election_revisions = national + diaspora),
 * avec les élections rattachées et les documents officiels (arrêtés).
 * Route: GET /api/elections/electoral-files
 *
 * Alimente le sélecteur de révision de la page carte électorale. Seules les révisions
 * ayant au moins un fichier électoral rattaché apparaissent ici (la liste complète des
 * révisions, y compris sans carte électorale associée, vit sur /api/elections/revisions).
 */
export default defineCachedEventHandler(
  async () => {
    const directus = getCmsClient();

    try {
      const [revisionRows, files, elections] = await Promise.all([
        directus.request(
          readItems("election_revisions", {
            fields: ["id", "slug", "year", "type", "status"],
            filter: { status: { _nin: ["draft", "archived"] } },
            sort: ["-year", "-id"],
            limit: -1,
          })
        ) as Promise<RevisionRow[]>,
        directus.request(
          readItems("election_electoral_files", {
            fields: [
              "id",
              "scope",
              "revision",
              "document.id",
              "document.slug",
              "document.title",
              "document.status",
            ],
            filter: { revision: { _nnull: true } },
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

      const filesByRevision = new Map<number, { national: ReturnType<typeof cleanFile> | null; diaspora: ReturnType<typeof cleanFile> | null }>();
      for (const file of files) {
        if (!file.revision) continue;
        if (!filesByRevision.has(file.revision)) {
          filesByRevision.set(file.revision, { national: null, diaspora: null });
        }
        const entry = filesByRevision.get(file.revision)!;
        if (file.scope === "diaspora") entry.diaspora = cleanFile(file);
        else entry.national = cleanFile(file);
      }

      const revisions = revisionRows
        .map((revision) => {
          const revisionFiles = filesByRevision.get(revision.id);
          if (!revisionFiles) return null; // pas de carte électorale rattachée : hors de ce sélecteur

          const fileIds = [revisionFiles.national?.id, revisionFiles.diaspora?.id].filter(Boolean);
          const revisionElections = elections
            .filter(
              (e) =>
                (e.electoral_file_national && fileIds.includes(e.electoral_file_national)) ||
                (e.electoral_file_diaspora && fileIds.includes(e.electoral_file_diaspora))
            )
            .map((e) => ({ id: e.id, name: e.name, type: e.type, year: e.year, slug: e.slug }));

          return {
            id: revision.id,
            slug: revision.slug,
            year: revision.year,
            type: revision.type,
            national: revisionFiles.national,
            diaspora: revisionFiles.diaspora,
            elections: revisionElections,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      return { revisions };
    } catch (error) {
      // Schéma absent (prod pré-migration) : pas de révision connue
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
