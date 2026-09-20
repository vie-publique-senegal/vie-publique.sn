// Formatage partagé serveur/client (importable via #shared/format).

/** Séparateurs de milliers à la française : 18126342 → « 18 126 342 ». */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}
