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
  // Pas de coordonnées ici : le référentiel ne porte aucune géométrie. La carte
  // rapproche elle-même les centroïdes de `public/geo/senegal-communes.geojson`
  // (cf. CommunesMap.vue), qui n'en couvre qu'une partie.
  maire: CommuneResponsable | null;
  secretaireMunicipal: CommuneResponsable | null;
  contact: CommuneContact | null;
  // Identifiants de fichiers Directus (à passer à <CmsImage>), pas des URLs.
  logo: string | null;
  photoCouverture: string | null;
}
