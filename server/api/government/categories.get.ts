import { readItems } from '@directus/sdk';
import type { GovernmentCategory } from '~~/types/government';

/**
 * API : liste dynamique des rôles (catégories de fonction) d'un membre de gouvernement.
 * Lit le référentiel `public_position_categories` (publiées, dans l'ordre `sort` défini
 * au CMS) pour alimenter les menus de filtre sans liste codée en dur.
 * Remplace la lecture des choix du dropdown `position_category_slug` (G19).
 */
export default defineCachedEventHandler(
  async () => {
    try {
      const directus = getCmsClient();

      const rows = await directus.request(
        readItems('public_position_categories', {
          fields: ['slug', 'label'],
          filter: { status: { _eq: 'published' } },
          sort: ['sort'],
          limit: -1,
        }),
      );

      const categories: GovernmentCategory[] = (rows as Array<{ slug: string; label: string }>)
        .filter((c) => c.slug && c.label)
        .map((c) => ({ slug: c.slug, label: c.label }));

      return { categories };
    } catch (error) {
      reportServerError(error, 'government/categories');
      // Dégradation gracieuse : liste vide plutôt qu'une erreur bloquante.
      return { categories: [] as GovernmentCategory[] };
    }
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 24 * 60 * 60 : 0, // 24h en prod
    name: 'government-categories-v2',
  },
);
