import { readItems } from '@directus/sdk';
import type { PositionCategoryInfo } from '#shared/personnalites-categories';

type CategoryRow = Partial<PositionCategoryInfo> & { slug?: string | null; label?: string | null };

/** Champs éditoriaux : lus à part, pour qu'un champ absent du schéma n'empêche rien d'afficher */
const EDITORIAL_FIELDS = [
  'label_plural',
  'role_description',
  'seo_title',
  'seo_description',
] as const;

const nonEmpty = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

/**
 * Catégories de fonction publiées (`public_position_categories`), dans l'ordre `sort` du
 * référentiel : une sous-page `/personnalites-senegal/<slug>` par catégorie. La base fait foi.
 *
 * Deux requêtes isolées : les champs de base (slug, label) sont requis — leur échec remonte ;
 * les champs éditoriaux sont optionnels — un échec (champ pas encore créé, droit manquant)
 * les laisse à `null` sans empêcher la page de s'afficher.
 */
export const getPositionCategories = defineCachedFunction(
  async (): Promise<PositionCategoryInfo[]> => {
    const directus = getCmsClient();
    const query = { filter: { status: { _eq: 'published' } }, sort: ['sort', 'label'], limit: -1 };

    const base = (await directus.request(
      readItems('public_position_categories', { ...query, fields: ['slug', 'label'] }),
    )) as CategoryRow[];

    let editorial = new Map<string, CategoryRow>();
    try {
      const rows = (await directus.request(
        readItems('public_position_categories', {
          ...query,
          fields: ['slug', ...EDITORIAL_FIELDS],
        }),
      )) as CategoryRow[];
      editorial = new Map(rows.map((row) => [row.slug as string, row]));
    } catch (error) {
      reportServerError(error, 'position-categories/editorial');
    }

    return base
      .filter((row): row is CategoryRow & { slug: string; label: string } =>
        Boolean(row.slug && row.label),
      )
      .map((row) => {
        const extra = editorial.get(row.slug);
        return {
          slug: row.slug,
          label: row.label,
          label_plural: nonEmpty(extra?.label_plural),
          role_description: nonEmpty(extra?.role_description),
          seo_title: nonEmpty(extra?.seo_title),
          seo_description: nonEmpty(extra?.seo_description),
        };
      });
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 60 * 60 : 0,
    name: 'position-categories-v1',
    getKey: () => 'all',
  },
);
