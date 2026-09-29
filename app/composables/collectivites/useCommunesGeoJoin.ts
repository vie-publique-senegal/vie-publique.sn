import type { CommuneGeo } from '~~/types/collectivite';
import { normalizeGeoName, slugifyGeoName } from '#shared/geo-name';

/**
 * Rapprochement entre le référentiel Directus et le fond cartographique.
 *
 * `geo_entities` ne porte aucune géométrie et les fichiers de `public/geo/` ne
 * portent aucun identifiant Directus : le pont se fait par nom de commune +
 * département, la seule clé commune aux deux sources. Mesuré sur le référentiel
 * complet : 553 rapprochements sur 558. Les 5 manquants sont les « villes »
 * (Dakar, Pikine, Guédiawaye, Rufisque, Thiès), qui n'existent pas dans le fond
 * — celui-ci ne contient que le niveau `commune`.
 *
 * On lit le fichier des CENTROÏDES (111 Ko) et non celui des polygones (1 Mo) :
 * les deux portent les mêmes `slug`/`name`/`parent`, et seul le second est utile
 * au rendu.
 */

interface LabelFeature {
  properties?: {
    slug?: string;
    name?: string;
    /** Slug du département porteur, de la forme `departement-<nom>`. */
    parent?: string;
  };
  geometry?: { type?: string; coordinates?: [number, number] };
}

/** Rattachement d'une commune du référentiel à sa feature cartographique. */
export interface RattachementGeo {
  geoSlug: string;
  deptSlug: string;
  /** Centroïde [lng, lat] — sert à cadrer la carte sur un département. */
  centre: [number, number];
}

const PREFIXE_DEPARTEMENT = 'departement-';

/** Clé de rapprochement : nom normalisé + département slugifié. */
const cle = (nom: string, departement: string) =>
  `${normalizeGeoName(nom)}|${slugifyGeoName(departement)}`;

export const useCommunesGeoJoin = () => {
  // Asset statique : chargé côté client uniquement (`public/` n'est pas
  // atteignable depuis le rendu serveur). Échec = aucun rapprochement, jamais
  // d'erreur : la carte se contente d'annoncer 0 collectivité cartographiée.
  const { data } = useFetch<{ features: LabelFeature[] }>(
    '/geo/senegal-communes-labels.geojson',
    {
      key: 'geo-communes-labels',
      server: false,
      default: () => ({ features: [] }),
    },
  );

  const index = computed(() => {
    const parCle = new Map<string, RattachementGeo>();
    for (const feature of data.value?.features ?? []) {
      const { slug, name, parent } = feature.properties ?? {};
      const centre = feature.geometry?.coordinates;
      if (!slug || !name || !centre || !parent?.startsWith(PREFIXE_DEPARTEMENT)) continue;
      parCle.set(cle(name, parent.slice(PREFIXE_DEPARTEMENT.length)), {
        geoSlug: slug,
        deptSlug: parent,
        centre,
      });
    }
    return parCle;
  });

  /** Rattachement d'une commune, ou `null` si le fond ne la connaît pas. */
  const rattacher = (commune: CommuneGeo): RattachementGeo | null =>
    index.value.get(cle(commune.nom, commune.departement)) ?? null;

  /**
   * Emprise [[ouest, sud], [est, nord]] des centroïdes d'un département.
   *
   * Calculée sur TOUTES ses communes, pas sur celles que la page affiche : ce
   * sont bien toutes ses communes qui sont dessinées au drill-down, cadrer sur
   * un sous-ensemble filtré laisserait le reste hors champ.
   */
  const empriseDepartement = (deptSlug: string): [[number, number], [number, number]] | null => {
    const centres = [...index.value.values()]
      .filter((r) => r.deptSlug === deptSlug)
      .map((r) => r.centre);
    if (!centres.length) return null;
    const lngs = centres.map(([lng]) => lng);
    const lats = centres.map(([, lat]) => lat);
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
  };

  return { rattacher, empriseDepartement, index };
};
