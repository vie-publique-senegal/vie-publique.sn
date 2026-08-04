import { cleanCmsText } from '#shared/clean-text';

/**
 * Nettoyage d'une phrase AVANT de la passer à la synthèse — fonction pure, testée.
 *
 * La réponse du modèle est écrite pour être LUE À L'ÉCRAN : markdown, liens,
 * tableaux, renvois de sources. Passée telle quelle à un synthétiseur, elle donne
 * « astérisque astérisque le déficit astérisque astérisque, crochet un crochet,
 * h-t-t-p-s deux-points… ». On retire donc la mise en forme.
 *
 * **Les sources s'affichent, elles ne s'énoncent pas.** Elles sont déjà rendues
 * en cartes cliquables sous la réponse (événement `sources` du flux) : les lire
 * à voix haute serait une répétition interminable d'URLs.
 *
 * ⚠️ AUCUNE expansion d'abréviation ici (« Mds » → « milliards », « % » → « pour
 * cent »). Ce serait spécifique au français, alors que le wolof est la cible
 * d'une version suivante — et les synthétiseurs le font déjà selon leur langue.
 * Ce module doit rester agnostique de la langue.
 */

/** Marqueurs de ligne : titres, listes, citations, filets horizontaux. */
const DEBUTS_DE_LIGNE = /^\s*(?:#{1,6}\s+|>+\s*|[-*+]\s+|\d+[.)]\s+)/gm;
const FILET_HORIZONTAL = /^\s*([-*_])\s*(?:\1\s*){2,}$/gm;

export function nettoyerPourLecture(texte: string): string {
  let sortie = texte;

  // 1. Blocs de code : illisibles à voix haute, et souvent TRONQUÉS puisqu'on
  //    travaille phrase par phrase (la clôture ``` peut n'être jamais arrivée).
  //    La 2ᵉ passe emporte la ligne d'ouverture ENTIÈRE : sans elle, le nom du
  //    langage survit et se fait lire (« json »).
  sortie = sortie.replace(/```[\s\S]*?```/g, ' ').replace(/```[^\n]*/g, ' ');

  // 2. Liens. La syntaxe maison `[[libellé]](url)` héritée du chat Azure passe
  //    AVANT la syntaxe standard, sinon `[[x]]` se dégrade en `[x]`.
  sortie = sortie
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images : ni l'alt ni l'URL
    .replace(/\[\[([^\]]*)\]\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // 3. URLs nues. Une adresse épelée caractère par caractère est du bruit pur.
  sortie = sortie.replace(/\bhttps?:\/\/\S+/gi, ' ').replace(/\bwww\.\S+/gi, ' ');

  // 4. Renvois de sources : `[1]`, `[1, 2]`, `[^3]`. Les cartes les affichent.
  sortie = sortie.replace(/\[\^?\d+(?:\s*,\s*\d+)*\]/g, ' ');

  // 5. Tableaux : la ligne de séparation ne se lit pas, les pipes deviennent des
  //    virgules pour garder une prosodie de liste.
  sortie = sortie
    .replace(/^\s*\|?[\s:-]*\|[\s|:-]*$/gm, ' ')
    .replace(/\s*\|\s*/g, ', ')
    .replace(/(,\s*){2,}/g, ', ');

  // 6. Marqueurs de ligne, puis emphase et code inline.
  sortie = sortie
    .replace(FILET_HORIZONTAL, ' ')
    .replace(DEBUTS_DE_LIGNE, '')
    .replace(/(\*\*|__|~~|\*|_|`)/g, '');

  // 7. `cleanCmsText` en dernier : strip HTML résiduel, décodage des entités,
  //    écrasement des blancs — et surtout `.normalize('NFKC')`, qui replie le
  //    pseudo-gras Unicode (𝐎𝐛𝐣𝐞𝐭 → Objet). Le corpus en contient (règle §11
  //    du CLAUDE.md) et un synthétiseur le rendrait inaudible ou muet.
  sortie = cleanCmsText(sortie);

  // 8. Blanc orphelin devant un point ou une virgule, laissé par une suppression
  //    (« atteint 5 % [2, 3]. » → « atteint 5 % . »). Limité à `.` et `,` : le
  //    français met une espace avant `; : ! ?`, et rien ne justifie d'y toucher.
  sortie = sortie.replace(/\s+([.,])/g, '$1');

  // Virgules et tirets orphelins laissés par le découpage (bords de tableau,
  // marqueurs retirés). Les deux-points de fin sont CONSERVÉS : ils portent une
  // pause utile à l'oral, et rien ne les prononce.
  return sortie
    .replace(/^[\s,;:–—-]+/, '')
    .replace(/[\s,;–—-]+$/, '')
    .trim();
}

/**
 * Y a-t-il quelque chose à dire ? Une phrase réduite à de la ponctuation après
 * nettoyage (une ligne de tableau, un filet, une URL seule) ne doit pas être
 * envoyée au moteur : elle produirait un silence, ou pire un « point ».
 */
export function vautLaPeineDEtreLu(texte: string): boolean {
  return /[\p{L}\p{N}]/u.test(texte);
}
