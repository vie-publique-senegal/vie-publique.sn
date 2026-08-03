// Normalisation des noms d'entités géographiques — partagée serveur/client
// (importable via #shared/geo-name, même mécanisme que #shared/clean-text).
//
// Reproduit `name_normalized` côté Directus : minuscules, sans accents,
// ponctuation de liaison repliée en espace. C'est la clé de rapprochement entre
// le référentiel (`geo_entities`) et les sources externes qui n'orthographient
// pas pareil (« Dakar-Plateau » / « Dakar Plateau », « Mermoz–Sacré-Cœur »).

export function normalizeGeoName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/['’`´\-–—_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Slug URL dérivé d'un nom d'entité (« Mermoz–Sacré-Cœur » → mermoz-sacre-coeur). */
export function slugifyGeoName(value: string): string {
  return normalizeGeoName(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
