// Recherche texte partagée serveur/client (importable via #shared/search).
import { normalizeGeoName } from './geo-name';

/**
 * Vrai si les valeurs contiennent CHAQUE mot de la recherche (dans n'importe quel ordre),
 * sans tenir compte de la casse, des accents ni de la ponctuation : « guediawaye » trouve
 * « Guédiawaye », « hann bel air » trouve « HANN-BEL AIR », « coumba sene » trouve
 * « Coumba Ndoffène SENE ». Les valeurs sont parcourues ensemble (« dakar benno » trouve la
 * ligne commune DAKAR / coalition Benno). Une recherche vide laisse tout passer.
 */
export function matchesSearch(query: string | null | undefined, ...values: unknown[]): boolean {
  const needle = normalizeGeoName(query);
  if (!needle) return true;
  const haystack = values
    .map((value) => normalizeGeoName(value === null || value === undefined ? '' : String(value)))
    .join(' ');
  return needle.split(' ').every((word) => haystack.includes(word));
}
