import { aggregate } from "@directus/sdk";

/**
 * Endpoint pour récupérer les statistiques d'un pays de la diaspora
 * GET /api/elections/diaspora/country-stats/:country
 *
 * Query params:
 * - election: ID de l'élection pour filtrer les données
 *
 * Source : election_polling_stations via le fichier électoral diaspora.
 * Fallback : election_map_diaspora tant que la prod n'est pas migrée.
 *
 * @returns Statistiques agrégées du pays (localités, bureaux, électeurs)
 */
export default defineCachedEventHandler(
  async (event) => {
    const country = getRouterParam(event, "country");
    const query = getQuery(event);
    const electionId = query.election as string | undefined;

    if (!country) {
      throw createError({
        statusCode: 400,
        statusMessage: "Le nom du pays est requis",
      });
    }

    try {
      const directus = getCmsClient();
      const countryName = decodeURIComponent(country);

      const electoralFileParam = query.electoral_file as string | undefined;
      const fileId = electoralFileParam
        ? parseInt(electoralFileParam)
        : await resolveElectoralFileId(
            electionId ? parseInt(electionId) : null,
            "diaspora"
          );

      const useLegacy = !fileId;
      if (useLegacy) {
        warnElectoralLegacyFallback("/api/elections/diaspora/country-stats", countryName);
      }

      const collection = useLegacy ? "election_map_diaspora" : "election_polling_stations";

      const filter: Record<string, unknown> = {
        country: { _eq: countryName },
      };
      if (useLegacy) {
        if (electionId) {
          filter.election = { _eq: parseInt(electionId) };
        }
      } else {
        filter.electoral_file = { _eq: fileId };
      }

      // Récupération des statistiques agrégées
      const statsData = await directus
        .request(
          aggregate(collection, {
            query: {
              filter,
              groupBy: ["country"],
            },
            aggregate: {
              count: ["office_number", "polling_place"],
              sum: ["voters"],
              countDistinct: ["locality", "polling_place"],
            },
          }),
        )
        .catch((error) => {
          console.error("Erreur Directus:", error);
          throw createError({
            statusCode: error.errors?.[0]?.extensions?.code || 500,
            message:
              error.errors?.[0]?.message || "Erreur interne du serveur",
          });
        });

      // Retourner les stats du pays (premier élément du tableau)
      return {
        data: statsData && statsData.length > 0 ? statsData[0] : null,
      };
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des stats du pays ${country}:`,
        error,
      );
      throw createError({
        statusCode: 500,
        statusMessage:
          "Une erreur est survenue lors de la récupération des statistiques",
      });
    }
  },
  {
    maxAge: 60 * 30, // 30 minutes de cache
    name: "diaspora-country-stats-v2",
    getKey: (event) => {
      const country = getRouterParam(event, "country");
      return buildCacheKey(`diaspora-stats-${country}`, getQuery(event));
    },
  },
);
