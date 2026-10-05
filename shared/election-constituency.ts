/**
 * Circonscriptions municipales des élections locales.
 *
 * Aux locales, une **ville** (Dakar, Pikine, Guédiawaye, Rufisque, Thiès : `nationale_type`
 * = `ville`) se traite comme une commune — un résultat et une liste gagnante propres — et se
 * rattache à son département via le référentiel géographique (`geo_entity`), comme une commune.
 * Seule différence : une ville n'a pas de contour dans `public/geo/` (son territoire est celui
 * de ses communes), elle n'apparaît donc pas sur les choroplèthes communales.
 */
/** Vrai pour une circonscription communale ou de ville (`nationale_type`). */
export const isMunicipalConstituencyType = (nationaleType: string | null | undefined): boolean =>
  nationaleType === 'commune' || nationaleType === 'ville';

/** Libellé affiché d'une circonscription municipale : « Ville de Dakar » pour une ville. */
export const municipalConstituencyLabel = (
  name: string,
  nationaleType: string | null | undefined,
): string => (nationaleType === 'ville' ? `Ville de ${name}` : name);
