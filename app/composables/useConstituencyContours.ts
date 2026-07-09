/**
 * Contours statiques des circonscriptions (public/geo/), indexés par slug.
 * Remplace la lecture des polygones depuis l'API carte : les endpoints ne
 * servent plus Position, la jointure se fait par constituencie.slug côté front.
 */

export type ContourLevel = 'departements' | 'communes';

const CONTOUR_SOURCES: Record<ContourLevel, string> = {
  departements: '/geo/senegal-departements.geojson',
  communes: '/geo/senegal-communes-contours.geojson',
};

export interface ConstituencyContour {
  slug: string;
  name: string;
  code: string | null;
  parent: string | null;
  /** Anneau extérieur du polygone, en ordre GeoJSON [lng, lat] */
  ring: number[][];
}

interface GeoJsonFeature {
  properties: { slug?: string; name?: string; code?: string | null; parent?: string | null };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
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
          const ring = extractOuterRing(feature.geometry);
          if (!slug || !ring) continue;
          entries[slug] = {
            slug,
            name: feature.properties?.name || slug,
            code: feature.properties?.code ?? null,
            parent: feature.properties?.parent ?? null,
            ring,
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
