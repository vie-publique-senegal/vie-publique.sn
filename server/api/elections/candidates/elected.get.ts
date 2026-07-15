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
      // Construction du filtre de base - uniquement les élus
      const filter: any = {
        is_elected: { _eq: true },
      };

      // Ajout des filtres optionnels
      // ⚠️ Syntaxe imbriquée obligatoire : la notation pointée en clé de filtre
      // ("electoral_list.coalition.name") est rejetée par Directus → 500
      if (coalition) {
        filter.electoral_list = { coalition: { name: { _eq: coalition } } };
      }

      if (gender) {
        filter.gender = { _eq: gender };
      }

      if (search) {
        filter._or = [
          { first_name: { _icontains: search } },
          { last_name: { _icontains: search } },
          { profession: { _icontains: search } },
        ];
      }

      // Récupération des candidats élus
      const candidatesData = await directus.request(
        readItems('election_candidates', {
          fields: [
            'id',
            'gender',
            'first_name',
            'last_name',
            'profession',
            'birthplace',
            'birthdate',
            'photo',
            'biography',
            {
              electoral_list: [
                'name',
                'type',
                {
                  coalition: ['name', 'color'],
                  constituency: ['name'],
                },
              ],
            },
          ],
          filter,
          limit,
          offset,
          sort: ['last_name', 'first_name'],
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
        candidates: candidatesData,
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
