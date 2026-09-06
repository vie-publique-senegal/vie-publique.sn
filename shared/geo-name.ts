/**
 * Graphies des noms géographiques / de circonscription (partagé serveur + client).
 *
 * Depuis la bascule vers le référentiel versionné, un même département existe sous DEUX
 * graphies :
 * - celle des fichiers électoraux (`election_constituencies.name`) : MAJUSCULES sans accents
 *   (« KEDOUGOU », « MALEM HODAR », « NIORO DU RIP ») ;
 * - celle du référentiel (`geo_entities.name_current`, Journal officiel) : accentuée et parfois
 *   orthographiée autrement (« Kédougou », « Malem Hoddar », « Nioro »).
 *
 * ⚠️ Les deux règles ci-dessous ne sont PAS interchangeables :
 * - `normalizeGeoName` sert à COMPARER deux graphies (résolution d'un nom reçu en entrée) ;
 * - `toHistoricalGeoName` sert à ÉCRIRE une valeur d'URL. La route
 *   `/elections-senegal/carte-electorale/nationale/<departement>` est indexée en graphie
 *   historique : tout lien construit dans l'application doit continuer à l'émettre.
 *
 * `normalizeGeoName` ne réconcilie que la casse, les accents et la ponctuation : « MALEM HODAR »
 * et « Malem Hoddar » restent deux clés distinctes. C'est pourquoi la résolution serveur indexe
 * les DEUX graphies d'une circonscription (voir `server/utils/electionConstituencyLookup.ts`).
 */

/** Diacritiques laissés par la décomposition NFD. */
const DIACRITICS = /[̀-ͯ]/g;

/**
 * Clé de comparaison tolérante : minuscules, sans accents, toute ponctuation et tout blanc
 * réduits à un espace simple. « Saint-Louis », « SAINT LOUIS » et « saint  louis » → « saint louis ».
 */
export function normalizeGeoName(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Graphie historique des fichiers électoraux : MAJUSCULES sans accents, ponctuation d'origine
 * conservée (les tirets de « SAINT-LOUIS » comptent), blancs normalisés.
 */
export function toHistoricalGeoName(value: string | null | undefined): string {
  if (!value) return '';
  return value.normalize('NFD').replace(DIACRITICS, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

/** Racine de la carte électorale nationale. */
export const NATIONAL_MAP_PATH = '/elections-senegal/carte-electorale/nationale';

/**
 * Chemin de la page de détail d'un département, en graphie historique.
 *
 * SEUL constructeur de cette valeur d'URL : les deux graphies répondent côté serveur, mais
 * l'application n'en émet qu'une (celle déjà indexée), et la canonical de la page s'aligne
 * dessus pour éviter le contenu dupliqué.
 */
export function nationalDepartmentPath(department: string | null | undefined): string {
  return `${NATIONAL_MAP_PATH}/${encodeURIComponent(toHistoricalGeoName(department))}`;
}
