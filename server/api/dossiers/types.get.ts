import { readItems } from '@directus/sdk';

/**
 * GET /api/dossiers/types
 * Retourne les types de dossiers DISPONIBLES (publiés) avec le nombre de dossiers.
 *
 * Permet à la page /dossiers de n'afficher que les filtres qui ont réellement
 * du contenu (pas de chip vide menant à « Aucun dossier »).
 */
export default defineCachedEventHandler(
  async () => {
    try {
      const directus = getCmsClient();

      const data = await directus.request(
        readItems('dossier', {
          fields: ['type'],
          filter: { status: { _eq: 'published' } },
          aggregate: { count: ['id'] },
          groupBy: ['type'],
        }),
      );

      const types = (data as any[])
        .filter((item) => item.type)
        .map((item) => ({
          type: item.type as string,
          count: Number(item.count?.id || 0),
        }))
        .sort((a, b) => b.count - a.count);

      return { types };
    } catch (error: any) {
      // Dégradation gracieuse : pas de filtres plutôt qu'une page cassée.
      console.warn('Erreur récupération types dossiers:', error?.message || error);
      return { types: [] as Array<{ type: string; count: number }> };
    }
  },
  {
    maxAge: getCacheMaxAge(CacheDuration.LONG, 0), // 24 h : référentiel quasi statique (préco P5, docs/guidelines/cache-strategy.md)
    name: 'dossiers-types',
    getKey: () => 'dossiers-types',
  },
);
