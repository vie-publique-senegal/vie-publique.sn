/**
 * Page département : l'agrégat, ses collectivités, et ses voisins de région.
 *
 * Les voisins sont renvoyés ici plutôt que chargés par la page : ils tiennent en
 * quelques lignes et évitent à la fiche de rapatrier les 46 départements pour
 * afficher un maillage interne.
 */
export default defineCachedEventHandler(
  async (event) => {
    const slug = getRouterParam(event, 'slug');
    if (!slug) {
      throw createError({ statusCode: 400, statusMessage: 'Slug manquant' });
    }

    const departements = await getDepartementsGeo();
    const departement = departements.find((d) => d.slug === slug);

    if (!departement) {
      throw createError({ statusCode: 404, statusMessage: 'Département introuvable' });
    }

    const communes = (await getCommunesGeo())
      .filter((commune) => commune.departementSlug === slug)
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

    return {
      departement,
      communes,
      voisins: departements.filter((d) => d.region === departement.region && d.slug !== slug),
    };
  },
  {
    name: 'collectivites-departement-v3',
    maxAge: process.env.NODE_ENV === 'production' ? 30 * 60 : 0,
    getKey: (event) => getRouterParam(event, 'slug') || 'unknown',
  },
);
