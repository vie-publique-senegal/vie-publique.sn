// app/config/map-collectivites.ts — Configuration carte du module Collectivités
// territoriales (annuaire + page carte plein écran).
//
// Deux usages, deux configurations distinctes :
//   - annuaire et carte plein écran : drill-down à deux niveaux, les 46
//     départements colorés par population cumulée, puis au clic les communes du
//     département ouvert ;
//   - fiche d'une collectivité (`focusSlug`) : le contour de CETTE collectivité
//     et rien d'autre, sans drill-down ni popup (cf. `configFiche`).
//
// Le référentiel Directus (`geo_entities`) ne porte AUCUNE géométrie : les
// polygones viennent de `public/geo/senegal-communes.geojson` et
// `senegal-departements.geojson`, rapprochés par nom (cf. useCommunesGeoJoin).
import type {
  SenegalMapConfig,
  MapDatasetConfig,
  ColorScale,
  RGBAColor,
} from '~~/types/map';
import type { CommuneGeo } from '~~/types/collectivite';

/** Commune du référentiel, augmentée de son rattachement au fond géographique. */
export interface CommuneMappee extends CommuneGeo {
  /** Slug de la feature dans `senegal-communes.geojson` (`commune-<nom>-<dept>`). */
  geoSlug: string;
  /** Slug du département porteur (`departement-<nom>`), clé du drill-down. */
  deptSlug: string;
  /** Centroïde [lng, lat] de la commune, pour cadrer la caméra. */
  centre: [number, number];
}

/** Agrégat d'un département, construit à partir des communes affichées. */
export interface DepartementAgrege {
  deptSlug: string;
  nom: string;
  region: string;
  nombreCommunes: number;
  population: number;
  avecMaire: number;
}

const SANS_DONNEE: RGBAColor = [120, 120, 120, 60];

/** Rampe unique pour les deux niveaux : seuls les seuils changent. */
const RAMPE: RGBAColor[] = [
  [224, 242, 254, 190],
  [125, 211, 252, 195],
  [56, 189, 248, 200],
  [2, 132, 199, 205],
  [12, 74, 110, 210],
];

const echelle = (seuils: number[], libelles: string[]): ColorScale => ({
  type: 'threshold',
  stops: seuils.map((value, i) => ({ value, color: RAMPE[i]!, label: libelles[i] })),
  fallback: SANS_DONNEE,
});

// Seuils choisis sur la distribution réelle du RGPH 2023 : la moitié des communes
// est sous 15 000 habitants, une rampe linéaire écraserait tout dans la 1re teinte.
const ECHELLE_COMMUNES = echelle(
  [0, 10_000, 25_000, 60_000, 150_000],
  ['< 10 k', '10–25 k', '25–60 k', '60–150 k', '> 150 k'],
);
const ECHELLE_DEPARTEMENTS = echelle(
  [0, 150_000, 300_000, 600_000, 1_200_000],
  ['< 150 k', '150–300 k', '300–600 k', '600 k–1,2 M', '> 1,2 M'],
);

/** Remplissage de la collectivité sur sa propre fiche. */
const ACCENT: RGBAColor = [2, 132, 199, 150];

export interface CollectivitesMapOptions {
  /** Communes affichées, déjà filtrées par la page et rapprochées du fond géo. */
  communes: CommuneMappee[];
  /** Agrégats départementaux dérivés des mêmes communes. */
  departements: DepartementAgrege[];
  /** Département ouvert (slug geo), ou `null` pour la vue nationale. */
  departementOuvert: string | null;
  /** Slug public de la commune à mettre en avant, le cas échéant. */
  focusSlug?: string;
  theme?: 'dark' | 'light';
}

function datasetDepartements(o: CollectivitesMapOptions): MapDatasetConfig<DepartementAgrege> {
  return {
    id: 'collectivites-departements',
    label: 'Départements',
    icon: '🗺️',
    type: 'choropleth',
    geoSource: 'departements',
    data: o.departements,
    joinField: 'deptSlug',
    geoJoinField: 'slug',
    getValue: (d) => d.population,
    colorScale: ECHELLE_DEPARTEMENTS,
    pickable: true,
    popup: {
      title: (d) => d.nom,
      fields: [
        { key: 'region', label: 'Région', format: 'text' },
        { key: 'nombreCommunes', label: 'Collectivités', format: 'number' },
        { key: 'population', label: 'Population', format: 'number', suffix: ' hab.' },
        {
          key: 'avecMaire',
          label: 'Maires renseignés',
          formatter: (value, d) => `${value} / ${d.nombreCommunes}`,
        },
      ],
      actions: [{ label: 'Voir les communes', icon: '🔍', event: 'drill-down' }],
    },
  };
}

