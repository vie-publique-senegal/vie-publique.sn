import { readItems } from "@directus/sdk";

export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient() as any;

    try {
      const electionsPromise = directus.request(
        (readItems as any)("elections", {
          fields: [
            "id",
            "slug",
            "year",
            "type",
            "name",
            "status",
            "description",
            "election_date",
            "campaign_start_date",
            "campaign_end_date",
            "rounds",
            "election_date_round_2",
            "participation_rate",
            "registered_voters",
            "voters_count",
            "null_ballots",
            "valid_votes",
            "absolute_majority",
            "national_quotient",
            "pv_upload_active",
            "documents.documents_id.id",
            "documents.documents_id.slug",
            "documents.documents_id.title",
            "documents.documents_id.description",
            "documents.documents_id.type",
            "documents.documents_id.file",
            "documents.documents_id.cover_image",
            "documents.documents_id.publish_date",
            "documents.documents_id.status"
          ],
          sort: ["-year", "-election_date", "-id"],
          filter: {
            status: { _nin: ["draft", "archived"] }
          },
        })
      ) as Promise<any[]>;

      // Fichiers électoraux des élections (additif, best-effort : requête séparée
      // pour ne pas faire échouer la config quand le schéma n'existe pas encore en prod).
      // Lancée en parallèle de la requête principale (aucune dépendance entre les deux)
      // pour éviter d'attendre deux allers-retours CMS séquentiels.
      const electoralFileFields = (scope: string) => [
        `electoral_file_${scope}.id`,
        `electoral_file_${scope}.name`,
        `electoral_file_${scope}.scope`,
        `electoral_file_${scope}.year`,
        `electoral_file_${scope}.document.id`,
        `electoral_file_${scope}.document.slug`,
        `electoral_file_${scope}.document.title`,
        `electoral_file_${scope}.document.type`,
        `electoral_file_${scope}.document.file`,
        `electoral_file_${scope}.document.status`,
      ];

      interface ElectoralFileRow {
        id: number;
        name: string;
        year: number | null;
        document?: {
          id: number;
          slug: string | null;
          title: string | null;
          type: string | null;
          file: string | null;
          status: string;
        } | null;
      }

      interface CleanElectoralFile {
        id: number;
        name: string;
        year: number | null;
        document: Omit<NonNullable<ElectoralFileRow["document"]>, "status"> | null;
      }

      const filesPromise = directus
        .request(
          (readItems as any)("elections", {
            fields: ["id", ...electoralFileFields("national"), ...electoralFileFields("diaspora")],
            filter: { status: { _nin: ["draft", "archived"] } },
            limit: -1,
          })
        )
        .catch(() => null) as Promise<
        | {
            id: number;
            electoral_file_national?: ElectoralFileRow | null;
            electoral_file_diaspora?: ElectoralFileRow | null;
          }[]
        | null
      >;

      const [electionsData, fileRowsResult] = await Promise.all([electionsPromise, filesPromise]);

      if (!electionsData || electionsData.length === 0) {
          return {
            years: [{ label: "2024", value: 2024 }],
            types: [
              { label: "Législatives", value: "legislative" },
              { label: "Présidentielle", value: "presidential" },
              { label: "Locales", value: "locale" },
            ],
            elections: []
          };
      }

      const yearsSet = new Set<number>();
      const typesSet = new Set<string>();

      electionsData.forEach((e: any) => {
        if (e.year) yearsSet.add(e.year);
        if (e.type) typesSet.add(e.type);
      });

      const years = Array.from(yearsSet)
        .sort((a, b) => b - a)
        .map((y) => ({ label: String(y), value: y }));

      const typesMap: Record<string, string> = {
          'legislative': 'Législatives',
          'presidential': 'Présidentielle',
          'locale': 'Locales'
      };

      const types = Array.from(typesSet).map((t) => ({
        label: typesMap[t] || t.charAt(0).toUpperCase() + t.slice(1),
        value: t,
      }));

      const electoralFilesByElection = new Map<
        number,
        { national: CleanElectoralFile | null; diaspora: CleanElectoralFile | null }
      >();
      if (fileRowsResult) {
        const fileRows = fileRowsResult as {
          id: number;
          electoral_file_national?: ElectoralFileRow | null;
          electoral_file_diaspora?: ElectoralFileRow | null;
        }[];

        const cleanFile = (file: ElectoralFileRow | null | undefined): CleanElectoralFile | null => {
          if (!file?.id) return null;
          const document =
            file.document?.id && file.document.status === "published"
              ? {
                  id: file.document.id,
                  slug: file.document.slug,
                  title: file.document.title,
                  type: file.document.type,
                  file: file.document.file,
                }
              : null;
          return {
            id: file.id,
            name: file.name,
            year: file.year,
            document,
          };
        };

        for (const row of fileRows) {
          electoralFilesByElection.set(row.id, {
            national: cleanFile(row.electoral_file_national),
            diaspora: cleanFile(row.electoral_file_diaspora),
          });
        }
      }

      // Traiter les données des élections pour nettoyer et filtrer les documents
      const processedElections = electionsData.map((election: any) => {
        // Extraire et filtrer les documents (seulement les publiés)
        const documents = election.documents && Array.isArray(election.documents)
          ? election.documents
              .map((doc: any) => doc.documents_id)
              .filter((d: any) => d && d.id && d.status === "published")
              .sort((a: any, b: any) => {
                // Trier par date de publication (plus récent en premier)
                const dateA = a.publish_date ? new Date(a.publish_date).getTime() : 0;
                const dateB = b.publish_date ? new Date(b.publish_date).getTime() : 0;
                return dateB - dateA;
              })
          : [];

        return {
          ...election,
          documents,
          electoral_files: electoralFilesByElection.get(election.id) || null,
        };
      });

      // Récupérer les IDs des élections qui ont au moins un document publié
      const electionIdsWithDocuments = processedElections
        .filter((e: any) => e.documents && e.documents.length > 0)
        .map((e: any) => e.id);

      return {
        years,
        types,
        elections: processedElections,
        election_ids_with_documents: electionIdsWithDocuments,
      };
    } catch (error) {
      console.error("Error fetching dashboard config:", error);
      return {
          years: [{ label: "2024", value: 2024 }],
          types: [{ label: "Législatives", value: "legislatives" }],
          error: true
      };
    }
  },
  {
    maxAge: 5 * 60,
    name: "elections-dashboard-config-v2",
    getKey: () => "elections-dashboard-config",
  }
);
