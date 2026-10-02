/**
 * Construction des URLs de la carte électorale nationale.
 *
 * L'implémentation vit dans `shared/geo-name.ts` (source de vérité partagée avec le serveur,
 * qui résout les noms reçus) ; ce fichier ne fait que ré-exporter pour conserver l'auto-import
 * côté app.
 *
 * ⚠️ `nationalDepartmentPath` est le SEUL constructeur autorisé du segment
 * `/elections-senegal/carte-electorale/nationale/<departement>`. Ne pas remettre de
 * `.toUpperCase()` local : il laisse passer les accents (« Kédougou » → « KÉDOUGOU ») et
 * produit une URL qui n'est pas celle indexée.
 */
import { NATIONAL_MAP_PATH, nationalDepartmentPath, toHistoricalGeoName } from '#shared/geo-name';

export { NATIONAL_MAP_PATH, nationalDepartmentPath, toHistoricalGeoName };

export const useElectoralMapUrl = () => ({
  NATIONAL_MAP_PATH,
  nationalDepartmentPath,
  toHistoricalGeoName,
});
