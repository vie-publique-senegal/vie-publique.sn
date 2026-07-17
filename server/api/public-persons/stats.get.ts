import { aggregate, readItems } from '@directus/sdk';

export default defineCachedEventHandler(
  async () => {
    try {
      const directus = getCmsClient();

      const personFilter = {
        status: { _eq: 'published' },
      };

      // Comptage par catégorie de la DERNIÈRE nomination (current_appointment), en cours ou
      // terminée : c'est ce que renvoie le filtre catégorie de la liste — les compteurs doivent
      // compter la même chose (sinon écart pastille/résultats dès qu'une fonction se termine).
      // groupBy sur champ relationnel non supporté par Directus → requête plate + regroupement JS.
      const personsCategories = await directus.request(
        readItems('public_persons', {
          fields: [
            'current_appointment.position_category',
            'current_appointment.position_category_slug',
          ],
          filter: personFilter,
          limit: -1,
        }),
      );

      // Agrégation par genre (sur les personnes)
      const genderStats = await directus.request(
        aggregate('public_persons', {
          aggregate: { count: ['id'] },
          groupBy: ['sexe'],
          query: { filter: personFilter },
        }),
      );

      // Transformation - Catégories (clé = slug, valeur = { label, count })
      type PersonCategoryRow = {
        current_appointment?: {
          position_category?: string | null;
          position_category_slug?: string | null;
        } | null;
      };
      const totalsByCategory: Record<string, { label: string; count: number }> = {};
      (personsCategories as PersonCategoryRow[]).forEach((person) => {
        const label = person.current_appointment?.position_category;
        const slug = person.current_appointment?.position_category_slug;
        if (!label || !slug) return;
        if (!totalsByCategory[slug]) {
          totalsByCategory[slug] = { label, count: 0 };
        }
        totalsByCategory[slug].count++;
      });

      // Transformation - Genre
      let maleCount = 0;
      let femaleCount = 0;
      (genderStats as Array<{ sexe?: string | null; count: { id: string } }>).forEach((stat) => {
        if (stat.sexe === 'male') {
          maleCount = parseInt(stat.count.id);
        } else if (stat.sexe === 'female') {
          femaleCount = parseInt(stat.count.id);
        }
      });

      // Total global des personnes
      const totalResult = await directus.request(
        aggregate('public_persons', {
          aggregate: { count: ['id'] },
          query: { filter: personFilter },
        }),
      );

      const total = totalResult[0]?.count?.id ? parseInt(totalResult[0].count.id) : 0;

      return {
        totalsByCategory: Object.fromEntries(
          Object.entries(totalsByCategory).sort(([, a], [, b]) => a.label.localeCompare(b.label)),
        ),
        totalsByGender: { maleCount, femaleCount },
        total,
      };
    } catch (error) {
      console.error('Error fetching public persons stats:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Une erreur est survenue lors de la récupération des statistiques',
      });
    }
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 5 * 60 : 0, // 5 min en prod (à augmenter après stabilisation)
    name: 'public-persons-stats-v2',
    getKey: () => 'public-persons-stats',
  },
);
