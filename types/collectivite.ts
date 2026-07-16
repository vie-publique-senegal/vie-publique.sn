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