function datasetCommunes(o: CollectivitesMapOptions): MapDatasetConfig<CommuneMappee> {
  return {
    id: 'collectivites-communes',
    label: 'Communes',
    icon: '🏛️',
    type: 'choropleth',
    geoSource: 'communes',
    // Sans ce filtre, deck.gl dessinerait les 553 polygones du pays à chaque
    // rebuild de couche (zoom, thème) pour n'en montrer qu'une vingtaine.
    geoFilter: (feature) => feature.properties?.parent === o.departementOuvert,
    data: o.communes,
    joinField: 'geoSlug',
    geoJoinField: 'slug',
    colorScale: ECHELLE_COMMUNES,
    getValue: (d) => d.population ?? 0,
    pickable: true,
    popup: {
      // Un polygone sans commune jointe (filtre actif, ou fiche d'une seule
      // commune) renvoie les propriétés brutes de la feature : on retombe sur
      // son nom plutôt que d'afficher un popup sans titre.
      title: (d) => d.nom ?? (d as unknown as { properties?: { name?: string } }).properties?.name ?? '',
      fields: [
        { key: 'type', label: 'Statut', format: 'text' },
        { key: 'departement', label: 'Département', format: 'text' },
        {
          key: 'population',
          label: 'Population',
          format: 'number',
          suffix: ' hab.',
        },
        {
          key: 'maire',
          label: 'Maire',
          formatter: (value) => (value as CommuneGeo['maire'])?.nom ?? 'Non renseigné',
        },
      ],
      actions: [{ label: 'Voir la fiche', icon: '→', event: 'ouvrir-fiche' }],
    },
  };
}

/**
 * Carte d'une fiche : le contour de CETTE collectivité, rien d'autre.
 *
 * Aucun drill-down, aucun popup, aucune légende — la fiche répond déjà à toutes
 * ces questions dans le texte au-dessus. La carte n'est là que pour situer.
 */
function configFiche(o: CollectivitesMapOptions): SenegalMapConfig {
  const focus = o.communes.find((c) => c.slug === o.focusSlug);

  return {
    title: focus?.nom ?? 'Localisation',
    showTitle: false,
    theme: o.theme ?? 'light',
    center: focus?.centre ?? [-14.4524, 14.4974],
    zoom: 9,
    interactionMode: 'flat',
    geoSources: ['communes'],
    datasets: [
      {
        id: 'collectivites-fiche',
        label: 'Territoire',
        type: 'choropleth',
        geoSource: 'communes',
        // Sans polygone propre (les 5 villes), on trace les communes du
        // département : leur réunion couvre le territoire de la ville.
        geoFilter: focus
          ? (feature) => feature.properties?.slug === focus.geoSlug
          : (feature) => feature.properties?.parent === o.departementOuvert,
        data: focus ? [focus] : [],
        joinField: 'geoSlug',
        geoJoinField: 'slug',
        // Couleur unique : il n'y a rien à comparer sur une carte à une entité.
        getColor: () => ACCENT,
        pickable: false,
      },
    ],
    controls: { zoom: true, navigation: true },
  };
}

export function buildCollectivitesMapConfig(o: CollectivitesMapOptions): SenegalMapConfig {
  if (o.focusSlug) return configFiche(o);

  const auNiveauCommune = o.departementOuvert !== null;
  const departement = o.departements.find((d) => d.deptSlug === o.departementOuvert);

  return {
    title: auNiveauCommune
      ? `Communes du département de ${departement?.nom ?? ''}`
      : 'Collectivités territoriales du Sénégal',
    // L'annuaire comme la page carte portent déjà leur en-tête au coin haut
    // gauche : le bandeau du moteur ferait doublon. Le titre reste celui de
    // l'export PNG.
    showTitle: false,
    theme: o.theme ?? 'light',
    center: [-14.4524, 14.4974],
    zoom: 6.4,
    interactionMode: 'flat',
    // Les libellés de commune du moteur ne sont pas chargés : ce sont les
    // polygones eux-mêmes qui portent les noms à ce niveau.
    geoSources: auNiveauCommune ? ['departements', 'communes'] : ['departements'],
    datasets: [auNiveauCommune ? datasetCommunes(o) : datasetDepartements(o)],
    legend: {
      title: auNiveauCommune ? 'Population de la commune' : 'Population du département',
      type: 'gradient',
      colorScale: auNiveauCommune ? ECHELLE_COMMUNES : ECHELLE_DEPARTEMENTS,
      position: 'bottom-right',
    },
    controls: {
      zoom: true,
      navigation: true,
      themeToggle: true,
      export: true,
    },
  };
}
