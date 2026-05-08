import { readItems } from "@directus/sdk";

/**
 * Liste des lieux de vote pour une commune donnée
 * Route: GET /api/elections/pvs-upload/polling-places?municipality=xxx
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const municipality = query.municipality as string | undefined;

  if (!municipality) {
    throw createError({
      statusCode: 400,
      message: "Le paramètre municipality est requis",
    });
  }

  const directus = getCmsClient();

  try {
    const places = await directus.request(
      readItems("election_map_national", {
        fields: ["polling_place"],
        filter: {
          municipality: { _eq: municipality },
          polling_place: { _nnull: true },
        },
        sort: ["polling_place"],
      })
    );

    // Retourner uniquement les valeurs uniques de polling_place
    const uniquePlaces = [
      ...new Set((places as any[]).map((p) => p.polling_place).filter(Boolean)),
    ];

    return {
      data: uniquePlaces,
    };
  } catch (err: any) {
    console.error("[pvs-upload] Erreur récupération lieux de vote:", err);
    throw createError({
      statusCode: 500,
      message: "Erreur lors de la récupération des lieux de vote",
    });
  }
});
