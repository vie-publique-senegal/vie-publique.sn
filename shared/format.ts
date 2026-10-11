// Formatage partagé serveur/client (importable via #shared/format).

/** Séparateurs de milliers à la française : 18126342 → « 18 126 342 ». */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

/** Pourcentage (exprimé sur 100) à la française, 1 décimale au plus : 56.44 → « 56,4 % ». */
export function formatPercent(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(
    n / 100,
  );
}
