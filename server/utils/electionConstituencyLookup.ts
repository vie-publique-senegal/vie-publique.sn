import { readItems } from '@directus/sdk';
import { normalizeGeoName } from '#shared/geo-name';

/**
 * Résolution d'une circonscription à partir d'un NOM reçu en entrée (segment d'URL, valeur de
 * cascade de formulaire), tolérante aux deux graphies en circulation.
 *
 * Pourquoi : les routes et les cascades de l'application sont indexées sur un nom, pas sur un
 * identifiant. Depuis la bascule vers le référentiel versionné, 181 des 599 libellés existent
 * sous deux graphies (fichiers électoraux « KEDOUGOU » / « MALEM HODAR » vs référentiel
 * « Kédougou » / « Malem Hoddar »). Un filtre Directus en égalité stricte sur
 * `election_constituencies.name` ne répond donc qu'à l'une des deux.
 *
 * Principe : on indexe une fois les circonscriptions par clé normalisée
 * (`normalizeGeoName`) sur les DEUX graphies — celle de la circonscription ET celle du
 * référentiel — plus le slug. Les appelants filtrent ensuite les bureaux de vote sur
 * l'IDENTIFIANT (`constituency: { _in: ids }`), jamais sur le nom.
 *
 * ⚠️ La normalisation seule ne suffit pas : « malem hodar » ≠ « malem hoddar ». C'est
 * l'indexation des deux graphies qui fait fonctionner les deux URLs, pas la normalisation.
 *
 * Dégradation : toute lecture en échec produit un index VIDE (jamais une erreur) et
 * `resolveConstituencyByName` renvoie `null` — l'appelant répond alors « aucune donnée »,
 * exactement comme le faisait un nom inconnu avant la bascule.
 */

/** Valeurs de `election_constituencies.nationale_type` utilisées pour désambiguïser. */
export type ConstituencyNationaleType = 'departement' | 'commune';

interface ConstituencyIndexRow {
  id: number;
  /** Graphie des fichiers électoraux */
  name: string;
  slug: string | null;
  nationaleType: string | null;
  /** Graphie du référentiel géographique ; null pour les lignes sans contrepartie (diaspora) */
  geoName: string | null;
}

export interface ConstituencyNameMatch {
  /**
   * Identifiants portant ce nom. Plusieurs lignes peuvent partager une graphie (homonymie
   * département/commune, ligne archivée) : on filtre sur `_in` pour rester iso-fonctionnel
   * avec l'ancienne égalité de nom, qui les captait toutes.
   */
  ids: number[];
  /** Graphie des fichiers électoraux, à ré-émettre dans les réponses et les cascades */
  name: string;
  /** Graphie du référentiel ; null hors référentiel */
  geoName: string | null;
  slug: string | null;
}

/** Ajoute une clé normalisée à l'index, sans écraser les entrées déjà présentes. */
const addKey = (
  index: Map<string, ConstituencyIndexRow[]>,
  key: string,
  row: ConstituencyIndexRow,
) => {
  if (!key) return;
  const bucket = index.get(key);
  if (!bucket) index.set(key, [row]);
  else if (!bucket.some((candidate) => candidate.id === row.id)) bucket.push(row);
};

/**
 * Lit les circonscriptions et leur nom de référentiel. Aucun filtre de statut : l'ancienne
 * égalité de nom n'en posait pas non plus, en ajouter un ferait disparaître des URLs qui
 * répondaient jusqu'ici.
 */
const fetchConstituencyIndexRows = defineCachedFunction(
  async (): Promise<ConstituencyIndexRow[]> => {
    const cmsClient = getCmsClient();

    const [rows, geoSnapshot] = await Promise.all([
      cmsClient
        .request(
          readItems('election_constituencies', {
            fields: ['id', 'name', 'slug', 'nationale_type', ...GEO_UNIT_FIELDS],
            limit: -1,
            sort: ['id'],
          }),
        )
        .catch((error: unknown) => {
          reportServerError(error, 'utils/electionConstituencyLookup', {
            collection: 'election_constituencies',
          });
          return [];
        }) as Promise<
        ({
          id: number;
          name: string | null;
          slug: string | null;
          nationale_type: string | null;
        } & Record<string, unknown>)[]
      >,
      getGeoSnapshot(),
    ]);

    const indexRows: ConstituencyIndexRow[] = [];
    for (const row of rows) {
      if (typeof row.id !== 'number') continue;
      const geo = resolveGeoUnit(row, geoSnapshot);
      indexRows.push({
        id: row.id,
        name: row.name ?? '',
        slug: row.slug ?? null,
        nationaleType: row.nationale_type ?? null,
        geoName: geo?.source === 'geo_entity' ? geo.name : null,
      });
    }
    return indexRows;
  },
  {
    maxAge: getCacheMaxAge(60 * 60, 30),
    name: 'election-constituency-lookup-v1',
    getKey: () => 'election-constituency-lookup',
  },
);

let memoized: { rows: ConstituencyIndexRow[]; index: Map<string, ConstituencyIndexRow[]> } | null =
  null;

async function getConstituencyIndex(): Promise<Map<string, ConstituencyIndexRow[]>> {
  let rows: ConstituencyIndexRow[];
  try {
    rows = await fetchConstituencyIndexRows();
  } catch (error) {
    reportServerError(error, 'utils/electionConstituencyLookup', { stage: 'fetch' });
    rows = [];
  }

  // Les Map sont reconstruites quand Nitro rend un objet désérialisé différent
  if (!memoized || memoized.rows !== rows) {
    const index = new Map<string, ConstituencyIndexRow[]>();
    for (const row of rows) {
      addKey(index, normalizeGeoName(row.name), row);
      addKey(index, normalizeGeoName(row.geoName), row);
      addKey(index, normalizeGeoName(row.slug), row);
    }
    memoized = { rows, index };
  }
  return memoized.index;
}

/**
 * Résout un nom de circonscription, quelle que soit sa graphie.
 *
 * `nationaleType` désambiguïse les homonymes département/commune : les candidats du niveau
 * demandé sont préférés, mais on garde les autres si AUCUN ne correspond — dans un
 * environnement où `nationale_type` n'est pas renseigné, restreindre viderait la page.
 */
export async function resolveConstituencyByName(
  name: string | null | undefined,
  options: { nationaleType?: ConstituencyNationaleType } = {},
): Promise<ConstituencyNameMatch | null> {
  const key = normalizeGeoName(name);
  if (!key) return null;

  const candidates = (await getConstituencyIndex()).get(key);
  if (!candidates || candidates.length === 0) return null;

  const preferred = options.nationaleType
    ? candidates.filter((candidate) => candidate.nationaleType === options.nationaleType)
    : [];
  const selected = preferred.length > 0 ? preferred : candidates;
  const primary = selected[0] as ConstituencyIndexRow;

  return {
    ids: selected.map((candidate) => candidate.id),
    name: primary.name,
    geoName: primary.geoName,
    slug: primary.slug,
  };
}
