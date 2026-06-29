import { readField } from '@directus/sdk';
import type { GovernmentCategory } from '~~/types/government';

/**
 * API : liste dynamique des rôles (catégories) d'un membre de gouvernement.
 * Retourne les choix du champ `position_category_slug` dans l'ordre défini au CMS,
 * pour alimenter les menus de filtre sans liste codée en dur.
 */
export default defineCachedEventHandler(
  async () => {
    try {
      const directus = getCmsClient() as any;

      const field = await directus.request(
        (readField as any)('public_person_appointments', 'position_category_slug'),
      );

      const choices: Array<{ text?: string; value: string }> =
        field?.meta?.options?.choices ?? [];

      const categories: GovernmentCategory[] = choices.map((c) => ({
        slug: c.value,
        label: c.text ?? c.value,
      }));

      return { categories };
    } catch (error: any) {
      console.error('Erreur API catégories gouvernement:', error);
      // Dégradation gracieuse : liste vide plutôt qu'une erreur bloquante.
      return { categories: [] as GovernmentCategory[] };
    }
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 24 * 60 * 60 : 0, // 24h en prod
    name: 'government-categories',
  },
);
