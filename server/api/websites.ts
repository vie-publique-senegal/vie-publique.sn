import { readItems } from '@directus/sdk';

/**
 * Annuaire des sites publics (page /annuaire-sites-publics-senegal).
 * Source : collection Directus `websites` (migrée depuis un CSV GitHub le 16/07/2026 —
 * QUAL-8, docs/audits/audit-complet-2026-07.md).
 */
export default defineCachedEventHandler(
  async () => {
    try {
      const directus = getCmsClient();

      const sites = await directus.request(
        readItems('websites', {
          fields: ['name', 'url', 'type'],
          filter: { status: { _eq: 'published' } },
          sort: ['name'],
          limit: -1,
        }),
      );

      return sites.map((site: { name: string; url: string; type: string }) => ({
        ...site,
        url: (site.url || '').replace(/\/+$/, ''),
      }));
    } catch (error) {
      reportServerError(error, 'api:websites');
      // Pas de donnée partielle possible (source unique) : erreur propre, non cachée.
      throw createError({
        statusCode: 503,
        statusMessage: 'Annuaire temporairement indisponible',
      });
    }
  },
  {
    name: 'websites-annuaire-v2', // v2 : bump après migration CSV → Directus (nouveau format)
    maxAge: getCacheMaxAge(CacheDuration.LONG), // 24 h : données quasi statiques
  },
);
