import { readItems } from '@directus/sdk';
import type { GovernmentMember } from '~/types/government-member';

/**
 * API pour récupérer le gouvernement actuel du Sénégal.
 * Requête la collection public_persons avec leur nomination actuelle (current_appointment)
 * et filtre par catégorie de poste gouvernemental.
 */
export default defineCachedEventHandler(
  async () => {
    try {
      const directus = getCmsClient();

      // Catégories de postes gouvernementaux, par slug du référentiel public_position_categories
      const governmentCategories = ['premier_ministre', 'ministre', 'secretaire_etat'];

      // Récupération des personnalités ayant un poste gouvernemental actuel
      const personsData = await directus
        .request(
          readItems('public_persons', {
            fields: [
              'id',
              'full_name',
              'slug',
              'sexe',
              'photo',
              'education',
              'current_appointment.id',
              'current_appointment.position_title',
              'current_appointment.category.slug',
              'current_appointment.category.label',
              'current_appointment.organization_label',
              'current_appointment.appointment_date',
              'current_appointment.end_date',
              'current_appointment.is_current',
              'current_appointment.predecessor_label',
            ],
            filter: {
              status: { _eq: 'published' },
              current_appointment: {
                category: { slug: { _in: governmentCategories } },
                is_current: { _eq: true },
                status: { _eq: 'published' },
              },
            },
            sort: ['current_appointment.category.sort', 'full_name'],
            limit: -1,
          }),
        )
        .catch((error) => {
          console.error('Erreur Directus gouvernement:', error);
          throw createError({
            statusCode: error.errors?.[0]?.extensions?.code || 500,
            message: error.errors?.[0]?.message || 'Erreur interne du serveur',
          });
        });

      // Transformation des données vers le format GovernmentMember
      const toMember = (person: any): GovernmentMember => ({
        id: String(person.id),
        name: person.full_name,
        slug: person.slug || generateSlugFromName(person.full_name),
        sexe: person.sexe || 'male',
        type: person.current_appointment?.category?.label ?? null,
        role:
          person.current_appointment?.position_title ||
          person.current_appointment?.position_category ||
          '',
        organisation: person.current_appointment?.organization_label || null,
        nominationDate: person.current_appointment?.appointment_date || '',
        endDate: person.current_appointment?.end_date || '',
        photo: person.photo || null,
        formation: person.education || null,
        predecessor: person.current_appointment?.predecessor_label || null,
        rating: null,
        portrait: null,
      });

      // Regroupement par slug de catégorie (le libellé, lui, est affiché tel quel)
      const slugOf = (person: any): string | null =>
        person.current_appointment?.category?.slug ?? null;
      const withSlug = (slug: string) =>
        personsData.filter((person: any) => slugOf(person) === slug).map(toMember);

      const transformedGovernment: GovernmentMember[] = personsData.map(toMember);

      // Regrouper par catégorie
      const primeMinister = withSlug('premier_ministre');
      const ministers = withSlug('ministre');
      const secretariesOfState = withSlug('secretaire_etat');

      return {
        government: {
          primeMinister: primeMinister[0] || null,
          ministers: ministers,
          secretariesOfState: secretariesOfState,
        },
        stats: {
          total: transformedGovernment.length,
          ministers: ministers.length,
          secretariesOfState: secretariesOfState.length,
          women: transformedGovernment.filter((m) => m.sexe === 'female').length,
          men: transformedGovernment.filter((m) => m.sexe === 'male').length,
        },
        lastUpdate: new Date().toISOString().split('T')[0],
      };
    } catch (error) {
      console.error('Erreur API gouvernement:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Une erreur est survenue lors de la récupération du gouvernement',
      });
    }
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 5 * 60 : 0, // 5 min en prod, pas de cache en dev
    name: 'government-current-v3',
  },
);
