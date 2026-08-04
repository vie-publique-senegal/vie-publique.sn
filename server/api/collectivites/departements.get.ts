import type { DepartementAvecCommunes, DepartementCommuneRef } from '~/types/collectivite';

/**
 * Hub des départements — les 46 départements agrégés depuis les collectivités
 * de base, chacun accompagné de ses communes en version allégée.
 *
 * Ces renvois (nom, slug, maire) sont ce qui permet à la page de chercher un
 * département PAR une de ses communes ou par un maire, sans rapatrier les 558
 * fiches complètes ni interroger le serveur à chaque frappe.
 *
 * Se sert de la même liste mise en cache que l'annuaire : aucune requête
 * Directus supplémentaire.
 */
export default defineCachedEventHandler(
  async () => {
    const [departements, communes] = await Promise.all([getDepartementsGeo(), getCommunesGeo()]);

    const communesParDepartement = new Map<string, DepartementCommuneRef[]>();
    for (const commune of communes) {
      if (!commune.departementSlug) continue;
      const liste = communesParDepartement.get(commune.departementSlug) ?? [];
      liste.push({ nom: commune.nom, slug: commune.slug, maire: commune.maire?.nom ?? null });
      communesParDepartement.set(commune.departementSlug, liste);
    }

    const enrichis: DepartementAvecCommunes[] = departements.map((departement) => ({
      ...departement,
      communes: (communesParDepartement.get(departement.slug) ?? []).sort((a, b) =>
        a.nom.localeCompare(b.nom, 'fr'),
      ),
    }));

    const regions = [...new Set(departements.map((d) => d.region).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'fr'),
    );

    return {
      departements: enrichis,
      regions,
      total: departements.length,
      totalCollectivites: departements.reduce((sum, d) => sum + d.nbCollectivites, 0),
    };
  },
  {
    name: 'collectivites-departements',
    maxAge: process.env.NODE_ENV === 'production' ? 30 * 60 : 0,
    getKey: () => 'all',
  },
);
