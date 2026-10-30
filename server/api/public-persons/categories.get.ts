/**
 * Catégories de fonction publiées (sous-pages `/personnalites-senegal/<slug>`).
 * Champs éditoriaux à `null` tant qu'ils ne sont pas renseignés (ou pas encore au schéma).
 */
export default defineEventHandler(async () => {
  try {
    return await getPositionCategories();
  } catch (error) {
    reportServerError(error, 'public-persons/categories');
    throw createError({
      statusCode: 500,
      statusMessage: 'Une erreur est survenue lors de la récupération des catégories',
    });
  }
});
