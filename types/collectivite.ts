// Types du module Collectivités territoriales.
//
// Tout vient du référentiel Directus (`geo_entities` et ses satellites, les
// mandats de `public_person_appointments`, le profil `public_entity_profiles`) :
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

export interface CommuneContact {
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  siteWeb: string | null;
}

export interface CommuneGeo {
  id: number;
  slug: string;
  nom: string;
  type: 'Commune' | 'Ville';
  region: string;
  departement: string;
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
