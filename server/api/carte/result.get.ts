import { readItems } from '@directus/sdk'

/**
 * Résultats « gagnant seul » par circonscription pour la choroplèthe.
 * Source : election_constituency_results (clés de réponse legacy conservées :
 * coalition_gagnante, constituencie). Fallback : collection `carte` tant que
 * les résultats ne sont pas backfillés (prod non migrée). Les contours ne sont
 * plus servis : jointure front par constituencie.slug sur public/geo/elections/.
 */
export default defineCachedEventHandler(
  async (event) => {
    try {
      const query = getQuery(event);
      const electionId = query.election as string | undefined;

      const cmsClient = getCmsClient();

      const resultFields = [
        'id',
        'voters',
        'seat',
        'winning_coalition.color',
        'winning_coalition.logo',
        ...ENTITY_IDENTITY_FIELDS.map((f) => `winning_coalition.political_entity.${f}`),
        // Tête de liste des scrutins nationaux (législatives, présidentielle) : M2O direct
        // sur la coalition. winning_list.candidates ne s'applique qu'aux locales.
        'winning_coalition.head_of_list.id',
        'winning_coalition.head_of_list.person.id',
        'winning_coalition.head_of_list.person.slug',
        'winning_coalition.head_of_list.person.first_name',
        'winning_coalition.head_of_list.person.last_name',
        'constituency.id',
        'constituency.name',
        'constituency.slug',
        'constituency.type',
        'constituency.nationale_type',
        ...GEO_UNIT_FIELDS.map((f) => `constituency.${f}`),
        'election.id',
        'election.type',
        'election.year',
        'winning_list.is_substitute',
        // L'identité des candidats vient de leur person
        'winning_list.candidates.position',
        'winning_list.candidates.person.id',
        'winning_list.candidates.person.slug',
        'winning_list.candidates.person.first_name',
        'winning_list.candidates.person.last_name',
      ];

      const results = (await cmsClient
        .request(
          readItems('election_constituency_results', {
            fields: resultFields,
            ...(electionId ? { filter: { election: { _eq: parseInt(electionId) } } } : {}),
            limit: -1,
            sort: ['id'],
          })
        )
        .catch(() => null)) as Record<string, unknown>[] | null;

      // Tête de liste condensée d'une coalition, via sa person (fallback candidat legacy géré par mergePersonIdentity).
      const headOfListOf = (coalition: Record<string, unknown> | null) => {
        const head = coalition?.head_of_list as Record<string, unknown> | null;
        if (!head) return null;
        const merged = mergePersonIdentity(head);
        return {
          id: merged.id ?? null,
          slug: merged.slug ?? null,
          first_name: merged.first_name ?? null,
          last_name: merged.last_name ?? null,
        };
      };

      const mapWinners = (items: Record<string, unknown>[], coalitionKey: string) =>
        items.map((item) => {
          const winningList = item?.winning_list as Record<string, unknown> | null;
          const coalitionRaw = item?.[coalitionKey] as Record<string, unknown> | null | undefined;
          return {
            ...item,
            coalition_gagnante: coalitionRaw
              ? { ...mergeEntityIdentity(coalitionRaw), head_of_list: headOfListOf(coalitionRaw) }
              : (coalitionRaw ?? null),
            winning_list:
              winningList && Array.isArray(winningList.candidates)
                ? {
                    ...winningList,
                    candidates: (winningList.candidates as Record<string, unknown>[]).map(mergePersonIdentity),
                  }
                : winningList,
          };
        });

      if (results && results.length > 0) {
        // Clés legacy conservées : constituencie + coalition_gagnante.
        // Identité géographique (name/slug/region/population/parent) résolue via le
        // référentiel geo_* (fallback legacy) ; constituencie reconstruit explicitement
        // pour ne pas exposer les relations geo_* brutes.
        return mapWinners(results, 'winning_coalition').map((item) => {
          const mapped = { ...(item as Record<string, unknown>) };
          const constituency = mapped.constituency as Record<string, unknown> | null;
          const geo = resolveGeoUnit(constituency);
          mapped.constituencie = constituency
            ? {
                id: constituency.id,
                name: geo?.name || constituency.name,
                slug: geo?.slug ?? constituency.slug ?? null,
                region: geo?.region?.name ?? null,
                type: constituency.type,
                nationale_type: constituency.nationale_type,
                population: geo?.population ?? null,
                parent: geo?.parent ?? null,
              }
            : null;
          delete mapped.constituency;
          delete mapped.winning_coalition;
          return mapped;
        });
      }

      // Fallback legacy : lecture de `carte` (sert encore Position, géré côté front)
      warnElectoralLegacyFallback('/api/carte/result', electionId ? `election ${electionId}` : 'all');

      const legacyFields = [
        '*',
        'coalition_gagnante.color',
        'coalition_gagnante.logo',
        ...ENTITY_IDENTITY_FIELDS.map((f) => `coalition_gagnante.political_entity.${f}`),
        'coalition_gagnante.head_of_list.id',
        'coalition_gagnante.head_of_list.person.id',
        'coalition_gagnante.head_of_list.person.slug',
        'coalition_gagnante.head_of_list.person.first_name',
        'coalition_gagnante.head_of_list.person.last_name',
        'constituencie.name',
        'constituencie.region',
        'constituencie.type',
        'constituencie.nationale_type',
        'election.id',
        'election.type',
        'election.year',
        'voters',
        'winning_list.is_substitute',
        'winning_list.candidates.position',
        'winning_list.candidates.person.id',
        'winning_list.candidates.person.slug',
        'winning_list.candidates.person.first_name',
        'winning_list.candidates.person.last_name',
      ];

      const legacyResponse = (await cmsClient.request(
        readItems('carte', {
          fields: legacyFields,
          ...(electionId ? { filter: { election: { _eq: parseInt(electionId) } } } : {}),
          limit: -1,
        })
      )) as Record<string, unknown>[];

      return mapWinners(legacyResponse, 'coalition_gagnante');
    } catch (error) {
      console.error('Erreur lors de la récupération des données de résultats:', error);

      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération des données de résultats de carte'
      });
    }
  },
  {
    maxAge: 60 * 60, // 1 heure
    name: 'carte-result-v3',
    getKey: (event) => {
      const query = getQuery(event);
      return `carte-result-${query.election || 'all'}`;
    },
  },
);
