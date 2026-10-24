import type { MandateType, PositionCategory } from '~~/types/public-person';

/**
 * Normalise la catégorie relationnelle d'un mandat (`public_person_appointments.category`
 * → `public_position_categories`) telle que renvoyée par Directus.
 *
 * Retourne `null` si le mandat n'est pas rattaché (FK vide) ou si Directus n'a pas
 * développé la relation (id nu : droit de lecture manquant sur la collection cible —
 * cf. CLAUDE.md, piège permission). Le mandat est alors « non classé » : les champs
 * texte historiques `position_category` / `position_category_slug` ne sont plus lus.
 */
export function mapPositionCategory(raw: unknown): PositionCategory | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as { slug?: unknown; label?: unknown; mandate_type?: unknown };
  if (typeof c.slug !== 'string' || typeof c.label !== 'string') return null;
  const mandateType: MandateType | null =
    c.mandate_type === 'elected' || c.mandate_type === 'appointed' ? c.mandate_type : null;
  return { slug: c.slug, label: c.label, mandate_type: mandateType };
}
