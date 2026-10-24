// server/api/elections/coalitions/index.get.ts
import { readItems } from "@directus/sdk";

/**
 * Endpoint pour récupérer la liste des coalitions
 * Route: /api/elections/coalitions
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const ranking = query.ranking === "true";

    try {
      // name/acronym/type/description vivent sur l'entité politique (champs coalition supprimés)
      const fields: any[] = ["id", "logo", "list_order",
        "bulletin",
        // L'identité de la tête de liste vient de sa person
        ...PERSON_IDENTITY_FIELDS.map((f) => `head_of_list.person.${f}`),
        ...ENTITY_IDENTITY_FIELDS.map((f) => `political_entity.${f}`),];

      if (ranking) {
        fields.push("voix", "pourcentage", "sieges",
          "sieges_departement");
      }

      const coalitions = await directus.request(
        readItems("election_coalition", {
          fields,
          filter: {
            status: { _eq: "published" },
          },
          sort: ["list_order"],
        })
      );

      // Identité de la tête de liste via sa person (fallback legacy)
      // Identité de la coalition via son entité politique (fallback legacy)
      return {
        data: (coalitions as any[]).map((c: any) => ({
          ...mergeEntityIdentity(c),
          head_of_list: c.head_of_list ? mergePersonIdentity(c.head_of_list) : c.head_of_list,
        })),
      };
    } catch (error) {
      console.error("Error fetching coalitions:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Erreur lors de la récupération des coalitions",
      });
    }
  },
  {
    maxAge: 60 * 60, // Cache de 1 heure
    name: "elections-coalitions",
  }
);
