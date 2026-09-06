/**
 * Contours statiques des circonscriptions (public/geo/), indexés par le slug du
 * référentiel géographique (`geo_slug` des payloads de carte : « departement-bambey »,
 * « commune-dakar-plateau-dakar ») — PAS par le slug de circonscription, qui reste la
 * clé des URLs publiques.
 *
 * ⚠️ Quatre communes n'ont aucune limite cartographiée et portent une géométrie Point
 * (`precision: 'approx_point'` dans le fichier source). Elles sont conservées ici avec
 * `kind: 'point'` : une commune absente de la structure disparaîtrait silencieusement de
 * la carte, ce qui se lit comme un oubli plutôt que comme une limite de la donnée.
 */

export type ContourLevel = 'departements' | 'communes';

const CONTOUR_SOURCES: Record<ContourLevel, string> = {
  departements: '/geo/senegal-departements.geojson',
  communes: '/geo/senegal-communes.geojson',
};

export interface ConstituencyContour {
  slug: string;
  name: string;
  /** pcode — présent sur les départements, absent des fichiers communaux */
  code: string | null;
  parent: string | null;
  /** `polygon` : `ring` exploitable ; `point` : aucun contour, seul `point` est renseigné */
  kind: 'polygon' | 'point';
  /** Anneau extérieur du polygone, en ordre GeoJSON [lng, lat] — vide si `kind: 'point'` */
  ring: number[][];
  /** Position [lng, lat] — renseignée uniquement si `kind: 'point'` */
  point: [number, number] | null;
}

interface GeoJsonFeature {
  properties?: {
    slug?: string;
    name?: string;
    code?: string | null;
    parent?: string | null;
  };
  geometry?: {
    type: 'Polygon' | 'MultiPolygon' | 'Point';
    coordinates: number[] | number[][][] | number[][][][];
  };
}

// Anneau extérieur : Polygon → premier anneau ; MultiPolygon → anneau du plus grand polygone
function extractOuterRing(geometry: GeoJsonFeature['geometry']): number[][] | null {
  if (!geometry?.coordinates?.length) return null;
  if (geometry.type === 'Polygon') {
    const ring = (geometry.coordinates as number[][][])[0];
    return ring?.length ? ring : null;
  }
  if (geometry.type === 'MultiPolygon') {
    let best: number[][] | null = null;
    for (const polygon of geometry.coordinates as number[][][][]) {
      const ring = polygon?.[0];
      if (ring?.length && (!best || ring.length > best.length)) {
        best = ring;
      }
    }
    return best;
  }
  return null;
}

/** Coordonnée d'une géométrie Point, ou null pour toute autre géométrie */
function extractPoint(geometry: GeoJsonFeature['geometry']): [number, number] | null {
  if (geometry?.type !== 'Point') return null;
  const coords = geometry.coordinates as number[];
  return typeof coords?.[0] === 'number' && typeof coords?.[1] === 'number'
    ? [coords[0], coords[1]]
    : null;
}

/** Centroïde approximatif (moyenne des points) d'un anneau de polygone [lng, lat] */
export function ringCentroid(ring: number[][]): [number, number] {
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
  }
  return ring.length ? [sumLng / ring.length, sumLat / ring.length] : [-14.4524, 14.4974];
}

/** Position représentative d'un contour, quelle que soit sa géométrie */
export function contourPosition(contour: ConstituencyContour): [number, number] | null {
  if (contour.kind === 'point') return contour.point;
  return contour.ring.length ? ringCentroid(contour.ring) : null;
}

export function useConstituencyContours() {
  const loadContours = async (level: ContourLevel): Promise<Map<string, ConstituencyContour>> => {
    const cache = useState<Record<string, ConstituencyContour> | null>(
      `constituency-contours-${level}`,
      () => null,
    );

    if (!cache.value) {
      try {
        const geojson = await $fetch<{ features: GeoJsonFeature[] }>(CONTOUR_SOURCES[level]);
        const entries: Record<string, ConstituencyContour> = {};
        for (const feature of geojson?.features || []) {
          const slug = feature.properties?.slug;
          if (!slug) continue;

          const ring = extractOuterRing(feature.geometry);
          const point = ring ? null : extractPoint(feature.geometry);
          // Ni polygone ni point exploitable : la feature n'est pas cartographiable
          if (!ring && !point) continue;

          entries[slug] = {
            slug,
            name: feature.properties?.name || slug,
            code: feature.properties?.code ?? null,
            parent: feature.properties?.parent ?? null,
            kind: ring ? 'polygon' : 'point',
            ring: ring ?? [],
            point,
          };
        }
        cache.value = entries;
      } catch (error) {
        console.error(`Erreur lors du chargement des contours ${level}:`, error);
        cache.value = {};
      }
    }

    return new Map(Object.entries(cache.value || {}));
  };

  return { loadContours };
}
