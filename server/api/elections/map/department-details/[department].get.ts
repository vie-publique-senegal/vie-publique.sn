import { readItems } from "@directus/sdk";
import type { PollingStation } from "~~/types/election-map-national";

/**
 * Endpoint pour récupérer les détails d'un département (bureaux de vote)
 * GET /api/elections/map/department-details/:department
 *
 * Source : election_polling_stations via le fichier électoral national publié
 * le plus récent. Fallback : election_map_national tant que la prod n'est pas
 * migrée.
 *
 * @returns Liste des bureaux de vote du département
 */
export default defineCachedEventHandler(
  async (event) => {
    const department = getRouterParam(event, "department");

    if (!department) {
      throw createError({
        statusCode: 400,
        statusMessage: "Le nom du département est requis",
      });
    }

    try {
      const directus = getCmsClient();
      const departmentName = decodeURIComponent(department);

      const fileId = await resolveElectoralFileId(null, "national");

      if (fileId) {
        const [stations, geoSnapshot] = await Promise.all([
          directus.request(
            readItems("election_polling_stations", {
              fields: [
                "id",
                "municipality",
                "implantation",
                "polling_place",
                "office_number",
                "voters",
                "constituency.name",
                ...GEO_UNIT_FIELDS.map((f) => `constituency.${f}`),
              ],
              filter: {
                electoral_file: { _eq: fileId },
                constituency: { name: { _eq: departmentName } },
              },
              sort: ["municipality", "polling_place", "office_number"],
              limit: -1,
            })
          ) as Promise<{
            id: number;
            municipality: string | null;
            implantation: string | null;
            polling_place: string;
            office_number: string;
            voters: number | null;
            constituency?: ({ name?: string } & Record<string, unknown>) | null;
          }[]>,
          getGeoSnapshot(),
        ]);

        const pollingStations = stations.map((station) => ({
          id: station.id,
          department: station.constituency?.name || departmentName,
          region: resolveGeoUnit(station.constituency, geoSnapshot)?.region?.name || null,
          municipality: station.municipality,
          implantation: station.implantation,
          polling_place: station.polling_place,
          office_number: station.office_number,
          voters: station.voters,
        }));

        return {
          data: pollingStations as PollingStation[],
          total: pollingStations.length,
        };
      }

      // Fallback legacy : election_map_national
      warnElectoralLegacyFallback("/api/elections/map/department-details", departmentName);

      const pollingStations = await directus
        .request(
          readItems("election_map_national", {
            filter: {
              department: {
                _eq: departmentName,
              },
            },
            sort: ["municipality", "polling_place", "office_number"],
            limit: -1, // Récupérer tous les bureaux
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

      return {
        data: pollingStations as PollingStation[],
        total: pollingStations.length,
      };
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des détails du département ${department}:`,
        error,
      );
      throw createError({
        statusCode: 500,
        statusMessage:
          "Une erreur est survenue lors de la récupération des détails du département",
      });
    }
  },
  {
    maxAge: 60 * 30, // 30 minutes de cache
    name: "election-department-details-v3",
    getKey: (event) => {
      const department = getRouterParam(event, "department");
      return `department-details-${department}`;
    },
  },
);
