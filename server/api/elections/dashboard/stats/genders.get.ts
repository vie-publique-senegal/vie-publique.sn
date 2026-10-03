import { readItems } from '@directus/sdk';

/**
 * Endpoint pour récupérer la répartition par sexe des candidats pour le dashboard
 * Route: /api/elections/dashboard/stats/genders
 *
 * Query params:
 * - year: Année de l'élection
 * - type: Type d'élection
 *
 * Retourne le nombre de candidats par sexe (via election_persons.gender)
 */
export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient();
    const query = getQuery(event);
    const year = query.year ? parseInt(query.year as string) : null;
    const type = query.type as string | undefined;

    try {
      let filter: Record<string, unknown> | undefined;

      // Si année et type sont fournis, cibler l'élection correspondante
      if (year && type) {
        const elections = await directus.request(
          readItems('elections', {
            fields: ['id'],
            filter: {
              year: { _eq: year },
              type: { _eq: type },
            },
            limit: 1,
          }),
        );

        const electionId = elections[0]?.id;
        if (!electionId) {
          return { data: [] };
        }

        filter = {
          electoral_list: {
            election: { _eq: electionId },
          },
        };
      }

      const requestOptions: Record<string, unknown> = {
        fields: ['person.gender'],
        limit: -1,
      };
      if (filter) {
        requestOptions.filter = filter;
      }

      const candidates = (await directus.request(
        readItems('election_candidates', requestOptions as never),
      )) as { person?: { gender?: string | null } | null }[];

      const counts = new Map<string, number>();
      for (const candidate of candidates) {
        const rawGender = candidate.person?.gender;
        const gender = rawGender === 'M' || rawGender === 'F' ? rawGender : 'unknown';
        counts.set(gender, (counts.get(gender) || 0) + 1);
      }

      const labels: Record<string, string> = {
        F: 'Femmes',
        M: 'Hommes',
        unknown: 'Non renseigné',
      };

      const data = ['F', 'M', 'unknown']
        .filter((gender) => counts.has(gender))
        .map((gender) => ({
          gender,
          label: labels[gender],
          count: counts.get(gender)!,
        }));

      return { data };
    } catch (error) {
      reportServerError(error, 'elections:dashboard:stats:genders');
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération des statistiques par sexe',
      });
    }
  },
  {
    maxAge: 60 * 60, // Cache de 1 heure
    name: 'election-dashboard-stats-genders',
    getKey: (event) => {
      const query = getQuery(event);
      return `election-dashboard-stats-genders-${query.year || 'all'}-${query.type || 'all'}`;
    },
  },
);
