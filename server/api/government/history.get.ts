import { readItems } from '@directus/sdk';
import type {
  Government,
  GovernmentWithStats,
  PresidentSummary,
} from '~~/types/government';

/** Normalise une chaîne (sans accents, minuscule) pour une recherche tolérante. */
const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * API : historique complet des gouvernements du Sénégal depuis 1960.
 *
 * - Lit la collection `governments` (président, premier ministre, décrets).
 * - Calcule pour chaque gouvernement le nombre de membres et de femmes à partir
 *   de `public_person_appointments` (un seul appel agrégé).
 * - Dérive dynamiquement la liste des présidences (jamais codée en dur).
 *
 * Query params (optionnels, repris depuis l'URL) :
 *   - `q`         : recherche sur le nom du gouvernement et/ou du Premier Ministre.
 *   - `president` : filtre par slug de président (dynamique).
 */
export default defineCachedEventHandler(
  async (event) => {
    const query = getQuery(event);
    const q = normalize(String(query.q ?? ''));
    const presidentSlug = String(query.president ?? '').trim();

    try {
      const directus = getCmsClient();

      // 1. Tous les gouvernements publiés (liste complète, non filtrée).
      const data = await directus
        .request(
          readItems('governments', {
            fields: [
              'id',
              'name',
              'slug',
              'start_date',
              'end_date',
              'notes',
              'president.id',
              'president.full_name',
              'president.slug',
              'president.photo',
              'prime_minister.id',
              'prime_minister.full_name',
              'prime_minister.slug',
              'prime_minister.photo',
              'pm_appointment_decree.id',
              'pm_appointment_decree.title',
              'pm_appointment_decree.slug',
              'formation_decree.id',
              'formation_decree.title',
              'formation_decree.slug',
            ],
            filter: {
              status: { _eq: 'published' },
            },
            sort: ['-start_date'],
            limit: -1,
          }),
        )
        .catch((error) => {
          console.error('Erreur Directus historique gouvernements:', error);
          throw createError({
            statusCode: error.errors?.[0]?.extensions?.code || 500,
            message: error.errors?.[0]?.message || 'Erreur interne du serveur',
          });
        });

      // 2. Statistiques par gouvernement (un seul appel agrégé).
      const appointments = await directus
        .request(
          readItems('public_person_appointments', {
            fields: ['government', 'person.sexe'],
            filter: {
              status: { _eq: 'published' },
              government: { _nnull: true },
            },
            limit: -1,
          }),
        )
        .catch(() => [] as any[]);

      const statsByGov = new Map<number, { total: number; women: number }>();
      for (const a of appointments as any[]) {
        const govId =
          typeof a.government === 'object' && a.government !== null
            ? a.government.id
            : a.government;
        if (govId === null || govId === undefined) continue;
        const entry = statsByGov.get(govId) ?? { total: 0, women: 0 };
        entry.total += 1;
        if (a.person?.sexe === 'female') entry.women += 1;
        statsByGov.set(govId, entry);
      }

      // 3. Normalisation + ajout des stats.
      const allGovernments: GovernmentWithStats[] = (data as any[]).map((g) => {
        const base: Government = {
          id: g.id,
          name: g.name,
          slug: g.slug || generateSlugFromName(g.name),
          start_date: g.start_date,
          end_date: g.end_date ?? null,
          notes: g.notes ?? null,
          president: g.president
            ? {
                id: g.president.id,
                full_name: g.president.full_name,
                slug: g.president.slug ?? null,
                photo: g.president.photo ?? null,
              }
            : null,
          prime_minister: g.prime_minister
            ? {
                id: g.prime_minister.id,
                full_name: g.prime_minister.full_name,
                slug: g.prime_minister.slug ?? null,
                photo: g.prime_minister.photo ?? null,
              }
            : null,
          pm_appointment_decree: g.pm_appointment_decree
            ? {
                id: g.pm_appointment_decree.id,
                title: g.pm_appointment_decree.title,
                slug: g.pm_appointment_decree.slug,
              }
            : null,
          formation_decree: g.formation_decree
            ? {
                id: g.formation_decree.id,
                title: g.formation_decree.title,
                slug: g.formation_decree.slug,
              }
            : null,
        };
        return { ...base, stats: statsByGov.get(g.id) ?? { total: 0, women: 0 } };
      });

      // 4. Présidences dérivées dynamiquement (sur l'ensemble complet, ordre récent → ancien).
      const presidentsMap = new Map<string, PresidentSummary>();
      for (const g of allGovernments) {
        const p = g.president;
        if (!p) continue;
        const slug = p.slug || `president-${p.id}`;
        const existing = presidentsMap.get(slug);
        if (existing) existing.count += 1;
        else presidentsMap.set(slug, { slug, full_name: p.full_name, count: 1 });
      }
      const presidents = Array.from(presidentsMap.values());

      // 5. Filtrage serveur (recherche `q` + présidence).
      let governments = allGovernments;
      if (presidentSlug) {
        governments = governments.filter(
          (g) => (g.president?.slug || `president-${g.president?.id}`) === presidentSlug,
        );
      }
      if (q) {
        governments = governments.filter((g) => {
          const haystack = normalize(
            `${g.name} ${g.prime_minister?.full_name ?? ''}`,
          );
          return haystack.includes(q);
        });
      }

      return { governments, presidents };
    } catch (error: any) {
      if (error?.statusCode) throw error;
      console.error('Erreur API historique gouvernements:', error);
      throw createError({
        statusCode: 500,
        statusMessage:
          "Une erreur est survenue lors de la récupération de l'historique des gouvernements",
      });
    }
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 60 * 60 : 0, // 1h en prod, pas de cache en dev
    getKey: (event) => buildCacheKey('government-history', getQuery(event)),
    name: 'government-history',
  },
);
