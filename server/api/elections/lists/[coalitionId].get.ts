// server/api/elections/lists/[coalitionId].get.ts
import { readItems } from "@directus/sdk";

/**
 * Endpoint pour récupérer les listes électorales d'une coalition
 * Route: /api/elections/lists/[coalitionId]
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const coalitionId = getRouterParam(event, "coalitionId");

    if (!coalitionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "ID de coalition manquant",
      });
    }

    try {
      const lists = await directus.request(
        readItems("election_electoral_lists", {
          fields: [
            "name",
            "type",
            "is_substitute",
            // L'identité vient de la person ; seuls les champs propres à la candidature restent
            "candidates.profession",
            "candidates.position",
            "candidates.voter_number",
            ...PERSON_IDENTITY_FIELDS.map((f) => `candidates.person.${f}`),
            "constituency.name",
          ],
          filter: {
            coalition: { _eq: coalitionId },
          },
          limit: 400,
        })
      );

      // Identité des candidats via leur person ; `biography` reste servie (compat)
      return {
        data: (lists as any[]).map((list: any) => ({
          ...list,
          candidates: Array.isArray(list?.candidates)
            ? list.candidates.map((c: Record<string, unknown>) => {
                const merged = mergePersonIdentity(c);
                return { ...merged, biography: merged.short_bio ?? null };
              })
            : list?.candidates,
        })),
      };
    } catch (error) {
      console.error(`Error fetching electoral lists for coalition ${coalitionId}:`, error);
      throw createError({
        statusCode: 500,
        statusMessage: "Erreur lors de la récupération des listes électorales",
      });
    }
  },
  {
    maxAge: 60 * 60, // Cache de 1 heure
    name: "election-lists",
    getKey: (event) => {
      const coalitionId = getRouterParam(event, "coalitionId");
      return `election-lists-${coalitionId}`;
    },
  }
);
