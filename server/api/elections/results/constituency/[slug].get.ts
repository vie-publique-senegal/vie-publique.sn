import { readItems } from '@directus/sdk';

/**
 * Classement complet des coalitions pour une circonscription (détail —
 * complète le gagnant seul déjà exposé par /api/carte/result).
 * GET /api/elections/results/constituency/[slug]?election=<id>
 *
 * Source : election_constituency_coalition_results, saisie éditoriale CMS
 * au fil de l'eau (pas de source structurée identifiée à ce jour) : la
 * collection peut être vide pour une circonscription, ce n'est pas une erreur.
 */
export default defineCachedEventHandler(
  async (event) => {
    const slug = getRouterParam(event, 'slug');
    const query = getQuery(event);
    const electionId = query.election as string | undefined;

    if (!slug) {
      throw createError({ statusCode: 400, statusMessage: 'Le slug de la circonscription est requis' });
    }
    if (!electionId) {
      throw createError({ statusCode: 400, statusMessage: "Le paramètre 'election' est requis" });
    }

    try {
      const cmsClient = getCmsClient();

      const constituencies = await cmsClient.request(
        readItems('election_constituencies', {
          fields: ['id', 'name', 'slug'],
          filter: { slug: { _eq: slug }, status: { _nin: ['draft', 'archived'] } },
          limit: 1,
        }),
      );
      const constituency = constituencies?.[0] as Record<string, unknown> | undefined;

      if (!constituency) {
        throw createError({ statusCode: 404, statusMessage: 'Circonscription introuvable' });
      }

      const emptyResponse = {
        constituency: { slug: constituency.slug ?? slug, name: constituency.name ?? null },
        round1: [],
        round2: null,
      };

      const results = await cmsClient.request(
        readItems('election_constituency_results', {
          fields: ['id'],
          filter: {
            constituency: { _eq: constituency.id as number },
            election: { _eq: parseInt(electionId) },
          },
          limit: 1,
        }),
      );
      const resultId = (results?.[0] as Record<string, unknown> | undefined)?.id as number | undefined;

      if (!resultId) {
        return emptyResponse;
      }

      const coalitionResultFields = [
        'round',
        'votes',
        'percentage',
        'coalition.color',
        'coalition.logo',
        ...ENTITY_IDENTITY_FIELDS.map((f) => `coalition.political_entity.${f}`),
      ];

      const coalitionResults = (await cmsClient.request(
        readItems('election_constituency_coalition_results', {
          fields: coalitionResultFields,
          filter: { result: { _eq: resultId }, status: { _eq: 'published' } },
          sort: ['-votes'],
          limit: -1,
        }),
      )) as Record<string, unknown>[];

      const toRankingItem = (item: Record<string, unknown>) => ({
        coalition: mergeEntityIdentity((item.coalition as Record<string, unknown>) ?? {}),
        votes: item.votes ?? null,
        percentage: item.percentage ?? null,
      });

      const round1 = coalitionResults.filter((item) => (item.round ?? 1) === 1).map(toRankingItem);
      const round2Items = coalitionResults.filter((item) => item.round === 2).map(toRankingItem);

      return {
        constituency: { slug: constituency.slug ?? slug, name: constituency.name ?? null },
        round1,
        round2: round2Items.length > 0 ? round2Items : null,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) throw error;
      console.error(`Erreur lors de la récupération du classement de la circonscription ${slug}:`, error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération du classement de la circonscription',
      });
    }
  },
  {
    maxAge: 60 * 30,
    name: 'elections-results-constituency-v1',
    getKey: (event) => {
      const slug = getRouterParam(event, 'slug');
      const query = getQuery(event);
      return `results-constituency-${slug}-${query.election || 'none'}`;
    },
  },
);
