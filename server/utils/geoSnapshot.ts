import { readItems } from '@directus/sdk';
import { normalizeGeoName } from '#shared/geo-name';

/**
 * Instantané du référentiel géographique versionné (geo_entity / geo_entity_version /
 * geo_demographic_observation).
 *
 * `geo_entity` n'expose aucune relation inverse : impossible de traverser depuis une
 * circonscription jusqu'à la hiérarchie en une seule requête Directus. On charge donc
 * le référentiel entier (745 entités, ~1500 lignes au total) une fois, en cache, et on
 * répond ensuite en mémoire.
 *
 * ⚠️ La hiérarchie est portée par `geo_entity_version.parent` (PAS par `geo_entity`) :
 * seule la version en vigueur (`valid_to` nul) est chargée.
 *
 * ⚠️ La chaîne ascendante compte un niveau de plus que l'ancien référentiel plat : le
 * parent immédiat d'une commune est le plus souvent son ARRONDISSEMENT (497 communes
 * sur 553), pas son département. Les appelants doivent donc demander un ancêtre par son
 * NIVEAU (`ancestorOfLevel(id, 'departement')`) et jamais le parent immédiat.
 *
 * Dégradation : toute lecture en échec (CMS injoignable, collections absentes — c'est le
 * cas en production tant que le référentiel n'est pas déployé) produit un instantané
 * VIDE, jamais une erreur. Les appelants retombent alors sur leur repli legacy.
 */

export type GeoLevel = 'region' | 'departement' | 'arrondissement' | 'commune' | 'ville';

export interface GeoEntity {
  id: number;
  /** Slug du référentiel, ex. « departement-bambey » (≠ slug de circonscription) */
  slug: string | null;
  level: GeoLevel;
  /** Nom en vigueur (`name_current`), graphie du Journal officiel */
  name: string;
}

/** Forme sérialisable mise en cache par Nitro (pas de Map ni de fonction). */
interface GeoSnapshotData {
  entities: GeoEntity[];
  /** [id d'entité, id du parent immédiat] d'après la version en vigueur */
  parents: [number, number | null][];
  /** [id d'entité, population observée] — niveau commune uniquement */
  populations: [number, number][];
}

/** Garde-fou anti-boucle sur une hiérarchie de 5 niveaux (région → ville/arrondissement → commune). */
const MAX_CHAIN_DEPTH = 12;

const EMPTY_DATA: GeoSnapshotData = { entities: [], parents: [], populations: [] };

export class GeoSnapshot {
  private readonly byId = new Map<number, GeoEntity>();
  private readonly parentOf = new Map<number, number | null>();
  private readonly childrenOf = new Map<number, number[]>();
  private readonly observedPopulation = new Map<number, number>();
  private readonly populationCache = new Map<number, number | null>();

  constructor(data: GeoSnapshotData) {
    for (const entity of data.entities) this.byId.set(entity.id, entity);
    for (const [id, parent] of data.parents) {
      this.parentOf.set(id, parent);
      if (parent === null) continue;
      const siblings = this.childrenOf.get(parent);
      if (siblings) siblings.push(id);
      else this.childrenOf.set(parent, [id]);
    }
    for (const [id, population] of data.populations) this.observedPopulation.set(id, population);
  }

  /** Vrai quand le référentiel n'a pas pu être chargé (les appelants doivent replier sur le legacy). */
  get isEmpty(): boolean {
    return this.byId.size === 0;
  }

  /** Identité d'une entité par son identifiant. */
  get(id: number | null | undefined): GeoEntity | null {
    return typeof id === 'number' ? (this.byId.get(id) ?? null) : null;
  }

  /** Chaîne ascendante : l'entité elle-même, puis ses ancêtres jusqu'à la région. */
  chain(id: number | null | undefined): GeoEntity[] {
    const out: GeoEntity[] = [];
    let current = this.get(id);
    const seen = new Set<number>();
    while (current && !seen.has(current.id) && out.length < MAX_CHAIN_DEPTH) {
      seen.add(current.id);
      out.push(current);
      current = this.get(this.parentOf.get(current.id) ?? null);
    }
    return out;
  }

  /**
   * Premier ANCÊTRE du niveau demandé (l'entité elle-même est exclue).
   *
   * C'est la seule façon correcte de remonter d'une commune à son département : son
   * parent immédiat est généralement un arrondissement.
   */
  ancestorOfLevel(id: number | null | undefined, level: GeoLevel): GeoEntity | null {
    return (
      this.chain(id)
        .slice(1)
        .find((entity) => entity.level === level) ?? null
    );
  }

