// types/election.ts

// Type pour les données brutes
export interface PollingStation {
  id: number;
  polling_place: string;
  office_number: number;
  voters: number;
  implantation: string;
  municipality: string;
  department: string;
  region: string;
}

// Type pour les statistiques agrégées par département
export interface DepartmentStats {
  /** Nom affiché — graphie du référentiel géographique (Journal officiel) */
  department: string;
  /**
   * Graphie des fichiers électoraux, clé d'URL historique de la carte électorale.
   * À utiliser pour construire les liens et la canonical (cf. `shared/geo-name.ts`) ;
   * elle ne se déduit pas de `department` quand l'orthographe a changé.
   */
  electoral_name?: string | null;
  region: string;
  count_polling_place: number;
  count_office_number: number;
  sum_voters: number;
  countDistinct_municipality: number;
}

// Type pour les données détaillées d'un département
export interface DepartmentDetails {
  data: PollingStation[];
}

// Type pour la réponse de l'API avec agrégation
export interface DepartmentStatsResponse {
  data: DepartmentStats[];
}
