import type { CommuneGeo } from '~~/types/collectivite';

// Onglets de la fiche commune - chaque entrée correspond à une route indexable
// (`path: ''` = /communes/<slug>, sinon /communes/<slug>/<path>).
//
// Les onglets sont DÉRIVÉS DES DONNÉES : une commune n'affiche un onglet que si
// le référentiel a de quoi le remplir. Pas d'onglet vide, pas d'URL indexable
// sans contenu - et un onglet apparaît tout seul le jour où la donnée arrive.
//
// RÉACTIVER UN ONGLET (budget, conseil municipal, projets, documents…) le jour
// où la donnée existe en base — 4 étapes, aucune ne dépend des autres modules :
//   1. exposer la donnée dans `server/utils/collectivites-geo.ts` (une requête
//      Directus de plus dans le `Promise.all`, puis un champ sur `CommuneGeo`) ;
//   2. ajouter le champ correspondant à `types/collectivite.ts` ;
//   3. ajouter une entrée ci-dessous avec son `isAvailable` (ex.
//      `isAvailable: (c) => c.budget !== null`) : l'onglet et son URL
//      apparaissent alors uniquement sur les communes qui ont la donnée ;
//   4. créer le composant dans `components/collectivites/tabs/` et l'enregistrer
//      dans la map `TAB_COMPONENTS` de `communes/[slug]/[tab].vue`.
// Les anciens gabarits de démonstration (Budget, Conseil, Territoire, Projets,
// Services, Documents, Actualités, Exécutif) restent récupérables dans git :
// `git log --diff-filter=D -- app/components/collectivites/tabs/Budget.vue`.
//
// NB : pas de référence au composant ici - Nuxt n'enregistre PAS globalement les
// composants auto-importés (l'auto-import est une analyse statique par fichier des
// balises littérales du template). Un `<component :is="'CollectivitesTabsContacts'">`
// construit depuis une chaîne ne résout donc RIEN (le composant n'a jamais été importé
// nulle part) : `communes/[slug]/[tab].vue` importe les composants explicitement et les
// mappe par clé (seul cas où l'import manuel est nécessaire dans ce module).
export interface CommuneTab {
  key: string;
  path: string;
  label: string;
  /** Donnée qui justifie l'onglet ; absente = onglet masqué. */
  isAvailable: (commune: CommuneGeo) => boolean;
}

export const COMMUNE_TABS: CommuneTab[] = [
  { key: 'apercu', path: '', label: 'Aperçu', isAvailable: () => true },
  { key: 'maire', path: 'maire', label: 'Le maire', isAvailable: (c) => Boolean(c.maire) },
  {
    key: 'secretariat',
    path: 'secretariat-municipal',
    label: 'Secrétariat municipal',
    isAvailable: (c) => Boolean(c.secretaireMunicipal),
  },
  {
    key: 'contacts',
    path: 'contacts',
    label: 'Contacts',
    isAvailable: (c) => Boolean(c.contact),
  },
];

export const getCommuneTabPath = (slug: string, tab: CommuneTab) =>
  `/collectivites-territoriales/communes/${slug}${tab.path ? `/${tab.path}` : ''}`;

/** Onglets réellement affichables pour cette collectivité. */
export const getVisibleCommuneTabs = (commune: CommuneGeo) =>
  COMMUNE_TABS.filter((tab) => tab.isAvailable(commune));
