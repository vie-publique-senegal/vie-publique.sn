import { readItems, aggregate } from '@directus/sdk';

interface TopDeputy {
  id: string;
  first_name: string;
  last_name: string;
  photo: string | null;
  questionsCount: number;
}

export default defineCachedEventHandler(
  async (event) => {
    // Récupération des paramètres de requête
    const query = getQuery(event);
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 50;
    const search = query.search as string;
    const sortBy = (query.sortBy as string) || '-question_date';
    const filterStatus = query.filterStatus as string;
    const deputyId = (query.deputyId as string) || '';
    const includeStats = query.includeStats === 'true';
    const topDeputiesLimit = parseInt(query.topDeputiesLimit as string) || 4;

    try {
      const directus = getCmsClient();

      // Construction du filtre dynamique
      const filter: any = {
        status: {
          _eq: filterStatus || 'published',
        },
      };

      // Filtre par député (page « toutes les questions d'un député »)
      if (deputyId) {
        filter.deputy = { id: { _eq: deputyId } };
      }

      // Calcul de l'offset pour la pagination
      const offset = (page - 1) * limit;

      // Tri stable : beaucoup de questions partagent la même question_date
      // (dépôts groupés). Sans départage sur l'id, l'ordre des ex æquo n'est pas
      // garanti d'une requête à l'autre → un item peut apparaître sur deux pages
      // consécutives et un autre disparaître.
      const sort = sortBy === 'id' || sortBy === '-id' ? [sortBy] : [sortBy, '-id'];

      // --- Recherche -------------------------------------------------------
      // `_icontains` (ILIKE) est sensible aux accents (`defici` ≠ « déficit ») :
      // la recherche passe donc par l'index replié en mémoire, qui rend aussi
      // les ids de la page déjà triés. Voir server/utils/assembly-questions-search.ts.
      // Ids de la page courante quand la recherche est active (null sinon).
      let searchIds: (number | string)[] | null = null;
      let searchTotal = 0;

      if (search) {
        try {
          const result = await searchQuestions({ search, deputyId, sortBy, page, limit });
          searchIds = result.ids;
          searchTotal = result.total;
        } catch (indexError) {
          // Dégradation propre : on retombe sur le filtre Directus (fonctionnel,
          // mais sensible aux accents) plutôt que de renvoyer une erreur.
          reportServerError(indexError, 'assembly-questions-search-index', { search });
          const term = search.trim();
          filter._or = [
            { subject: { _icontains: term } },
            { question_text: { _icontains: term } },
            { deputy: { first_name: { _icontains: term } } },
            { deputy: { last_name: { _icontains: term } } },
          ];
        }
      }

      // Aucun résultat : inutile d'interroger Directus.
      if (searchIds && searchIds.length === 0) {
        return {
          questions: [],
          totalQuestions: 0,
          pagination: { page, limit, total: 0, totalPages: 0 },
          ...(includeStats && { topDeputies: [] as TopDeputy[] }),
        };
      }

      // Récupération des questions avec pagination
      const questionData = await directus
        .request(
          readItems('assembly_question', {
            fields: [
              'id',
              'subject',
              'slug',
              'question_date',
              'status',
              'deputy.id',
              'deputy.first_name',
              'deputy.last_name',
              'deputy.photo',
              'deputy.group.name',
              'deputy.group.color',
            ],
            // Recherche active : l'index a déjà filtré/trié/paginé, on ne demande
            // plus que les champs complets des ids de la page.
            filter: searchIds ? { ...filter, id: { _in: searchIds } } : filter,
            limit: searchIds ? searchIds.length : limit,
            offset: searchIds ? 0 : offset,
            sort,
          }),
        )
        .catch((error) => {
          throw createError({
            statusCode: error.errors?.[0]?.extensions?.code || 500,
            message: error.errors?.[0]?.message || 'Erreur interne du serveur',
          });
        });

      // `id._in` ne garantit pas l'ordre : on réapplique celui de l'index.
      if (searchIds) {
        const rank = new Map(searchIds.map((id, i) => [String(id), i]));
        questionData.sort((a, b) => (rank.get(String(a.id)) ?? 0) - (rank.get(String(b.id)) ?? 0));
      }

      // Total : fourni par l'index en recherche, sinon aggregate() Directus
      let totalCount = searchTotal;
      if (!searchIds) {
        const [totalCountResult] = await directus.request(
          aggregate('assembly_question', {
            aggregate: { count: '*' },
            query: { filter },
          }),
        );
        totalCount = Number(totalCountResult?.count || questionData.length);
      }

      // Transformation des données
      const transformedQuestions = questionData.map((question) => ({
        id: question.id,
        subject: question.subject,
        // Slug SEO : celui du CMS s'il existe, sinon généré depuis le sujet.
        slug:
          (question as any).slug ||
          generateSlugFromName(question.subject || `question-${question.id}`),
        question_date: question.question_date || null,
        status: question.status,
        deputy: question.deputy
          ? {
              id: question.deputy.id,
              first_name: question.deputy.first_name,
              last_name: question.deputy.last_name,
              photo: question.deputy.photo || null,
              group: question.deputy.group || null,
            }
          : null,
      }));

      // Calcul des statistiques des députés les plus actifs (optionnel)
      let topDeputies: TopDeputy[] = [];
      if (includeStats) {
        // Récupérer toutes les questions pour calculer les stats
        const allQuestionsForStats = await directus.request(
          readItems('assembly_question', {
            fields: ['deputy.id', 'deputy.first_name', 'deputy.last_name', 'deputy.photo'],
            filter: {
              status: { _eq: 'published' },
              deputy: { _nnull: true },
            },
            limit: -1,
          }),
        );

        // Agrégation des questions par député
        const deputyStats = new Map<string, TopDeputy>();
        for (const question of allQuestionsForStats) {
          if (!question.deputy?.id) continue;
          const deputyId = question.deputy.id;
          const existing = deputyStats.get(deputyId);
          if (existing) {
            existing.questionsCount++;
          } else {
            deputyStats.set(deputyId, {
              id: deputyId,
              first_name: question.deputy.first_name || '',
              last_name: question.deputy.last_name || '',
              photo: question.deputy.photo || null,
              questionsCount: 1,
            });
          }
        }

        // Trier et limiter
        topDeputies = Array.from(deputyStats.values())
          .sort((a, b) => b.questionsCount - a.questionsCount)
          .slice(0, topDeputiesLimit);
      }

      return {
        questions: transformedQuestions,
        totalQuestions: totalCount,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        ...(includeStats && { topDeputies }),
      };
    } catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage:
          'Une erreur est survenue lors de la récupération des questions parlementaires',
      });
    }
  },
  {
    maxAge: 60 * 60, // 1 heure
    name: 'assembly-questions-v5',
    getKey: (event) => buildCacheKey('assembly-questions', getQuery(event)),
  },
);
