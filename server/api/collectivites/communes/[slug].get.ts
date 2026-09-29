/**
 * Fiche géo d'une collectivité, par slug public (cf. `buildPublicSlugs`).
 * S'appuie sur la même liste mise en cache que l'annuaire : pas de requête
 * Directus supplémentaire par fiche.
 */
export default defineCachedEventHandler(
  async (event) => {
    const slug = getRouterParam(event, 'slug');
    if (!slug) {
      throw createError({ statusCode: 400, statusMessage: 'Slug manquant' });
    }

    const communes = await getCommunesGeo();
    const commune = communes.find((c) => c.slug === slug);

    if (!commune) {
      throw createError({ statusCode: 404, statusMessage: 'Commune introuvable' });
    }

    return { commune };
  },
  {
    name: 'collectivites-commune-v4',
    maxAge: process.env.NODE_ENV === 'production' ? 30 * 60 : 0,
    getKey: (event) => getRouterParam(event, 'slug') || 'unknown',
  },
);
