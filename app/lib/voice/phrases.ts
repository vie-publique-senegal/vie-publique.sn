/**
 * Découpage d'un flux de tokens en PHRASES — fonction pure, testée avant l'UI.
 *
 * Pourquoi ce fichier existe : si on attend la fin de la génération pour lire la
 * réponse, on entend le premier mot plusieurs secondes après l'avoir lu, et le
 * streaming ne sert plus à rien. On bufferise donc les tokens et on émet chaque
 * phrase dès qu'elle est complète.
 *
 * C'est aussi l'endroit où une régression est INVISIBLE à l'œil : sur un réseau
 * rapide les tokens arrivent en gros morceaux bien ponctués et tout « marche » ;
 * en production ils tombent n'importe où — au milieu d'un nombre, entre les deux
 * points d'une abréviation. D'où des tests, comme pour le parseur SSE.
 *
 * ⚠️ Ce module ne connaît AUCUN moteur et ne fait AUCUN nettoyage : il rend du
 * markdown brut, que `texte-parle.ts` nettoie ensuite. Deux responsabilités, deux
 * fichiers, deux jeux de tests.
 */

const PONCTUATION_FORTE = new Set(['.', '!', '?', '…', ':', ';']);

/**
 * Caractères qui peuvent suivre la ponctuation sans annuler la fin de phrase :
 * guillemets fermants, parenthèses… et les marqueurs markdown `*` / `_`, parce
 * que le modèle écrit couramment `**Le déficit se creuse.**`.
 */
const FERMANTS = new Set(['"', '»', '’', "'", ')', ']', '}', '*', '_', '`']);

/**
 * Abréviations après lesquelles un point n'est PAS une fin de phrase.
 *
 * Liste volontairement courte et calée sur le corpus réellement indexé (lois de
 * finances, rapports de la Cour des comptes, conseils des ministres) : chaque
 * entrée superflue retarde la première phrase lue, puisqu'elle empêche une coupe.
 */
const ABREVIATIONS = new Set([
  'm',
  'mm',
  'mme',
  'mmes',
  'mgr',
  'dr',
  'pr',
  'art',
  'al',
  'p',
  'pp',
  'cf',
  'ex',
  'etc',
  'fig',
  'tab',
  'chap',
  'vol',
  'av',
  'apr',
  'ed',
  'éd',
  'réf',
  'ref',
  'env',
  'no',
  'n°',
]);

export interface OptionsTamponPhrases {
  /**
   * En deçà, on ne coupe pas : on fusionne avec la suite. Évite d'énoncer
   * « Oui. » seul, puis de marquer un silence — la lecture devient hachée.
   */
  longueurMin?: number;
  /**
   * Au-delà, on coupe au dernier espace même sans ponctuation. Sans ce garde-fou,
   * un paragraphe mal ponctué (ou un tableau markdown) ne serait JAMAIS lu.
   */
  longueurMax?: number;
}

export interface TamponPhrases {
  /** Ajoute un fragment et rend les phrases devenues complètes (souvent aucune). */
  pousser(fragment: string): string[];
  /** Rend ce qui reste, à la fin du flux. Vide le tampon. */
  vider(): string[];
}

export function creerTamponPhrases(options: OptionsTamponPhrases = {}): TamponPhrases {
  const longueurMin = options.longueurMin ?? 40;
  const longueurMax = options.longueurMax ?? 300;

  let reste = '';

  const assezLong = (fin: number) => reste.slice(0, fin).trim().length >= longueurMin;

  /**
   * Un point précédé d'une abréviation ou d'une initiale isolée ne termine pas la
   * phrase : « M. Diop », « art. 3 », « A. Sarr ».
   */
  function estAbreviation(index: number): boolean {
    if (reste[index] !== '.') return false;

    let debut = index;
    while (debut > 0 && /[\p{L}\p{N}°]/u.test(reste[debut - 1]!)) debut -= 1;

    const mot = reste.slice(debut, index).toLowerCase();
    if (!mot) return false;

    // Initiale isolée (une LETTRE seule). Un chiffre seul, lui, est un item de
    // liste numérotée (« 1. Le premier point ») : la longueur minimale s'en charge.
    if (mot.length === 1 && /\p{L}/u.test(mot)) return true;

    return ABREVIATIONS.has(mot);
  }

  /** Index de coupe (exclusif), ou -1 si aucune frontière sûre n'est visible. */
  function chercherCoupe(): number {
    for (let i = 0; i < reste.length; i += 1) {
      const caractere = reste[i]!;

      // Fin de ligne : titre, item de liste, fin de paragraphe. Frontière sûre.
      if (caractere === '\n') {
        if (assezLong(i)) return i;
        continue;
      }

      if (!PONCTUATION_FORTE.has(caractere)) continue;

      let j = i + 1;
      while (j < reste.length && FERMANTS.has(reste[j]!)) j += 1;

      // Rien après : on ne peut pas encore trancher. « 3. » peut devenir « 3.5 ».
      // On attend le fragment suivant plutôt que de couper au milieu d'un nombre.
      if (j >= reste.length) break;

      // Pas de blanc derrière → décimale (« 8.0 »), URL, acronyme. Pas une fin.
      if (!/\s/.test(reste[j]!)) continue;

      if (estAbreviation(i)) continue;
      if (!assezLong(j)) continue;

      return j;
    }

    return -1;
  }

  /** Dernier recours : couper au dernier espace de la fenêtre autorisée. */
  function coupeForcee(): number {
    if (reste.length <= longueurMax) return -1;
    const dernierEspace = reste.slice(0, longueurMax).lastIndexOf(' ');
    return dernierEspace > 0 ? dernierEspace : longueurMax;
  }

  return {
    pousser(fragment) {
      reste += fragment;

      const phrases: string[] = [];
      for (;;) {
        let coupe = chercherCoupe();
        if (coupe === -1) coupe = coupeForcee();
        if (coupe === -1) break;

        const phrase = reste.slice(0, coupe).trim();
        reste = reste.slice(coupe).replace(/^\s+/, '');
        if (phrase) phrases.push(phrase);
      }
      return phrases;
    },

    vider() {
      const phrase = reste.trim();
      reste = '';
      return phrase ? [phrase] : [];
    },
  };
}
