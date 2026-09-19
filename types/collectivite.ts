// Types du module Collectivités territoriales.
//
// Tout vient du référentiel Directus (`geo_entities` et ses satellites, les
// mandats de `public_person_appointments`) :
// ce qui n'est pas encore en base vaut `null` et n'est JAMAIS inventé.
// Les noms de champs restent en français côté front ; la convention snake_case
// anglais ne s'applique qu'aux collections CMS.

/** Élu ou agent rattaché à une collectivité par un mandat en cours. */
export interface CommuneResponsable {
  /** Id de la personne — nécessaire à l'URL `/personnalites/<id>/<slug>`. */
  id: number;
  nom: string;
  slug: string | null;
  photo: string | null;
  sexe: string | null;
  /** Intitulé du mandat tel que saisi (« Maire de Ndiaganiao »). */
  fonction: string | null;
  /** Date de prise de fonction (ISO), quand elle est connue. */
  depuis: string | null;
}

/**
 * Compte officiel d'une collectivité sur un réseau social.
 * `plateforme` est l'identifiant stable du repeater `geo_entities.social_networks`
 * (`facebook`, `twitter`, `linkedin`, `tiktok`, `youtube`, `instagram`) — une
 * plateforme inconnue s'affiche quand même, avec son identifiant en guise de nom.
 */
export interface CommuneReseauSocial {
  plateforme: string;
  url: string;
}

export interface CommuneContact {
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  siteWeb: string | null;
  /** Vide quand aucun compte n'est renseigné — jamais `null`. */
  reseauxSociaux: CommuneReseauSocial[];
}

export interface CommuneGeo {
  id: number;
  slug: string;
  nom: string;
  type: 'Commune' | 'Ville';
  region: string;
  /** Slug public de la région — clé de `/collectivites-territoriales/regions/<slug>`. */
  regionSlug: string;
  departement: string;
  /**
   * Slug public du département de rattachement — la clé de l'URL hub
   * `/collectivites-territoriales/departements/<slug>`. Chaîne vide quand le
   * référentiel ne rattache la collectivité à aucun département.
   */
  departementSlug: string;
  arrondissement: string | null;
  chefLieu: boolean;
  population: number | null;
  populationAnnee: number | null;
  // Pas de géométrie ici : le référentiel n'en porte aucune. La carte rapproche
  // elle-même chaque commune de son polygone dans `public/geo/` par nom +
  // département (cf. useCommunesGeoJoin) : 553 des 558 collectivités y figurent,
  // les 5 « villes » n'ayant pas de contour propre dans le fond.
  maire: CommuneResponsable | null;
  secretaireMunicipal: CommuneResponsable | null;
  contact: CommuneContact | null;
  // Identifiants de fichiers Directus (à passer à <CmsImage>), pas des URLs.
  logo: string | null;
  photoCouverture: string | null;
}

/**
 * Département tel qu'exposé par le hub `/collectivites-territoriales/departements`.
 *
 * Ce n'est PAS une entité lue telle quelle : le module ne liste que des
 * collectivités de base (cf. `COLLECTIVITE_LEVELS`). Un département est ici
 * l'agrégat de ses communes — d'où des compteurs qui disent leur propre
 * dénominateur (`avecPopulation`, `avecMaire`) plutôt qu'une population
 * « officielle » qu'on n'a pas.
 */
export interface DepartementGeo {
  slug: string;
  nom: string;
  region: string;
  regionSlug: string;
  /** Collectivités de base rattachées (communes + villes). */
  nbCollectivites: number;
  /** Somme des populations connues ; `null` si aucune commune n'est renseignée. */
  population: number | null;
  /** Année de recensement la plus récente parmi les populations agrégées. */
  populationAnnee: number | null;
  /** Dénominateur du cumul : combien de collectivités ont une population. */
  avecPopulation: number;
  avecMaire: number;
}

/**
 * Région telle qu'exposée par le hub `/collectivites-territoriales/regions`.
 *
 * Même statut que `DepartementGeo` : un agrégat des collectivités de base, pas
 * une entité lue telle quelle. Les compteurs disent leur dénominateur plutôt que
 * d'afficher un total qui aurait l'air complet.
 */
export interface RegionGeo {
  slug: string;
  nom: string;
  /** Départements rattachés (3 à 5 selon la région). */
  nbDepartements: number;
  /** Collectivités de base rattachées (communes + villes). */
  nbCollectivites: number;
  /** Somme des populations connues ; `null` si aucune commune n'est renseignée. */
  population: number | null;
  /** Année de recensement la plus récente parmi les populations agrégées. */
  populationAnnee: number | null;
  avecPopulation: number;
  avecMaire: number;
}

/** Renvoi minimal vers une commune : de quoi la chercher et la lier. */
export interface DepartementCommuneRef {
  nom: string;
  slug: string;
  maire: string | null;
}

/**
 * Département + ses communes en version allégée. Seul le hub en a besoin : sa
 * recherche porte aussi sur les noms de communes et de maires, qu'il faut donc
 * avoir sous la main. Les autres consommateurs restent sur `DepartementGeo`.
 */
export interface DepartementAvecCommunes extends DepartementGeo {
  communes: DepartementCommuneRef[];
}
