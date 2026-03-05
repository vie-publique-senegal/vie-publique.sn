// composables/useElectionMapData.ts
import type { Ref } from 'vue';
import type {
  PollingStation,
  DepartmentStats,
} from "~~/types/election-map-national";
import type { DepartmentGroup } from "~~/types/election-map";

interface GeoData {
  departement: string;
  region: string;
  voters: number;
  offices: number;
  places: number;
  municipality: number;
  population: number;
  id: number;
  Position?: {
    type: string;
    coordinates: number[][][];
  };
  coordinates?: {
    type: string;
    coordinates: number[][][];
  } | number[][][];
  coalition_gagnante?: {
    id: number;
    name: string;
    color?: string;
  };
  election?: {
    id: number;
    type: string;
    year: number;
  };
}

interface TransformedRegion {
  id: number;
  departement: string;
  region: string;
  voters: number;
  offices: number;
  places: number;
  municipality: number;
  population: number;
  coordinates: [number, number][];
  stats?: DepartmentStats | null;
}

export function useElectionMapData(electionId?: Ref<string | number | null> | string | number | null) {
  const currentElectionId = computed(() => {
    const value = isRef(electionId) ? electionId.value : electionId;
    if (value === null || value === undefined) return null;
    const numValue = typeof value === 'string' ? parseInt(value) : value;
    return isNaN(numValue) ? null : numValue;
  });

  const cacheKey = computed(() => `geo-data-${currentElectionId.value || 'all'}`);
  const geoData = useState<GeoData[]>(cacheKey.value, () => []);
  const isGeoDataLoaded = useState<boolean>(`geo-data-loaded-${currentElectionId.value || 'all'}`, () => false);

  const loadGeoData = async (forceReload = false) => {
    if (isGeoDataLoaded.value && !forceReload) return geoData.value;

    try {
      const params = new URLSearchParams();
      if (currentElectionId.value) {
        params.set('election', currentElectionId.value.toString());
      }
      const url = `/api/carte${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await $fetch<GeoData[] | { data: GeoData[] }>(url);

      geoData.value = Array.isArray(response) ? response : (response.data || []);
      isGeoDataLoaded.value = true;
      return geoData.value;
    } catch (error) {
      console.error("Erreur lors du chargement des données géographiques:", error);
      return [];
    }
  };

  const getGeoData = async () => {
    if (!isGeoDataLoaded.value) {
      await loadGeoData();
    }
    return geoData.value;
  };

  watch(currentElectionId, async (newId, oldId) => {
    if (newId !== oldId) {
      isGeoDataLoaded.value = false;
      await loadGeoData(true);
    }
  });

  const extractCoordinates = (item: GeoData): number[][][] | null => {
    if (item.Position?.coordinates?.[0]?.length > 0) {
      return item.Position.coordinates;
    }
    if (item.coordinates && typeof item.coordinates === 'object' && 'coordinates' in item.coordinates) {
      const coords = (item.coordinates as { coordinates: number[][][] }).coordinates;
      if (coords?.[0]?.length > 0) return coords;
    }
    if (Array.isArray(item.coordinates) && item.coordinates[0]?.length > 0) {
      return item.coordinates as number[][][];
    }
    return null;
  };

  const transformCoordinates = (geoData: GeoData[]): TransformedRegion[] => {
    return geoData
      .filter((item) => extractCoordinates(item) !== null)
      .map((item) => {
        const coords = extractCoordinates(item)!;
        return {
          id: item.id,
          departement: item.departement,
          region: item.region,
          voters: item.voters,
          offices: item.offices,
          places: item.places,
          municipality: item.municipality,
          population: item.population,
          coordinates: coords[0].map((coord) => [coord[1], coord[0]]) as [number, number][],
        };
      });
  };

  const getDepartmentStats = (department?: string) => {
    const url = "/api/elections/map/department-stats";
    const params = department ? { department } : {};

    return useFetch<{ data: DepartmentStats[] } | DepartmentStats>(url, {
      key: department ? `department-stats-${department}` : "departments-stats",
      params,
      transform: (response) => {
        if (department && response && !Array.isArray(response)) {
          return response;
        }
        return Array.isArray(response) ? response : response.data;
      },
      server: true,
    });
  };

  const getMapData = async () => {
    const [geoDataResult, { data: stats }] = await Promise.all([
      getGeoData(),
      getDepartmentStats(),
    ]);

    const transformedGeoData = transformCoordinates(geoDataResult);

    return transformedGeoData.map((geo) => ({
      ...geo,
      stats: stats.value?.find((s) => s.department === geo.departement) || null,
    }));
  };

  const colorCache = new Map();

  const getRegionColor = (regionId: number, baseHue: number = 150, saturation: number = 0.5) => {
    const cacheKey = `${regionId}-${baseHue}-${saturation}`;

    if (colorCache.has(cacheKey)) {
      return colorCache.get(cacheKey);
    }

    const totalRegions = geoData.value.length || 46;
    const lightness = 0.35 + (0.3 * (regionId % totalRegions)) / totalRegions;
    const color = hslToHex(baseHue, saturation, lightness);

    colorCache.set(cacheKey, color);
    return color;
  };

  const getDepartmentDetails = (department: string) => {
    const url = `/api/elections/map/department-details/${encodeURIComponent(department)}`;

    return useFetch<{ data: PollingStation[] }>(url, {
      key: `department-details-${department}`,
      transform: (response) => response.data,
      server: true,
    });
  };

  const loadDepartmentPolygons = async (): Promise<TransformedRegion[]> => {
    const deptCacheKey = 'department-polygons';
    const cachedPolygons = useState<TransformedRegion[]>(deptCacheKey, () => []);
    const isPolygonsLoaded = useState<boolean>(`${deptCacheKey}-loaded`, () => false);

    if (isPolygonsLoaded.value && cachedPolygons.value.length > 0) {
      return cachedPolygons.value;
    }

    try {
      const response = await $fetch<GeoData[] | { data: GeoData[] }>('/api/carte');
      const allData = Array.isArray(response) ? response : (response.data || []);

      const nationalEntries = allData.filter(item => {
        if (item.election?.type === 'locale') return false;
        if (!extractCoordinates(item)) return false;
        if (!item.departement?.trim()) return false;
        return true;
      });

      const deptMap = new Map<string, GeoData>();
      for (const item of nationalEntries) {
        const key = item.departement.trim().toLowerCase();
        const existing = deptMap.get(key);
        if (!existing) {
          deptMap.set(key, item);
        } else if (item.voters > existing.voters) {
          deptMap.set(key, item);
        }
      }

      const deptEntries = Array.from(deptMap.values());
      const transformed = transformCoordinates(deptEntries);

      cachedPolygons.value = transformed;
      isPolygonsLoaded.value = true;
      return transformed;
    } catch (error) {
      return [];
    }
  };

  const calculateCentroid = (regions: TransformedRegion[]): [number, number] => {
    let totalLat = 0;
    let totalLng = 0;
    let count = 0;

    for (const region of regions) {
      for (const [lat, lng] of region.coordinates) {
        totalLat += lat;
        totalLng += lng;
        count++;
      }
    }

    return count > 0
      ? [totalLat / count, totalLng / count]
      : [14.4974, -14.4524];
  };

  const groupByDepartment = (regions: TransformedRegion[]): DepartmentGroup[] => {
    const deptMap = new Map<string, TransformedRegion[]>();

    for (const region of regions) {
      const key = region.departement;
      if (!deptMap.has(key)) deptMap.set(key, []);
      deptMap.get(key)!.push(region);
    }

    const groups: DepartmentGroup[] = [];
    let colorIndex = 0;
    const totalDepts = deptMap.size || 1;

    for (const [deptName, municipalities] of deptMap) {
      const totalVoters = municipalities.reduce((s, m) => s + (m.voters || 0), 0);
      const totalOffices = municipalities.reduce((s, m) => s + (m.offices || 0), 0);
      const totalPlaces = municipalities.reduce((s, m) => s + (m.places || 0), 0);
      const totalPopulation = municipalities.reduce((s, m) => s + (m.population || 0), 0);
      const centroid = calculateCentroid(municipalities);

      const lightness = 0.35 + (0.3 * colorIndex) / totalDepts;
      const color = hslToHex(150, 0.5, lightness);
      colorIndex++;

      groups.push({
        departement: deptName,
        region: municipalities[0].region,
        municipalities: municipalities.map((m) => ({
          id: m.id,
          municipality: String(m.municipality),
          departement: m.departement,
          region: m.region,
          voters: m.voters,
          offices: m.offices,
          places: m.places,
          population: m.population,
          coordinates: m.coordinates,
        })),
        totalVoters,
        totalOffices,
        totalPlaces,
        totalPopulation,
        municipalityCount: municipalities.length,
        centroid,
        color,
      });
    }

    return groups;
  };

  return {
    getGeoData,
    getDepartmentStats,
    getMapData,
    getRegionColor,
    getDepartmentDetails,
    transformCoordinates,
    groupByDepartment,
    loadDepartmentPolygons,
  };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) [r, g, b] = [c, x, 0];
  else if (60 <= h && h < 120) [r, g, b] = [x, c, 0];
  else if (120 <= h && h < 180) [r, g, b] = [0, c, x];
  else if (180 <= h && h < 240) [r, g, b] = [0, x, c];
  else if (240 <= h && h < 300) [r, g, b] = [x, 0, c];
  else if (300 <= h && h < 360) [r, g, b] = [c, 0, x];

  const toHex = (n: number): string => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
