// Types du module Collectivités territoriales (annuaire des communes).
// Port fidèle du prototype vpsn-collectivites (senegal-local-guide/src/data/communes.ts).
// Données statiques TS (pas de collection Directus pour l'instant) → les noms de
// champs restent en français, la convention snake_case anglais ne s'applique qu'au CMS.

export type Parti = 'APR' | 'BBY' | 'PASTEF' | 'PDS' | 'Yewwi' | 'Indépendant';

export interface Adjoint {
  nom: string;
  fonction: string;
  telephone?: string;
}

export interface Conseiller {
  nom: string;
  parti: Parti;
  groupe: 'Majorité' | 'Opposition' | 'Indépendant';
  commission?: string;
}

export interface ResultatElectoral {
  scrutin: 'Présidentielle' | 'Législatives' | 'Locales' | 'Référendum';
  annee: number;
  participation: number;
  vainqueur: string;
  score: number;
}

export interface Projet {
  titre: string;
  categorie: 'Routes' | 'Éducation' | 'Santé' | 'Eau' | 'Éclairage' | 'Marché' | 'Environnement';
  statut: 'En cours' | 'Terminé' | 'À venir';
  budget?: number;
}

export interface DocumentOfficiel {
  titre: string;
  type:
    | 'Délibération'
    | 'Arrêté'
    | 'Rapport'
    | 'Budget'
    | 'Compte administratif'
    | 'PDC'
    | "Appel d'offres";
  date: string;
}

export interface Actualite {
  titre: string;
  date: string;
  extrait: string;
  categorie: 'Actualité' | 'Communiqué' | 'Décision' | 'Conseil municipal';
}

export interface Commune {
  slug: string;
  nom: string;
  region: string;
  departement: string;
  arrondissement?: string;
  chefLieu: boolean;
  type: 'Commune' | 'Ville' | "Commune d'arrondissement";
  codeAdministratif: string;
  population: number;
  superficie: number; // km²
  densite: number;
  altitude: number;
  latitude: number;
  longitude: number;
  dateCreation: string;
  photoCouverture: string;
  // Clés de `COMMUNE_TABS` à masquer pour cette commune (ex: pas de conseil élu → ['conseil']).
  tabsMasques?: string[];
  mairie: {
    adresse: string;
    telephone: string;
    email: string;
    siteWeb?: string;
    facebook?: string;
    horaires: string;
  };
  maire: {
    nom: string;
    sexe: 'H' | 'F';
    dateNaissance: string;
    profession: string;
    parti: Parti;
    dateElection: string;
    debutMandat: string;
    finMandat: string;
    nombreMandats: number;
    biographie: string;
    photo?: string;
  };
  adjoints: Adjoint[];
  secretaireMunicipal: { nom: string; telephone?: string };
  conseillers: Conseiller[];
  territoire: {
    villages: number;
    quartiers: number;
    conseilsQuartier: number;
    postesSante: number;
    ecoles: number;
    marches: number;
    postesPolice: number;
    brigadesGendarmerie: number;
  };
  resultats: ResultatElectoral[];
  budget: {
    annee: number;
    total: number; // millions FCFA
    recettes: number;
    depenses: number;
    investissement: number;
    fonctionnement: number;
    dette: number;
  };
  projets: Projet[];
  services: string[];
  documents: DocumentOfficiel[];
  actualites: Actualite[];
  chiffresCles: {
    tauxAlphabetisation: number;
  };
}

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
