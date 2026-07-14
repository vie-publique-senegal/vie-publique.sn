import { readItems } from '@directus/sdk';

/**
 * Résolution élection → fichier électoral (election_electoral_files).
 *
 * Les endpoints bureaux de vote lisent election_polling_stations via le fichier
 * électoral rattaché à l'élection (FK elections.electoral_file_national/diaspora).
 * Retourne null quand la résolution échoue (élection sans FK, schéma absent) :
 * l'endpoint appelant retombe alors sur les collections legacy
 * election_map_national / election_map_diaspora (prod non migrée).
 */

export type ElectoralFileScope = 'national' | 'diaspora';

interface LatestFileCacheEntry {
  id: number | null;
  expiresAt: number;
}

// La table des fichiers électoraux est minuscule : cache in-process court
const latestFileCache = new Map<ElectoralFileScope, LatestFileCacheEntry>();
const LATEST_FILE_CACHE_TTL = 5 * 60 * 1000;

export async function resolveElectoralFileId(
  electionId: number | null | undefined,
  scope: ElectoralFileScope,
): Promise<number | null> {
  const cmsClient = getCmsClient();

  if (electionId) {
    const fkField = scope === 'national' ? 'electoral_file_national' : 'electoral_file_diaspora';
    const rows = (await cmsClient
      .request(
        readItems('elections', {
          fields: ['id', fkField],
          filter: { id: { _eq: electionId } },
          limit: 1,
        }),
      )
      .catch(() => [])) as Record<string, unknown>[];

    const fileId = rows?.[0]?.[fkField];
    return typeof fileId === 'number' ? fileId : null;
  }

  // Sans élection : le fichier électoral publié le plus récent du scope
  // (iso-fonctionnel avec le legacy où « tout » = la dernière carte électorale connue)
  const cached = latestFileCache.get(scope);
  if (cached && cached.expiresAt > Date.now()) return cached.id;

  const files = (await cmsClient
    .request(
      readItems('election_electoral_files', {
        fields: ['id'],
        filter: { scope: { _eq: scope }, status: { _eq: 'published' } },
        sort: ['-year', '-id'],
        limit: 1,
      }),
    )
    .catch(() => [])) as { id: number }[];

  const id = files?.[0]?.id ?? null;
  latestFileCache.set(scope, { id, expiresAt: Date.now() + LATEST_FILE_CACHE_TTL });
  return id;
}

/** Noms, slugs et populations des circonscriptions par id (mapping des agrégats groupés). */
export async function getConstituencyNamesById(
  ids: (number | string | null | undefined)[],
): Promise<Map<number, { name: string; slug: string | null; population: number | null; region: string | null }>> {
  const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0))];
  const namesById = new Map<number, { name: string; slug: string | null; population: number | null; region: string | null }>();
  if (uniqueIds.length === 0) return namesById;

  const cmsClient = getCmsClient();
  const rows = (await cmsClient
    .request(
      readItems('election_constituencies', {
        fields: ['id', 'name', 'slug', ...GEO_UNIT_FIELDS],
        filter: { id: { _in: uniqueIds } },
        limit: -1,
        sort: ['id'],
      }),
    )
    .catch(() => [])) as ({ id: number; name: string; slug: string | null } & Record<string, unknown>)[];

  for (const row of rows) {
    const geo = resolveGeoUnit(row);
    namesById.set(row.id, {
      name: geo?.name || row.name,
      slug: geo?.slug ?? row.slug ?? null,
      population: geo?.population ?? null,
      region: geo?.region?.name ?? null,
    });
  }
  return namesById;
}

/** Journalise un repli sur les collections legacy (à surveiller avant décommissionnement). */
export function warnElectoralLegacyFallback(endpoint: string, detail?: string) {
  console.warn(`[elections] lecture legacy sur ${endpoint}${detail ? ` (${detail})` : ''}`);
}
