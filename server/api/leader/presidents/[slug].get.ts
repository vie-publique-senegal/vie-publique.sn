import type { PresidentDetailResponse } from '~~/types/leader-history';

/**
 * API : détail d'une présidence par slug de la `public_persons`.
 * Dérive le mandat depuis `governments` + profil + décret d'investiture.
 */
export default defineCachedEventHandler(
  async (event): Promise<PresidentDetailResponse> => {
    const slug = getRouterParam(event, 'slug');
    if (!slug || !/^[a-z0-9-]{1,100}$/.test(slug)) {
      throw createError({ statusCode: 400, message: 'Slug invalide' });
    }

    try {
      const govs = await fetchGovernmentsAsc();
      const terms = buildPresidentialTerms(govs);
      const term = terms.find((t) => t.president.slug === slug);
      if (!term) {
        throw createError({ statusCode: 404, message: 'Président introuvable' });
      }

      const profile = await fetchLeaderProfile(slug);
      const appointment = profile
        ? await fetchLeaderAppointment(profile.id, 'presidence')
        : null;

      const order = terms.map((t) => ({ slug: t.president.slug, full_name: t.president.full_name }));
      const { prev, next } = leaderNav(order, slug);

      return { term, profile: profile!, appointment, prev, next };
    } catch (error: any) {
      if (error?.statusCode) throw error;
      console.error('Erreur API détail président:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération du président',
      });
    }
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 60 * 60 : 0,
    name: 'leader-president-detail',
    getKey: (event) => `president-${getRouterParam(event, 'slug')}`,
  },
);
