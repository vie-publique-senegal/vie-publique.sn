import { aggregate, readItems } from '@directus/sdk';
import {
  isOfficeStatusFilter,
  type MandateFilter,
  type OfficeStatusFilter,
} from '~~/types/public-person';

/** Statut demandé ; `null` = pas de filtre (le défaut « en poste » est porté par la page) */
function getOfficeStatus(value: unknown): OfficeStatusFilter | null {
  return isOfficeStatusFilter(value) ? value : null;
}

export default defineCachedEventHandler(
  async (event) => {
    // Facette en poste / plus en poste : les compteurs catégorie / genre / élu-nommé et le total
    // portent sur la MÊME population que la liste affichée (par défaut : en poste). Les compteurs
    // de la facette statut, eux, portent toujours sur l'ensemble.
    const filterStatus = getOfficeStatus(getQuery(event).filterStatus);
    try {
      const directus = getCmsClient();

      // Même base que le filtre de la liste (index.get.ts) : personne publiée AVEC une nomination
      // actuelle publiée — une nomination draft est invisible partout, donc pas comptée non plus.
      const personFilter = {
        status: { _eq: 'published' },
        current_appointment: { id: { _nnull: true }, status: { _eq: 'published' } },
      };
      const scopedFilter =
        filterStatus === null
          ? personFilter
          : {
              ...personFilter,
              current_appointment: {
                ...personFilter.current_appointment,
                is_current: { _eq: filterStatus === 'current' },
              },
            };

      // Comptage par catégorie de la DERNIÈRE nomination (current_appointment), en cours ou
      // terminée : c'est ce que renvoie le filtre catégorie de la liste — les compteurs doivent
      // compter la même chose (sinon écart pastille/résultats dès qu'une fonction se termine).
      // La catégorie est lue sur le référentiel relationnel `category` (public_position_categories),
      // qui porte aussi la distinction élu / nommé (mandate_type, G19).
      // groupBy sur champ relationnel non supporté par Directus → requête plate + regroupement JS.
      const personsCategories = await directus.request(
        readItems('public_persons', {
          fields: [
            'current_appointment.category.slug',
            'current_appointment.category.label',
            'current_appointment.category.mandate_type',
            'current_appointment.category.sort',
            'current_appointment.is_current',
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
          query: { filter: scopedFilter },
        }),
      );

      type PersonCategoryRow = {
        current_appointment?: {
          is_current?: boolean | null;
          category?: {
            slug?: string | null;
            label?: string | null;
            mandate_type?: string | null;
            sort?: number | null;
          } | null;
        } | null;
      };

      // Catégories (clé = slug, valeur = { label, count }), dans l'ordre `sort` du référentiel
      const totalsByCategory: Record<string, { label: string; count: number; sort: number }> = {};
      // Facette élu / nommé : les non classés (catégorie sans type OU mandat sans catégorie)
      // sont comptés, jamais masqués — le total affiché doit rester vrai (G19).
      const totalsByMandate: Record<Exclude<MandateFilter, 'all'>, number> = {
        elected: 0,
        appointed: 0,
        unclassified: 0,
      };
      // Facette en poste / plus en poste (sur la même dernière nomination que la liste)
      const totalsByStatus: Record<OfficeStatusFilter, number> = {
        current: 0,
        former: 0,
      };

      (personsCategories as PersonCategoryRow[]).forEach((person) => {
        const status = person.current_appointment?.is_current ? 'current' : 'former';
        totalsByStatus[status]++;
        if (filterStatus && status !== filterStatus) return;
        const category = person.current_appointment?.category;
        const mandateType = category?.mandate_type;
        if (mandateType === 'elected' || mandateType === 'appointed') {
          totalsByMandate[mandateType]++;
        } else {
          totalsByMandate.unclassified++;
        }
        if (!category?.slug || !category.label) return;
        if (!totalsByCategory[category.slug]) {
          totalsByCategory[category.slug] = {
            label: category.label,
            count: 0,
            sort: category.sort ?? Number.MAX_SAFE_INTEGER,
          };
        }
        totalsByCategory[category.slug].count++;
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
          query: { filter: scopedFilter },
        }),
      );

      const total = totalResult[0]?.count?.id ? parseInt(totalResult[0].count.id) : 0;

      return {
        totalsByCategory: Object.fromEntries(
          Object.entries(totalsByCategory)
            .sort(([, a], [, b]) => a.sort - b.sort || a.label.localeCompare(b.label))
            .map(([slug, { label, count }]) => [slug, { label, count }]),
        ),
        totalsByMandate,
        totalsByStatus,
        totalsByGender: { maleCount, femaleCount },
        total,
      };
    } catch (error) {
      reportServerError(error, 'public-persons/stats');
      throw createError({
        statusCode: 500,
        statusMessage: 'Une erreur est survenue lors de la récupération des statistiques',
      });
    }
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 5 * 60 : 0, // 5 min en prod (à augmenter après stabilisation)
    name: 'public-persons-stats-v8',
    getKey: (event) =>
      `public-persons-stats-${getOfficeStatus(getQuery(event).filterStatus) ?? 'all'}`,
  },
);
