import { readItems } from '@directus/sdk'

export default defineCachedEventHandler(
  async (event) => {
    try {
      const query = getQuery(event);
      const electionId = query.election as string | undefined;

      // Récupérer le client CMS
      const cmsClient = getCmsClient();

      // Champs nécessaires pour les résultats
      const fields = [
        '*',
        'coalition_gagnante.color',
        'coalition_gagnante.logo',
        ...ENTITY_IDENTITY_FIELDS.map((f) => `coalition_gagnante.political_entity.${f}`),
        'constituencie.name',
        'constituencie.region',
        'constituencie.type',
        'constituencie.nationale_type',
        'election.id',
        'election.type',
        'election.year',
        'voters',
        'winning_list.is_substitute',
        // L'identité des candidats vient de leur person
        'winning_list.candidates.position',
        'winning_list.candidates.person.id',
        'winning_list.candidates.person.slug',
        'winning_list.candidates.person.first_name',
        'winning_list.candidates.person.last_name',
      ];

      // Appel API vers le CMS avec ou sans filtre
      const response = electionId
        ? await cmsClient.request(
            readItems('carte', {
              fields,
              filter: { election: { _eq: parseInt(electionId) } },
              limit: -1,
            })
          )
          : await cmsClient.request(
            readItems('carte', { fields ,
              limit: -1,
            })
          );

      // Identité de la coalition gagnante via son entité politique (fallback legacy)
      // Identité des candidats de la liste gagnante via leur person
      return (response as Record<string, unknown>[]).map((item) => {
        const winningList = item?.winning_list as Record<string, unknown> | null;
        return {
          ...item,
          coalition_gagnante: item?.coalition_gagnante
            ? mergeEntityIdentity(item.coalition_gagnante as Record<string, unknown>)
            : item?.coalition_gagnante,
          winning_list:
            winningList && Array.isArray(winningList.candidates)
              ? {
                  ...winningList,
                  candidates: (winningList.candidates as Record<string, unknown>[]).map(mergePersonIdentity),
                }
              : winningList,
        };
      });
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
    name: 'carte-result',
    getKey: (event) => {
      const query = getQuery(event);
      return `carte-result-${query.election || 'all'}`;
    },
  },
);
