/**
 * Sous-pages de l'annuaire des personnalités, une par catégorie de fonction
 * (`/personnalites-senegal/<slug>`). La base fait foi : toute catégorie publiée de
 * `public_position_categories` a sa page, sans changement de code. Le segment d'URL est
 * le slug Directus, underscores → tirets (convention d'URL) : `directeur_general` ↔
 * `directeur-general`. Les slugs Directus sont en snake_case, la conversion est réversible.
 */

/** Champs de `public_position_categories` exposés au site */
export interface PositionCategoryInfo {
  slug: string;
  label: string;
  /** Libellé au pluriel (titre de la page) */
  label_plural: string | null;
  /** Rôle et attributions (HTML rédigé au CMS) */
  role_description: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

/** Slug Directus → segment d'URL */
export const toCategoryUrlSlug = (slug: string): string => slug.replace(/_/g, '-');

/** Segment d'URL → slug Directus (`null` si le segment n'a pas la forme attendue) */
export const fromCategoryUrlSlug = (urlSlug: unknown): string | null =>
  typeof urlSlug === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(urlSlug)
    ? urlSlug.replace(/-/g, '_')
    : null;

/** Chemin de la sous-page d'une catégorie Directus, ou `null` sans catégorie */
export const getPersonCategoryPath = (slug: string | null | undefined): string | null =>
  slug ? `/personnalites-senegal/${toCategoryUrlSlug(slug)}` : null;
