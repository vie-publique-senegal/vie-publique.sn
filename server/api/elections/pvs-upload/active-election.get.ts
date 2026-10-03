import { readItems } from "@directus/sdk";

/**
 * Retourne l'élection active (pv_upload_active = true), ou null si feature désactivé
 * Route: GET /api/elections/pvs-upload/active-election
 */
export default defineEventHandler(async () => {
  const directus = getCmsClient();

  try {
    // Pas de cache pour éviter des incohérences d'affichage du sélecteur de tour.
    // On trie aussi pour un résultat déterministe si plusieurs élections sont actives.
    const elections = await directus.request(
      readItems("elections", {
        fields: ["id", "name", "year", "type", "slug", "rounds"],
        filter: { pv_upload_active: { _eq: true } },
        sort: ["-year", "-id"],
        limit: 2,
      })
    );

    const rows = elections as any[];
    if (rows.length > 1) {
      console.warn(
        "[active-election] Plusieurs élections actives détectées, utilisation de la plus récente.",
        rows.map((e) => ({ id: e.id, name: e.name, year: e.year, rounds: e.rounds }))
      );
    }

    const election = rows[0] || null;

    return { data: election };
  } catch (error: any) {
    console.error("[active-election] Erreur:", error);
    throw createError({
      statusCode: 500,
      message: "Erreur lors de la récupération de l'élection active",
    });
  }
});
