import { readItems } from "@directus/sdk";

/**
 * Liste des PVs publiés avec pagination et filtres
 * Route: GET /api/elections/pvs-upload
 * Query params:
 *   - page: numéro de page (défaut: 1)
 *   - limit: items par page (défaut: 12)
 *   - source: 'national' | 'diaspora'
 *   - region, department, municipality (pour national)
 *   - country, diplomatic_representation (pour diaspora)
 *   - tour: '1' | '2'
 *   - election: ID de l'élection
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));

    // Construction du filtre
    const filter: any = {
      status: { _eq: "published" },
    };

    if (query.source) {
      filter.source = { _eq: query.source };
    }

    if (query.election) {
      filter.election = { _eq: Number(query.election) };
    }

    if (query.tour) {
      filter.tour = { _eq: query.tour };
    }

    // Filtres National
    if (query.region) {
      filter.region = { _eq: query.region };
    }
    if (query.department) {
      filter.department = { _eq: query.department };
    }
    if (query.municipality) {
      filter.municipality = { _eq: query.municipality };
    }

    // Filtres Diaspora
    if (query.country) {
      filter.country = { _eq: query.country };
    }
    if (query.diplomatic_representation) {
      filter.diplomatic_representation = { _eq: query.diplomatic_representation };
    }

    try {
      // Récupérer les PVs
      const data = await directus.request(
        readItems("election_pvs", {
          fields: [
            "id",
            "date_created",
            "source",
            "tour",
            // National
            "region",
            "department",
            "municipality",
            // Diaspora
            "country",
            "diplomatic_representation",
            "locality",
            // Commun
            "bureau",
            "image.id",
            "election.id",
            "election.name",
            "election.year",
          ],
          filter,
          sort: ["-date_created"],
          limit,
          page,
        })
      );

      // Récupérer le total
      const [totalResult] = await directus.request(
        readItems("election_pvs", {
          filter,
          aggregate: { count: "*" },
          limit: 1,
        }) as any
      );

      const total = totalResult?.count || 0;

      return {
        data,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      console.error("[pvs-upload/index] Erreur:", error);
      throw createError({
        statusCode: 500,
        message: "Erreur lors de la récupération des PVs",
      });
    }
  },
  {
    maxAge: 30, // Cache 30 secondes
    name: "election-pvs-list",
    getKey: (event) => {
      const query = getQuery(event);
      return `pvs-${query.page || 1}-${query.source || "all"}-${query.election || "all"}`;
    },
  }
);