  /** Toutes les entités d'un niveau donné, triées par nom. */
  entitiesOfLevel(level: GeoLevel): GeoEntity[] {
    return [...this.byId.values()]
      .filter((entity) => entity.level === level)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  /**
   * Entité d'un niveau donné par son NOM, comparé de façon normalisée (casse, accents,
   * ponctuation). Indispensable parce que les valeurs reçues circulent dans les deux
   * graphies : celle du référentiel (« Kédougou ») et celle, historique, des fichiers
   * électoraux (« KEDOUGOU »).
   */
  findByName(level: GeoLevel, name: string | null | undefined): GeoEntity | null {
    const key = normalizeGeoName(name);
    if (!key) return null;
    return (
      [...this.byId.values()].find(
        (entity) => entity.level === level && normalizeGeoName(entity.name) === key,
      ) ?? null
    );
  }

  /** Identifiants de tous les descendants d'une entité (l'entité elle-même exclue). */
  descendantIds(id: number | null | undefined): number[] {
    if (typeof id !== 'number') return [];
    const out: number[] = [];
    const stack = [...(this.childrenOf.get(id) ?? [])];
    const seen = new Set<number>();
    while (stack.length > 0) {
      const current = stack.pop() as number;
      if (seen.has(current)) continue;
      seen.add(current);
      out.push(current);
      stack.push(...(this.childrenOf.get(current) ?? []));
    }
    return out;
  }

  /**
   * Population d'une entité : observation directe pour une commune, SOMME des
   * observations des communes descendantes pour tout niveau supérieur.
   * `null` quand aucune commune concernée n'est observée (jamais 0 par défaut).
   */
  population(id: number | null | undefined): number | null {
    if (typeof id !== 'number') return null;
    const cached = this.populationCache.get(id);
    if (cached !== undefined) return cached;

    let total: number | null = this.observedPopulation.get(id) ?? null;
    if (this.get(id)?.level !== 'commune') {
      for (const descendantId of this.descendantIds(id)) {
        const observed = this.observedPopulation.get(descendantId);
        if (observed === undefined) continue;
        total = (total ?? 0) + observed;
      }
    }

    this.populationCache.set(id, total);
    return total;
  }
}

interface EntityRow {
  id: number;
  slug: string | null;
  level: string | null;
  name_current: string | null;
}

interface VersionRow {
  entity: number | null;
  parent: number | null;
}

interface ObservationRow {
  entity: number | null;
  population: number | null;
  year: number | null;
}

const GEO_LEVELS: GeoLevel[] = ['region', 'departement', 'arrondissement', 'commune', 'ville'];

const isGeoLevel = (value: string | null): value is GeoLevel =>
  value !== null && (GEO_LEVELS as string[]).includes(value);

/**
 * Charge les 3 collections du référentiel. Chaque lecture est isolée : un échec
 * n'invalide que sa propre donnée (voir la dégradation décrite en tête de fichier).
 */
const fetchGeoSnapshotData = defineCachedFunction(
  async (): Promise<GeoSnapshotData> => {
    const cmsClient = getCmsClient();

    const [entityRows, versionRows, observationRows] = await Promise.all([
      cmsClient
        .request(
          readItems('geo_entity', {
            fields: ['id', 'slug', 'level', 'name_current'],
            limit: -1,
            sort: ['id'],
          }),
        )
        .catch((error: unknown) => {
          reportServerError(error, 'utils/geoSnapshot', { collection: 'geo_entity' });
          return [] as EntityRow[];
        }) as Promise<EntityRow[]>,
      cmsClient
        .request(
          readItems('geo_entity_version', {
            fields: ['entity', 'parent'],
            // Version en vigueur : celle qui n'a pas encore été fermée
            filter: { valid_to: { _null: true } },
            limit: -1,
            sort: ['id'],
          }),
        )
        .catch((error: unknown) => {
          reportServerError(error, 'utils/geoSnapshot', { collection: 'geo_entity_version' });
          return [] as VersionRow[];
        }) as Promise<VersionRow[]>,
      cmsClient
        .request(
          readItems('geo_demographic_observation', {
            fields: ['entity', 'population', 'year'],
            limit: -1,
            sort: ['id'],
          }),
        )
        .catch((error: unknown) => {
          reportServerError(error, 'utils/geoSnapshot', {
            collection: 'geo_demographic_observation',
          });
          return [] as ObservationRow[];
        }) as Promise<ObservationRow[]>,
    ]);

    if (entityRows.length === 0) return EMPTY_DATA;

    const entities: GeoEntity[] = [];
    for (const row of entityRows) {
      if (typeof row.id !== 'number' || !isGeoLevel(row.level)) continue;
      entities.push({
        id: row.id,
        slug: row.slug ?? null,
        level: row.level,
        name: row.name_current ?? '',
      });
    }

    const parents: [number, number | null][] = [];
    for (const row of versionRows) {
      if (typeof row.entity !== 'number') continue;
      parents.push([row.entity, typeof row.parent === 'number' ? row.parent : null]);
    }

    // Une seule observation par entité aujourd'hui (recensement 2023) ; en cas de
    // millésimes multiples, le plus récent gagne.
    const populationByEntity = new Map<number, { population: number; year: number }>();
    for (const row of observationRows) {
      if (typeof row.entity !== 'number' || typeof row.population !== 'number') continue;
      const year = typeof row.year === 'number' ? row.year : 0;
      const previous = populationByEntity.get(row.entity);
      if (!previous || year >= previous.year) {
        populationByEntity.set(row.entity, { population: row.population, year });
      }
    }

    return {
      entities,
      parents,
      populations: [...populationByEntity.entries()].map(([id, { population }]) => [
        id,
        population,
      ]),
    };
  },
  {
    maxAge: getCacheMaxAge(60 * 60, 30),
    name: 'geo-snapshot-v1',
    getKey: () => 'geo-snapshot',
  },
);

let memoized: { data: GeoSnapshotData; snapshot: GeoSnapshot } | null = null;

/**
 * Instantané prêt à interroger. Ne lève jamais : en cas d'échec de lecture, renvoie un
 * instantané vide et les appelants gardent leur comportement legacy.
 */
export async function getGeoSnapshot(): Promise<GeoSnapshot> {
  let data: GeoSnapshotData;
  try {
    data = await fetchGeoSnapshotData();
  } catch (error) {
    reportServerError(error, 'utils/geoSnapshot', { stage: 'fetch' });
    data = EMPTY_DATA;
  }

  // Les Map sont reconstruites quand Nitro rend un objet désérialisé différent
  if (!memoized || memoized.data !== data) {
    memoized = { data, snapshot: new GeoSnapshot(data) };
  }
  return memoized.snapshot;
}
