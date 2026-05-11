import { readItems } from "@directus/sdk";

/**
 * Retourne les valeurs disponibles pour les filtres
 * Route: GET /api/elections/pvs-upload/filters?election=xxx
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const electionId = query.election ? Number(query.election) : undefined;

  const directus = getCmsClient();

  try {
    // Filtres de base : source
    const baseFilter: any = { status: { _eq: "published" } };
    if (electionId) {
      baseFilter.election = { _eq: electionId };
    }

    // Récupérer toutes les PVs publiées avec les champs nécessaires
    const pvs = await directus.request(
      readItems("election_pvs", {
        fields: [
          "source",
          "region",
          "department",
          "municipality",
          "country",
          "diplomatic_representation",
          "locality",
        ],
        filter: baseFilter,
        limit: -1,
      })
    );

    // Construire les valeurs uniques pour chaque filtre
    const sources = [...new Set((pvs as any[]).map((p) => p.source))].filter(Boolean);
    // Filtres géographiques pour National
    const nationalPvs = (pvs as any[]).filter((p) => p.source === "national");
    const departments = [...new Set(nationalPvs.map((p) => p.department))].filter(Boolean).sort();
    const municipalitiesByDepartment = departments.reduce((acc: Record<string, string[]>, dept) => {
      const municipalities = [
        ...new Set(
          nationalPvs
            .filter((p) => p.department === dept)
            .map((p) => p.municipality)
            .filter(Boolean)
        ),
      ].sort();

      acc[dept] = municipalities;
      return acc;
    }, {});

    // Filtres géographiques pour Diaspora
    const diasporaPvs = (pvs as any[]).filter((p) => p.source === "diaspora");
    const countries = [...new Set(diasporaPvs.map((p) => p.country))].filter(Boolean).sort();
    const diplomaticRepresentations = [
      ...new Set(diasporaPvs.map((p) => p.diplomatic_representation)),
    ]
      .filter(Boolean)
      .sort();
    const localities = [...new Set(diasporaPvs.map((p) => p.locality))].filter(Boolean).sort();

    return {
      data: {
        sources,
        national: {
          departments,
          municipalitiesByDepartment,
        },
        diaspora: {
          countries,
          diplomaticRepresentations,
          localities,
        },
      },
    };
  } catch (err: any) {
    console.error("[pvs-upload] Erreur récupération filtres:", err);
    throw createError({
      statusCode: 500,
      message: "Erreur lors de la récupération des filtres",
    });
  }
});
