/**
 * Lecture de l'identité géographique des circonscriptions via le référentiel versionné
 * geo_entity / geo_entity_version / geo_demographic_observation, avec fallback legacy.
 *
 * Une circonscription (election_constituencies) référence le référentiel par la seule FK
 * `geo_entity` (599 lignes sur 608 : 46 départements + 553 communes). La hiérarchie et la
 * population ne sont PAS lisibles par expansion Directus : elles viennent de l'instantané
 * (`getGeoSnapshot()`), passé en second argument.
 *
 * ⚠️ Le parent d'une commune est le PREMIER ANCÊTRE DE NIVEAU `departement`, jamais son
 * parent immédiat : celui-ci est un ARRONDISSEMENT pour 497 communes sur 553. Idem pour la
 * région, premier ancêtre de niveau `region`. Arrondissements et villes ne sont exposés
 * dans aucune réponse d'API.
 *
 * Les lignes purement électorales (8 zones diaspora + « Territoire National ») n'ont pas de
 * contrepartie géographique et gardent leurs champs legacy en dur : le repli legacy est
 * PERMANENT pour elles. Il est aussi ce qui fait fonctionner le code là où le référentiel
 * n'est pas déployé (production) — ne jamais le supprimer ni le transformer en erreur.
 */

import type { GeoEntity, GeoSnapshot } from './geoSnapshot';

/** Champs à demander sur une circonscription pour résoudre son unité géographique. */
export const GEO_UNIT_FIELDS = ['geo_entity'];

export interface GeoUnitRef {
  name: string;
  /** Slug dérivé du nom (« bambey ») — contrat historique, sert à l'affichage et aux liens */
  slug: string | null;
  /** Slug du référentiel (« departement-bambey ») — clé de jointure des contours ; null hors référentiel */
  geo_slug: string | null;
}

export interface ResolvedGeoUnit {
  name: string;
  slug: string | null;
  population: number | null;
  /** Niveau immédiatement supérieur EXPOSÉ : région pour un département, département pour une commune ; null pour une région et les lignes legacy sans parent */
  parent: GeoUnitRef | null;
  /** Région de rattachement, creusée jusqu'en haut même pour une commune */
  region: GeoUnitRef | null;
  source: 'geo_entity' | 'legacy';
}

type Row = Record<string, unknown>;

const asObject = (value: unknown): Row | null =>
  value && typeof value === 'object' ? (value as Row) : null;

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s'-]+/g, ' ')
    .trim()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/ +/g, '-');

const asRef = (value: unknown): GeoUnitRef | null => {
  const row = asObject(value);
  if (!row || typeof row.name !== 'string') return null;
  const slug = typeof row.slug === 'string' ? row.slug : slugify(row.name);
  return { name: row.name, slug, geo_slug: null };
};

/**
 * Référence exposée d'une entité du référentiel. `slug` reste DÉRIVÉ DU NOM (contrat
 * historique de `parent`/`region` : « kedougou »), et `geo_slug` porte à côté le slug du
 * référentiel (« region-kedougou ») — c'est lui qui joint les contours et pilote le
 * drill-down départements → communes de la carte des résultats locaux.
 */
const refOfEntity = (entity: GeoEntity | null): GeoUnitRef | null =>
  entity ? { name: entity.name, slug: slugify(entity.name), geo_slug: entity.slug } : null;

const identityOf = (row: Row) => ({
  name: (row.name as string) ?? '',
  slug: (row.slug as string | null) ?? null,
  population: (row.population as number | null) ?? null,
});

/** Identifiant de l'entité géographique portée par une circonscription (FK brute ou expansée). */
export function geoEntityIdOf(constituency: Row | null | undefined): number | null {
  const raw = constituency?.geo_entity;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && !isNaN(Number(raw))) return Number(raw);
  const expanded = asObject(raw);
  return typeof expanded?.id === 'number' ? expanded.id : null;
}

/**
 * Résout l'identité géographique d'une circonscription via l'instantané du référentiel ;
 * repli sur les champs legacy de la ligne (diaspora / Territoire National, ou environnement
 * où le référentiel n'est pas déployé).
 */
export function resolveGeoUnit(
  constituency: Row | null | undefined,
  snapshot: GeoSnapshot | null | undefined,
): ResolvedGeoUnit | null {
  if (!constituency || typeof constituency !== 'object') return null;

  const entity = snapshot?.get(geoEntityIdOf(constituency)) ?? null;
  if (entity) {
    // Un département remonte à sa région ; une commune (comme tout niveau infra) remonte à
    // son département puis à sa région, en SAUTANT l'arrondissement.
    const regionRef =
      entity.level === 'region'
        ? null
        : refOfEntity(snapshot?.ancestorOfLevel(entity.id, 'region') ?? null);
    const parentRef =
      entity.level === 'region'
        ? null
        : entity.level === 'departement'
          ? regionRef
          : refOfEntity(snapshot?.ancestorOfLevel(entity.id, 'departement') ?? null);

    return {
      name: entity.name,
      slug: entity.slug,
      population: snapshot?.population(entity.id) ?? null,
      parent: parentRef,
      region: regionRef,
      source: 'geo_entity',
    };
  }

  // Repli legacy : champs portés en dur par election_constituencies. Le parent self-FK
  // legacy et le texte region ne sont lus que s'ils ont été demandés par l'appelant.
  const legacyParent = asRef(constituency.parent);
  const legacyRegionText =
    (constituency.region as string | null) ??
    (asObject(constituency.parent)?.region as string | null) ??
    null;
  return {
    ...identityOf(constituency),
    parent: legacyParent,
    region: legacyRegionText ? { name: legacyRegionText, slug: null, geo_slug: null } : null,
    source: 'legacy',
  };
}

/**
 * Slug du référentiel géographique, destiné à la jointure des contours (`geo_slug` des
 * payloads de carte). Null pour les lignes sans contrepartie géographique : le slug legacy
 * de la circonscription ne doit jamais être exposé sous cette clé.
 */
export function geoSlugOf(resolved: ResolvedGeoUnit | null | undefined): string | null {
  return resolved?.source === 'geo_entity' ? (resolved.slug ?? null) : null;
}
