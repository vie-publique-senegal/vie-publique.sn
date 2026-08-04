import { formatNumber } from '#shared/format';

/**
 * Contrat d'un repère chiffré du module (`CollectivitesStatStrip`).
 *
 * Comme `DataTableColumn`, le composant est purement présentatif : il ne connaît
 * ni les régions ni les départements, il affiche « valeur en gras + libellé
 * gris ». Les libellés (accords au pluriel, mentions de source) sont décidés par
 * l'appelant, seul à savoir ce que le chiffre signifie.
 */
export interface Repere {
  /** Identifiant technique (clé de rendu). */
  key: string;
  /**
   * Texte gris AVANT la valeur, quand le chiffre n'ouvre pas la phrase
   * (« Région de » suivi du nom de la région).
   */
  prefix?: string;
  /** Nombre formaté par le composant, ou chaîne déjà prête. */
  value: string | number;
  /** Texte gris après la valeur (« départements », « habitants (RGPH 2023) »). */
  label?: string;
  /**
   * Rend `value` + `label` cliquables : un repère qui correspond à un hub EST
   * l'entrée de ce hub. Les repères sans page (population) n'en ont pas.
   */
  to?: string;
}

/** Agrégat géo tel qu'exposé par les hubs : région ou département. */
interface AgregatGeo {
  nbCollectivites: number;
  population: number | null;
  populationAnnee: number | null;
  /** Dénominateur du cumul : combien de collectivités ont une population. */
  avecPopulation: number;
}

/** « N collectivités », accordé. */
export function repereCollectivites(nb: number, key = 'collectivites'): Repere {
  return { key, value: nb, label: `collectivité${nb > 1 ? 's' : ''}` };
}

/** « N départements », accordé. */
export function repereDepartements(nb: number, key = 'departements'): Repere {
  return { key, value: nb, label: `département${nb > 1 ? 's' : ''}` };
}

/**
 * Repère de population d'un agrégat (région ou département), ou aucun repère si
 * le référentiel n'en connaît aucune — mieux vaut ne rien afficher qu'un zéro.
 *
 * Le cumul est dit explicitement partiel quand toutes les collectivités ne sont
 * pas renseignées : on préfère le dire qu'afficher un total qui paraît complet.
 * Renvoie un tableau pour se spread directement dans une liste de repères.
 */
export function reperesPopulation(agregat: AgregatGeo, key = 'population'): Repere[] {
  if (agregat.population === null) return [];
  const complet = agregat.avecPopulation === agregat.nbCollectivites;
  return [
    {
      key,
      value: agregat.population,
      label: complet
        ? `habitants (RGPH ${agregat.populationAnnee})`
        : `habitants (RGPH ${agregat.populationAnnee}, sur ${agregat.avecPopulation} des ${agregat.nbCollectivites} collectivités)`,
    },
  ];
}

/**
 * Compteur de résultats affiché pendant une recherche, ou aucun repère hors
 * recherche : « 558 résultats » sans terme cherché n'apprend rien.
 */
export function reperesResultats(
  actif: boolean,
  nb: number,
  singulier = 'résultat',
  pluriel = `${singulier}s`,
): Repere[] {
  if (!actif) return [];
  return [{ key: 'resultats', value: nb, label: nb > 1 ? pluriel : singulier }];
}

/** Formatage commun à toutes les valeurs de repère (milliers séparés). */
export function formatRepereValue(value: string | number): string {
  return typeof value === 'number' ? formatNumber(value) : value;
}
