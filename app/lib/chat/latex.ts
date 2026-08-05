/**
 * Normalisation du LaTeX émis par le modèle — fonction pure, testée.
 *
 * Le modèle écrit les numéros d'actes en notation mathématique :
 * `la loi $n^{\circ}2023-18$ du 15 décembre 2023`. Ni le rendu markdown ni la
 * synthèse vocale ne savent quoi en faire : l'utilisateur lit le LaTeX brut, et
 * la lecture énoncerait « dollar n accent circonflexe accolade ». Comme le
 * corpus est fait de lois, décrets et arrêtés, le cas est TRÈS fréquent.
 *
 * ⚠️ **On ne touche PAS à tous les `$…$`.** Un montant en dollars écrit
 * « $100 et $200 » serait sinon avalé comme une formule. On n'ouvre donc une
 * expression que si son contenu porte une marque de LaTeX (`\`, `^` ou `_`).
 *
 * Le parti pris est de **dégrader en texte lisible**, pas de rendre des maths :
 * on ne veut pas d'un moteur de formules pour afficher « n° 2023-18 ».
 */

/**
 * Expression inline `$…$` dont le contenu comporte une marque de LaTeX.
 * Sans cette exigence, « $100 et $200 » matcherait sur « 100 et ».
 * Pas de saut de ligne : une expression inline ne traverse pas les paragraphes.
 */
const MATH_INLINE = /\$([^$\n]*[\\^_][^$\n]*)\$/g;

/** `$$…$$` — bloc mathématique, même traitement, délimiteurs plus longs. */
const MATH_BLOC = /\$\$([\s\S]*?)\$\$/g;

/** Le symbole degré, sous toutes les formes que produit le modèle. */
const DEGRE = /\^?\{?\s*\\circ\s*\}?/g;

/** Commandes d'espacement LaTeX : `\,` `\;` `\:` `\!` `\quad`… */
const ESPACES = /\\(?:,|;|:|!|quad|qquad|thinspace|ensuremath)\s*/g;

/** Enrobages purement typographiques dont seul le contenu nous intéresse. */
const ENROBAGES = /\\(?:text|mathrm|mathit|mathbf|textbf|textit|operatorname)\s*\{([^{}]*)\}/g;

/** Caractères échappés : `\%` `\$` `\&` `\_` `\#`. */
const ECHAPPES = /\\([%$&_#{}])/g;

/** Ce qui reste d'une commande inconnue : on garde son nom, pas l'antislash. */
const COMMANDE_RESIDUELLE = /\\([a-zA-Z]+)/g;

/**
 * Réduit une expression LaTeX à du texte lisible.
 * Reçoit le CONTENU de l'expression, sans ses délimiteurs.
 */
function reduireExpression(contenu: string): string {
  let sortie = contenu;

  sortie = sortie.replace(ENROBAGES, '$1');
  sortie = sortie.replace(DEGRE, '°');
  sortie = sortie.replace(ESPACES, ' ');
  sortie = sortie.replace(ECHAPPES, '$1');
  sortie = sortie.replace(COMMANDE_RESIDUELLE, '$1');

  // Exposants et indices simples : `^{2}` → `2`, `_{n}` → `n`. On perd la
  // typographie, on garde l'information — c'est le but.
  sortie = sortie.replace(/[\^_]\s*\{([^{}]*)\}/g, '$1').replace(/[\^_]\s*(\w)/g, '$1');

  // Accolades résiduelles : elles ne veulent plus rien dire à ce stade.
  sortie = sortie.replace(/[{}]/g, '');

  // « n°2023-18 » → « n° 2023-18 » : le modèle colle le numéro au symbole.
  sortie = sortie.replace(/°(?=[0-9])/g, '° ');

  return sortie.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Remplace les expressions LaTeX d'un texte par leur équivalent lisible.
 * Idempotente : un texte sans LaTeX ressort inchangé.
 */
export function normaliserLatex(texte: string): string {
  if (!texte || !texte.includes('$')) return texte;

  return texte
    .replace(MATH_BLOC, (_, contenu: string) => reduireExpression(contenu))
    .replace(MATH_INLINE, (_, contenu: string) => reduireExpression(contenu));
}
