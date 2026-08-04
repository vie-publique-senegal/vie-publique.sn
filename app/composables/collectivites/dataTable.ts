/**
 * Contrat de colonne du tableau du module (`CollectivitesDataTable`).
 *
 * Le composant est purement présentatif : il ne connaît ni les communes ni les
 * départements, il affiche ce que les colonnes lui donnent. Tout le formatage
 * (`formatNumber`, libellés, valeurs absentes) est décidé par l'appelant, ce qui
 * évite au tableau de contenir des règles métier qu'il faudrait dupliquer à
 * chaque nouvel usage.
 */
export interface DataTableColumn<T> {
  /** Identifiant technique (clé de rendu). */
  key: string;
  label: string;
  /**
   * Valeur affichée. `null` rend un tiret : une donnée absente du référentiel se
   * voit, elle n'est jamais remplacée par une valeur par défaut.
   */
  value: (row: T) => string | number | null;
  /**
   * Destination de la cellule. Renvoyer `null` pour une ligne dont la valeur
   * n'a pas de page (un maire sans slug, par exemple) : le texte s'affiche
   * alors sans lien plutôt qu'en lien cassé. La **première** colonne a
   * toujours un lien — celui de l'entité de la ligne, passé au composant.
   */
  to?: (row: T) => string | null;
  /** Alignement de la colonne — `right` pour les nombres (avec `tabular-nums`). */
  align?: 'left' | 'right';
  /**
   * Seconde ligne sous la valeur. N'a d'effet que sur la **première** colonne,
   * celle qui porte l'identité : c'est sa ligne de contexte.
   */
  hint?: (row: T) => string | null;
}
