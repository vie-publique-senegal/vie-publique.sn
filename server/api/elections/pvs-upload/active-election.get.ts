import { readItems } from "@directus/sdk";

/**
 * Retourne l'élection active (pv_upload_active = true), ou null si feature désactivé
 * Route: GET /api/elections/pvs-upload/active-election
 */
export default defineCachedEventHandler(
  async () => {
    const directus = getCmsClient();

    try {
      const elections = await directus.request(
        readItems("elections", {
          fields: ["id", "name", "year", "type", "slug"],
          filter: { pv_upload_active: { _eq: true } },
          limit: 1,
        })
      );

      const election = (elections as any[])[0] || null;

      return { data: election };
    } catch (error: any) {
      console.error("[active-election] Erreur:", error);
      throw createError({
        statusCode: 500,
        message: "Erreur lors de la récupération de l'élection active",
      });
    }
  },
  {
    maxAge: 60, // Cache 1 minute
    name: "election-active-election",
  }
);
