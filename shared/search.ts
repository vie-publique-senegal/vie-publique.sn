// Recherche texte partagée serveur/client (importable via #shared/search).
import { normalizeGeoName } from './geo-name';

/**
 * Vrai si l'une des valeurs contient la recherche, sans tenir compte de la casse, des
 * accents ni de la ponctuation (« guediawaye » trouve « Guédiawaye », « hann bel air »
 * trouve « HANN-BEL AIR »). Une recherche vide laisse tout passer.
 */
export function matchesSearch(query: string | null | undefined, ...values: unknown[]): boolean {
  const needle = normalizeGeoName(query);
  if (!needle) return true;
  return values.some((value) =>
    normalizeGeoName(value === null || value === undefined ? '' : String(value)).includes(needle),
  );
}
