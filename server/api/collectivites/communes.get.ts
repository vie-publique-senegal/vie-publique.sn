/**
 * Annuaire des collectivités territoriales — référentiel géo réel.
 *
 * Renvoie les 558 collectivités de base d'un bloc (pas de pagination) : la charge
 * utile est légère (aucun texte long, aucun bloc généré) et l'annuaire filtre et
 * bascule de vue sans aller-retour réseau. Les facettes sont dérivées ici pour
 * que la page n'ait pas à parcourir la liste pour peupler ses sélecteurs.
 */
export default defineCachedEventHandler(
  async () => {
    const communes = await getCommunesGeo();

    const regions = [...new Set(communes.map((c) => c.region).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'fr'),
    );
    const departements = [...new Set(communes.map((c) => c.departement).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, 'fr'),
    );

    return {
      communes,
      regions,
      departements,
      total: communes.length,
      // Repères de complétude : ce qui est réel aujourd'hui et ce qui manque
      // encore (maires = phases 2-3 de l'import), affiché tel quel à l'utilisateur.
      completude: {
        avecPopulation: communes.filter((c) => c.population !== null).length,
        avecMaire: communes.filter((c) => c.maire !== null).length,
        avecContact: communes.filter((c) => c.contact !== null).length,
      },
    };
  },
  {
    name: 'collectivites-communes',
    maxAge: process.env.NODE_ENV === 'production' ? 30 * 60 : 0,
    getKey: () => 'all',
  },
);
