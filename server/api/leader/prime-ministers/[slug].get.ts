import type { PrimeMinisterDetailResponse } from '~~/types/leader-history';

/**
 * API : détail d'un mandat de Premier ministre par slug de la `public_persons`.
 */
export default defineCachedEventHandler(
  async (event): Promise<PrimeMinisterDetailResponse> => {
    const slug = getRouterParam(event, 'slug');
    if (!slug || !/^[a-z0-9-]{1,100}$/.test(slug)) {
      throw createError({ statusCode: 400, message: 'Slug invalide' });
    }

    try {
      const govs = await fetchGovernmentsAsc();
      const { terms } = buildPrimeMinisterialTerms(govs);
      const term = terms.find((t) => t.prime_minister.slug === slug);
      if (!term) {
        throw createError({ statusCode: 404, message: 'Premier ministre introuvable' });
      }

      const profile = await fetchLeaderProfile(slug);
      const appointment = profile
        ? await fetchLeaderAppointment(profile.id, 'premier_ministre')
        : null;

      const order = terms.map((t) => ({
        slug: t.prime_minister.slug,
        full_name: t.prime_minister.full_name,
      }));
      const { prev, next } = leaderNav(order, slug);

      return { term, profile: profile!, appointment, prev, next };
    } catch (error: any) {
      if (error?.statusCode) throw error;
      console.error('Erreur API détail premier ministre:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération du Premier ministre',
      });
    }
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 60 * 60 : 0,
    name: 'leader-pm-detail',
    getKey: (event) => `pm-${getRouterParam(event, 'slug')}`,
  },
);
