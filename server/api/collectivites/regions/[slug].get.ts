/**
 * Page région : l'agrégat, ses départements, ses collectivités, et les autres
 * régions pour le maillage.
 *
 * La page liste les deux niveaux inférieurs — les départements (le pas suivant
 * naturel) et les communes (ce que cherche « communes de la région de … »).
 * Une région compte au plus 57 collectivités : tout tient dans le HTML indexé,
 * sans pagination.
 */
export default defineCachedEventHandler(
  async (event) => {
    const slug = getRouterParam(event, 'slug');
    if (!slug) {
      throw createError({ statusCode: 400, statusMessage: 'Slug manquant' });
    }

    const regions = await getRegionsGeo();
    const region = regions.find((r) => r.slug === slug);

    if (!region) {
      throw createError({ statusCode: 404, statusMessage: 'Région introuvable' });
    }

    const [departements, communes] = await Promise.all([getDepartementsGeo(), getCommunesGeo()]);

    return {
      region,
      departements: departements.filter((d) => d.regionSlug === slug),
      communes: communes
        .filter((c) => c.regionSlug === slug)
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
      autresRegions: regions.filter((r) => r.slug !== slug),
    };
  },
  {
    name: 'collectivites-region',
    maxAge: process.env.NODE_ENV === 'production' ? 30 * 60 : 0,
    getKey: (event) => getRouterParam(event, 'slug') || 'unknown',
  },
);
