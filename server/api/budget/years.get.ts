import { readItems } from '@directus/sdk';

import {
  resolveLatestBudget,
  type BudgetYearLike,
  type LatestBudget,
} from '#shared/budget-version';

export default defineCachedEventHandler(
  async () => {
    try {
      const directus = getCmsClient();

      // Récupérer toutes les années publiées avec leurs versions
      const years = await directus.request(
        readItems('budget_year', {
          fields: ['id', 'year', 'status'],
          filter: {
            status: { _eq: 'published' },
          },
          sort: ['-year'],
          limit: -1,
        }),
      );

      if (!years || years.length === 0) {
        // Même forme que le retour nominal : une branche avec une clé en plus
        // (`versions`, que personne ne consomme) casse l'inférence de type côté
        // client — `data.value.latest` devient inaccessible.
        return {
          years: [] as BudgetYearLike[],
          latest: null as LatestBudget | null,
        };
      }

      // Pour chaque année, récupérer ses versions publiées
      const yearsWithVersions = await Promise.all(
        years.map(async (year: any) => {
          const versions = await directus.request(
            readItems('budget_version', {
              fields: ['id', 'label', 'status', 'date'],
              filter: {
                year: { _eq: year.id }, // Utiliser l'ID de l'année, pas year.year
                status: { _eq: 'published' },
              },
              sort: ['date'], // Trier par date chronologique
              limit: -1,
            }),
          );

          return {
            year: year.year,
            yearId: year.id,
            versions: versions.map((v: any) => ({
              id: v.id,
              label: v.label,
              date: v.date,
            })),
          };
        }),
      );

      // Filtrer les années qui ont au moins une version
      const validYears = yearsWithVersions.filter((y) => y.versions.length > 0);

      // Dernier exercice publié + sa version prioritaire (LFR > LFI > PLF).
      // Logique partagée avec useBudget.setYear() et ministries.get.ts.
      const latest = resolveLatestBudget(validYears);

      return {
        years: validYears,
        latest,
      };
    } catch (error: any) {
      console.error('Erreur récupération années budgétaires:', error);

      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération des années budgétaires',
      });
    }
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 5 * 60 : 0, // 5 minutes en prod, pas de cache en dev
    name: 'budget-years',
    getKey: () => 'budget-years-list',
  },
);
