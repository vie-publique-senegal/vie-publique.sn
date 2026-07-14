/**
 * Lecture de l'identité géographique des circonscriptions via le référentiel
 * geo_regions / geo_departments / geo_municipalities, avec fallback legacy.
 *
 * Une circonscription (election_constituencies) référence le référentiel par un seul
 * des trois FK geo_region / geo_department / geo_municipality selon son niveau.
 * Les lignes purement électorales (8 zones diaspora + « Territoire National ») n'ont
 * aucun FK geo et gardent leurs champs legacy en dur : le repli legacy est permanent
 * pour elles, pas seulement transitoire.
 *
 * Contrairement aux identités persons/entités politiques, le référentiel est
 * hiérarchique : la résolution renvoie aussi le niveau parent et la région de
 * rattachement (creusée jusqu'en haut, même pour une commune).
 */

/** Champs à demander sur une circonscription pour résoudre son unité géographique. */
export const GEO_UNIT_FIELDS = [
  'geo_region.id',
  'geo_region.name',
  'geo_region.slug',
  'geo_region.code',
  'geo_region.population',
  'geo_department.id',
  'geo_department.name',
  'geo_department.slug',
  'geo_department.code',
  'geo_department.population',
  'geo_department.region.name',
  'geo_department.region.slug',
  'geo_municipality.id',
  'geo_municipality.name',
  'geo_municipality.slug',
  'geo_municipality.code',
  'geo_municipality.population',
  'geo_municipality.department.name',
  'geo_municipality.department.slug',
  'geo_municipality.department.region.name',
  'geo_municipality.department.region.slug',
];

export interface GeoUnitRef {
  name: string;
  slug: string | null;
}

export interface ResolvedGeoUnit {
  name: string;
  slug: string | null;
  code: string | null;
  population: number | null;
  /** Niveau immédiatement supérieur : région pour un département, département pour une commune ; null pour une région et les lignes legacy sans parent */
  parent: GeoUnitRef | null;
  /** Région de rattachement, creusée jusqu'en haut même pour une commune (via son département) */
  region: GeoUnitRef | null;
  source: 'geo_region' | 'geo_department' | 'geo_municipality' | 'legacy';
}

type Row = Record<string, unknown>;

const asObject = (value: unknown): Row | null =>
  value && typeof value === 'object' ? (value as Row) : null;

const asRef = (value: unknown): GeoUnitRef | null => {
  const row = asObject(value);
  if (!row || typeof row.name !== 'string') return null;
  return { name: row.name, slug: (row.slug as string | null) ?? null };
};

const identityOf = (row: Row) => ({
  name: (row.name as string) ?? '',
  slug: (row.slug as string | null) ?? null,
  code: (row.code as string | null) ?? null,
  population: (row.population as number | null) ?? null,
});

/**
 * Résout l'identité géographique d'une circonscription : geo_region, puis
 * geo_department, puis geo_municipality ; repli sur les champs legacy de la ligne
 * (diaspora / Territoire National, ou environnement non backfillé).
 */
export function resolveGeoUnit(constituency: Row | null | undefined): ResolvedGeoUnit | null {
  if (!constituency || typeof constituency !== 'object') return null;

  const region = asObject(constituency.geo_region);
  if (region) {
    return { ...identityOf(region), parent: null, region: null, source: 'geo_region' };
  }

  const department = asObject(constituency.geo_department);
  if (department) {
    const parentRegion = asRef(department.region);
    return { ...identityOf(department), parent: parentRegion, region: parentRegion, source: 'geo_department' };
  }

  const municipality = asObject(constituency.geo_municipality);
  if (municipality) {
    const parentDepartment = asRef(municipality.department);
    const parentRegion = asRef(asObject(municipality.department)?.region);
    return { ...identityOf(municipality), parent: parentDepartment, region: parentRegion, source: 'geo_municipality' };
  }

  // Repli legacy : champs portés en dur par election_constituencies. Le parent
  // self-FK legacy est utilisé s'il a été demandé (cas d'un environnement où le
  // référentiel geo n'est pas encore backfillé) ; region est le texte libre legacy.
  const legacyParent = asRef(constituency.parent);
  const legacyRegionText =
    (constituency.region as string | null) ?? (asObject(constituency.parent)?.region as string | null) ?? null;
  return {
    ...identityOf(constituency),
    parent: legacyParent,
    region: legacyRegionText ? { name: legacyRegionText, slug: null } : null,
    source: 'legacy',
  };
}
