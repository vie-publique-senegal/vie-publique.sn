// server/api/elections/coalitions/[id].get.ts
import { readItem } from "@directus/sdk";

/**
 * Endpoint pour récupérer les détails d'une coalition
 * Route: /api/elections/coalitions/[id]
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const id = getRouterParam(event, "id");

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "ID de coalition manquant",
      });
    }

    try {
      const coalition = await directus.request(
        readItem("election_coalition", id, {
          fields: [
            "id",
            "logo",
            "list_order",
            "bulletin",
            "videos.date",
            "videos.url_youtube",
            ...ENTITY_IDENTITY_FIELDS.map((f) => `political_entity.${f}`),
          ],
        })
      );

      // Identité de la coalition via son entité politique (fallback legacy)
      return {
        data: mergeEntityIdentity(coalition as Record<string, unknown>),
      };
    } catch (error) {
      console.error(`Error fetching coalition ${id}:`, error);
      throw createError({
        statusCode: 500,
        statusMessage: "Erreur lors de la récupération de la coalition",
      });
    }
  },
  {
    maxAge: 60 * 60, // Cache de 1 heure
    name: "election-coalition",
    getKey: (event) => {
      const id = getRouterParam(event, "id");
      return `election-coalition-${id}`;
    },
  }
);
