// server/api/elections/candidates/elected.get.ts
import { readItems, aggregate } from '@directus/sdk';

/**
 * Endpoint pour récupérer les candidats élus aux élections
 * Route: /api/elections/candidates/elected
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);

    // Paramètres de pagination
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 200;
    const offset = (page - 1) * limit;

    // Paramètres de filtrage
    const coalition = query.coalition as string | undefined;
    const gender = query.gender as string | undefined;
    const search = query.search as string | undefined;

    try {
      // Construction du filtre de base - uniquement les élus publiés.
      // Prérequis de données : les candidats doivent être en published (la normalisation
      // des statuts draft fait partie de la migration prod, phase 2).
      const filter: any = {
        is_elected: { _eq: true },
        status: { _eq: 'published' },
      };

      // Ajout des filtres optionnels
      // Le nom vit sur l'entité politique (champs legacy coalition supprimés)
      if (coalition) {
        filter.electoral_list = {
          coalition: { political_entity: { name: { _eq: coalition } } },
        };
      }

      // L'identité vit sur la person liée, les champs legacy du candidat sont supprimés
      if (gender) {
        filter.person = { gender: { _eq: gender } };
      }

      if (search) {
        filter._or = [
          { person: { first_name: { _icontains: search } } },
          { person: { last_name: { _icontains: search } } },
          { profession: { _icontains: search } },
        ];
      }

      // Récupération des candidats élus
      const candidatesData = await directus.request(
        readItems('election_candidates', {
          fields: [
            'id',
            'profession',
            { person: PERSON_IDENTITY_FIELDS } as any,
            {
              electoral_list: [
                'name',
                'type',
                {
                  coalition: ['color', { political_entity: ENTITY_IDENTITY_FIELDS }],
                  constituency: ['name'],
                },
              ],
            },
          ],
          filter,
          limit,
          offset,
          sort: ['person.last_name', 'person.first_name'],
        }),
      );

      // Récupération du total
      const [totalCount] = await directus.request(
        aggregate('election_candidates', {
          aggregate: { count: '*' },
          query: { filter },
        }),
      );

      const total = Number(totalCount.count);
      const totalPages = Math.ceil(total / limit);

      return {
        // Identité via la person liée (fallback legacy)
        // Identité de la coalition via son entité politique (fallback legacy)
        candidates: (candidatesData as Record<string, unknown>[]).map((raw) => {
          const candidate = mergePersonIdentity(raw);
          // Compat : la clé `biography` reste servie (bio courte de la person)
          candidate.biography = candidate.short_bio ?? null;
          const electoralList = candidate.electoral_list as Record<string, unknown> | null;
          if (electoralList?.coalition) {
            candidate.electoral_list = {
              ...electoralList,
              coalition: mergeEntityIdentity(electoralList.coalition as Record<string, unknown>),
            };
          }
          return candidate;
        }),
        totalCandidates: total,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      reportServerError(error, 'api/elections/candidates/elected', {
        coalition,
        gender,
        search,
        page,
      });
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération des candidats élus',
      });
    }
  },
  {
    maxAge: 60 * 60, // Cache de 1 heure
    name: 'election-candidates-elected',
  },
);
