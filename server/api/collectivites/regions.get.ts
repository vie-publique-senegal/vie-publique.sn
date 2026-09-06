/**
 * Hub des régions — les 14 régions agrégées depuis les collectivités de base.
 *
 * Niveau manquant de la chaîne région → département → commune : l'annuaire
 * filtrait par région en query param, sans page à indexer.
 *
 * Se sert de la même liste mise en cache que l'annuaire : aucune requête
 * Directus supplémentaire.
 */
export default defineCachedEventHandler(
  async () => {
    const regions = await getRegionsGeo();

    return {
      regions,
      total: regions.length,
      totalCollectivites: regions.reduce((sum, r) => sum + r.nbCollectivites, 0),
      totalDepartements: regions.reduce((sum, r) => sum + r.nbDepartements, 0),
    };
  },
  {
    name: 'collectivites-regions',
    maxAge: process.env.NODE_ENV === 'production' ? 30 * 60 : 0,
    getKey: () => 'all',
  },
);
