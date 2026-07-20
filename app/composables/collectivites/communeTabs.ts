// Onglets de la fiche commune — chaque entrée correspond à une route indexable
// (`path: ''` = /communes/<slug>, sinon /communes/<slug>/<path>).
// NB : pas de référence au composant ici — Nuxt n'enregistre PAS globalement les
// composants auto-importés (l'auto-import est une analyse statique par fichier des
// balises littérales du template). Un `<component :is="'CollectivitesTabsBudget'">`
// construit depuis une chaîne ne résout donc RIEN (le composant n'a jamais été importé
// nulle part) : `communes/[slug]/[tab].vue` importe les composants explicitement et les
// mappe par clé (seul cas où l'import manuel est nécessaire dans ce module).
export interface CommuneTab {
  key: string;
  path: string;
  label: string;
}

export const COMMUNE_TABS: CommuneTab[] = [
  { key: 'apercu', path: '', label: 'Aperçu' },
  { key: 'maire', path: 'maire', label: 'Le Maire' },
  { key: 'executif', path: 'executif', label: 'Exécutif' },
  { key: 'conseil', path: 'conseil', label: 'Conseil' },
  { key: 'territoire', path: 'territoire', label: 'Territoire' },
  { key: 'budget', path: 'budget', label: 'Budget' },
  { key: 'projets', path: 'projets', label: 'Projets' },
  { key: 'services', path: 'services', label: 'Services' },
  { key: 'documents', path: 'documents', label: 'Documents' },
  { key: 'actualites', path: 'actualites', label: 'Actualités' },
  { key: 'contacts', path: 'contacts', label: 'Contacts' },
];

export const getCommuneTabPath = (slug: string, tab: CommuneTab) =>
  `/collectivites-territoriales/communes/${slug}${tab.path ? `/${tab.path}` : ''}`;
