import { readItems } from "@directus/sdk";
import type { Document } from "~~/types/document";

export default defineCachedEventHandler(
  async (event) => {

    // Récupération des paramètres de requête
    const query = getQuery(event);
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const search = query.search as string;
    const sortBy = (query.sortBy as string) || (query.sort as string) || "-publish_date";
    const filterType = query.filterType as string;
    const type = query.type as string;
    const electionIds = query.election_ids as string; // IDs séparés par des virgules
    const year = query.year as string;
    const auditInstitution = query.audit_institution as string;

    try {
      const directus = getCmsClient();

      // Si on filtre par election_id(s), récupérer d'abord les élections avec leurs documents
      let documentIdsFromElections: number[] = [];
      const electionIdsList: number[] = [];

      // Construire la liste des IDs d'élections à filtrer
      if (electionIds) {
        electionIdsList.push(...electionIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)));
      }

      if (electionIdsList.length > 0) {
        try {
          const electionData = await directus.request(
            readItems("elections", {
              fields: ["documents.documents_id.id"],
              filter: {
                id: { _in: electionIdsList },
              },
              limit: electionIdsList.length,
            })
          );

          if (electionData && electionData.length > 0) {
            for (const election of electionData as any[]) {
              if (election.documents && Array.isArray(election.documents)) {
                const docIds = election.documents
                  .map((doc: any) => doc?.documents_id?.id)
                  .filter((id: any) => id !== null && id !== undefined);
                documentIdsFromElections.push(...docIds);
              }
            }
            // Dédupliquer les IDs de documents
            documentIdsFromElections = [...new Set(documentIdsFromElections)];
          }
        } catch (err) {
          console.error("Erreur lors de la récupération des élections:", err);
        }
      }

      // Construction du filtre dynamique
      const filter: any = {
        status: {
          _eq: "published",
        },
      };

      // Filtre par type (prioritaire)
      if (type && type !== "all") {
        filter.type = {
          _eq: type,
        };
      }

      // Filtre par election_id(s) - utiliser les IDs récupérés
      if (electionIdsList.length > 0 && documentIdsFromElections.length > 0) {
        filter.id = {
          _in: documentIdsFromElections,
        };
      } else if (electionIdsList.length > 0 && documentIdsFromElections.length === 0) {
        // Si les élections n'ont pas de documents, retourner un résultat vide
        return {
          documents: [],
          totalDocuments: 0,
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }

      // Filtre par année
      if (filterType && filterType !== "" && filterType !== "all") {
        const filterYear = parseInt(filterType);
        if (!isNaN(filterYear)) {
          filter.publish_date = {
            _between: [`${filterYear}-01-01`, `${filterYear}-12-31`],
          };
        } else {
          if (type === "audit_report") {
            filter.audit_institution = {
              _eq: filterType,
            };
          } else {
            filter.type = {
              _eq: filterType,
            };
          }
        }
      }

      // Filtre par année (paramètre dédié, prioritaire sur filterType)
      if (year && year !== "all") {
        const yearNum = parseInt(year);
        if (!isNaN(yearNum)) {
          filter.publish_date = {
            _between: [`${yearNum}-01-01`, `${yearNum}-12-31`],
          };
        }
      }

      // Filtre par organisme d'audit (paramètre dédié)
      if (auditInstitution && auditInstitution !== "all") {
        filter.audit_institution = {
          _eq: auditInstitution,
        };
      }

      // Recherche textuelle
      if (search) {
        filter._or = [
          { title: { _icontains: search } },
          { description: { _icontains: search } },
          { content_html: { _icontains: search } },
          { audit_institution: { _icontains: search } },
        ];
      }

      // Calcul de l'offset pour la pagination
      const offset = (page - 1) * limit;

      // Tri
      const sortFields: string[] = [];
      if (sortBy) {
        const cleanSort = sortBy.toString().trim();
        if (cleanSort) {
          sortFields.push(cleanSort);
          if (cleanSort.includes('title')) {
            sortFields.push('-publish_date');
          } else if (cleanSort.includes('publish_date')) {
            sortFields.push('title');
          }
        }
      }
      if (sortFields.length === 0) {
        sortFields.push("-publish_date");
      }
      sortFields.push('id');

      // Récupération des documents avec pagination
      const documentData = await directus
        .request(
          readItems("documents", {
            fields: [
              "id",
              "title",
              "slug",
              "type",
              "publish_date",
              "date_created",
              "description",
              "audit_institution",
              "cover_image",
              "file.id",
              "file.type",
              "file.filesize",
              "file.filename_download",
            ],
            filter,
            limit,
            offset,
            sort: sortFields,
          }),
        )
        .catch((error: any) => {
          throw createError({
            statusCode: error.errors?.[0]?.extensions?.code || 500,
            message: error.errors?.[0]?.message || "Erreur interne du serveur",
          });
        });

      // Récupération du total
      const totalCount = await directus
        .request(
          readItems("documents", {
            fields: ["id"],
            filter,
            aggregate: { count: ["id"] },
          }),
        )
        .then((result: any) => {
          return result?.[0]?.count?.id || 0;
        })
        .catch(() => documentData.length);

      // Transformation des données
      const transformedDocuments: Document[] = documentData.map((doc) => ({
        id: doc.id,
        title: doc.title?.trim() || doc.title,
        slug: doc.slug,
        type: doc.type,
        publish_date: doc.publish_date,
        ...(doc.description ? { description: doc.description } : {}),
        ...(doc.audit_institution ? { audit_institution: doc.audit_institution } : {}),
        ...(doc.cover_image ? { cover_image: doc.cover_image } : {}),
        ...(doc.file ? { file: doc.file } : {}),
      }));

      return {
        documents: transformedDocuments,
        totalDocuments: Number(totalCount),
        pagination: {
          page,
          limit,
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / limit),
        },
      };
    } catch (error: any) {
      throw createError({
        statusCode: 500,
        statusMessage: "Une erreur est survenue lors de la récupération des documents",
      });
    }
  },
  {
    maxAge: 60 * 5, // 5 minutes
    name: "documents",
    getKey: (event) => {
      const query = getQuery(event);
      return `documents-${JSON.stringify(query)}`;
    },
  },
);
