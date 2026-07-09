import { aggregate } from "@directus/sdk";

/**
 * Endpoint pour récupérer les statistiques des départements
 * GET /api/elections/map/department-stats?department=Dakar (optionnel)
 *
 * Source : election_polling_stations via le fichier électoral national publié
 * le plus récent. Fallback : election_map_national tant que la prod n'est pas
 * migrée.
 *
 * @returns Statistiques agrégées des départements
 */
export default defineCachedEventHandler(
  async (event) => {
    const query = getQuery(event);
    const department = query.department as string | undefined;

    try {
      const directus = getCmsClient();

      const fileId = await resolveElectoralFileId(null, "national");

      if (fileId) {
        const filter: Record<string, unknown> = { electoral_file: { _eq: fileId } };
        if (department) {
          filter.constituency = { name: { _eq: department } };
        }

        const statsData = (await directus.request(
          aggregate("election_polling_stations", {
            aggregate: {
              count: ["office_number"],
              sum: ["voters"],
              countDistinct: ["municipality", "polling_place"],
            },
            query: department
              ? { filter, groupBy: ["constituency"] }
              : { filter },
          })
        )) as {
          count?: Record<string, string>;
          sum?: Record<string, string>;
          countDistinct?: Record<string, string>;
        }[];

        if (department && statsData && statsData.length > 0) {
          const row = statsData[0];
          return {
            department,
            count: row.count,
            sum: row.sum,
            countDistinct: row.countDistinct,
          };
        }

        return {
          data: statsData || [],
        };
      }

      // Fallback legacy : election_map_national
      warnElectoralLegacyFallback("/api/elections/map/department-stats", department);

      interface AggregateParams {
        aggregate: {
          count: string[];
          sum: string[];
          countDistinct: string[];
        };
        query?: {
          filter: {
            department: {
              _eq: string;
            };
          };
          groupBy: string[];
        };
      }

      const aggregateParams: AggregateParams = {
        aggregate: {
          count: ["office_number"],
          sum: ["voters"],
          countDistinct: ["municipality", "polling_place"],
        },
      };

      if (department) {
        aggregateParams.query = {
          filter: {
            department: {
              _eq: department,
            },
          },
          groupBy: ["department"],
        };
      }

      const statsData = await directus
        .request(
          aggregate("election_map_national", aggregateParams),
        )
        .catch((error) => {
          console.error("Erreur Directus:", error);
          throw createError({
            statusCode: error.errors?.[0]?.extensions?.code || 500,
            message:
              error.errors?.[0]?.message || "Erreur interne du serveur",
          });
        });

      if (department && statsData && statsData.length > 0) {
        return statsData[0];
      }

      return {
        data: statsData || [],
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des stats:", error);
      throw createError({
        statusCode: 500,
        statusMessage:
          "Une erreur est survenue lors de la récupération des statistiques",
      });
    }
  },
  {
    maxAge: 60 * 30, // 30 minutes de cache
    name: "election-department-stats-v2",
    getKey: (event) => {
      const query = getQuery(event);
      const department = query.department as string | undefined;
      return department
        ? `department-stats-${department}`
        : "departments-stats-all";
    },
  },
);
