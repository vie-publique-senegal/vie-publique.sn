import { readItems } from "@directus/sdk";

/**
 * Liste des départements filtrés par région
 * Route: GET /api/elections/pvs-upload/departments
 * Query params: ?region=REGION_NAME (requis)
 *
 * Source : référentiel election_constituencies (départements enfants de la région).
 * Fallback : textes department de election_map_national tant que la prod n'est pas migrée.
 *
 * ⚠️ Renvoie le nom de la CIRCONSCRIPTION (graphie des fichiers électoraux), pas le nom
 * géographique : la valeur choisie est réinjectée à l'étape suivante de la cascade comme
 * filtre `constituency.name`. Une autre graphie casserait l'upload des procès-verbaux.
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const region = query.region as string;

    if (!region) {
      throw createError({
        statusCode: 400,
        message: "Le paramètre 'region' est requis",
      });
    }

    try {
      // La hiérarchie n'est pas traversable en filtre Directus (pas de relation inverse
      // sur geo_entity) : on résout d'abord les entités « département » de la région dans
      // l'instantané, puis on filtre les circonscriptions sur `geo_entity: { _in }`.
      const geoSnapshot = await getGeoSnapshot();
      const regionEntity = geoSnapshot
        .entitiesOfLevel("region")
        .find((entity) => entity.name === region);
      const departmentEntityIds = regionEntity
        ? geoSnapshot
            .descendantIds(regionEntity.id)
            .filter((id) => geoSnapshot.get(id)?.level === "departement")
        : [];

      const referentialDepartments =
        departmentEntityIds.length > 0
          ? ((await directus
              .request(
                readItems("election_constituencies", {
                  fields: ["name"],
                  filter: {
                    nationale_type: { _eq: "departement" },
                    status: { _neq: "archived" },
                    geo_entity: { _in: departmentEntityIds },
                  },
                  sort: ["name"],
                  limit: -1,
                })
              )
              .catch(() => [])) as { name: string }[])
          : [];

      if (referentialDepartments.length > 0) {
        return { data: referentialDepartments.map((d) => d.name).filter(Boolean) };
      }

      // Fallback legacy : textes department des bureaux election_map_national
      warnElectoralLegacyFallback("/api/elections/pvs-upload/departments", region);

      const data = await directus.request(
        readItems("election_map_national", {
          fields: ["department"],
          filter: {
            region: { _eq: region },
            department: { _nnull: true },
          },
          limit: -1,
        })
      );

      // Extraire les départements uniques et trier
      const departments = [...new Set((data as any[]).map((item) => item.department))]
        .filter(Boolean)
        .sort();

      return { data: departments };
    } catch (error: any) {
      console.error("[pvs-upload/departments] Erreur:", error);
      throw createError({
        statusCode: 500,
        message: "Erreur lors de la récupération des départements",
      });
    }
  },
  {
    maxAge: 300, // Cache 5 minutes
    name: "election-pvs-departments-v3",
    getKey: (event) => {
      const query = getQuery(event);
      return `departments-${query.region || "all"}`;
    },
  }
);
