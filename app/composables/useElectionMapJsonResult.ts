// composables/useElectionMapDataResult.ts
import type { DepartmentStats } from "~~/types/election-map-national";
import type { ConstituencyContour } from "./useConstituencyContours";

interface GeoData {
  id: number;
  coalition_gagnante?: {
    name: string;
    color: string;
    logo: string;
    head_of_list?: { id: number | null; slug: string | null; first_name: string | null; last_name: string | null } | null;
  };
  constituencie?: {
    name: string;
    slug?: string | null;
    /** Slug du référentiel géographique — clé de jointure des contours */
    geo_slug?: string | null;
    region: string;
    type: string;
    nationale_type: string;
    population: number;
  };
  election?: {
    type: string;
    year: number;
  };
  winning_list?: {
    is_substitute: boolean;
    candidates: {
      first_name: string;
      last_name: string;
      position: number;
    }[];
  };
  voters?: number;
  // Position n'est plus servie que par la réponse fallback legacy (collection carte)
  Position?: {
    type: string;
    coordinates: number[][][];
  };
  // Fallback for legacy fields
  departement?: string;
  region?: string;
}

interface TransformedRegion {
  id: number;
  departement: string;
  region: string;
  winnerName: string;
  winnerColor: string;
  winnerLogo: string;
  headOfList: string;
  voters: number;
  coordinates: [number, number][];
  stats?: DepartmentStats | null;
  type: "Polygon";
}

export interface TableResultItem {
  id: number;
  commune: string;
  coalition: string;
  coalitionColor: string;
  headOfList: string;
  votes: number;
  departement?: string;
  region?: string;
}

export function useElectionMapDataResult() {
  // État global pour le cache des données
  const geoData = useState<GeoData[]>("geo-data-result", () => []);
  const loading = useState<boolean>("geo-data-result-loading", () => false);
  const isGeoDataLoaded = useState<boolean>(
    "geo-data-result-loaded",
    () => false,
  );

  // Promise partagée pour éviter les fetch concurrents
  let loadingPromise: Promise<GeoData[]> | null = null;

  // Charger les données géographiques depuis l'API serveur Nuxt
  const loadGeoDataWithWinner = async (): Promise<GeoData[]> => {
    if (isGeoDataLoaded.value) return geoData.value;
    // Si un fetch est déjà en cours, attendre qu'il se termine plutôt que de retourner []
    if (loadingPromise) return loadingPromise;

    loading.value = true;
    loadingPromise = (async () => {
      try {
        const response = await $fetch<{ data: GeoData[] }>('/api/carte/result');
        const data = (response?.data || response) as GeoData[];
        geoData.value = Array.isArray(data) ? data : [];
        isGeoDataLoaded.value = true;
        return geoData.value;
      } catch (error) {
        console.error(
          "Erreur lors du chargement des données de résultats:",
          error,
        );
        return [];
      } finally {
        loading.value = false;
        loadingPromise = null;
      }
    })();
    return loadingPromise;
  };

  // Obtenir les données géographiques
  const getGeoData = async () => {
    if (!isGeoDataLoaded.value) {
      await loadGeoDataWithWinner();
    }
    return geoData.value;
  };

  const getFilteredData = (geoData: GeoData[], electionType: string, electionYear: number) => {
      return geoData.filter((item) => {
         const constData = item.constituencie;
         if (!constData) return false;

         // 1. FILTER BY ELECTION CONTEXT
         if (!item.election) return false;
         if (item.election.type !== electionType || item.election.year !== electionYear) {
             return false;
         }

         // 2. FILTER BY CONSTITUENCY TYPE
         if (electionType === 'locale') {
             return constData.type === 'national' && constData.nationale_type === 'commune';
         } else {
             return constData.type === 'national' && constData.nationale_type === 'departement';
         }
      });
  }

  const { loadContours } = useConstituencyContours();

  const formatPersonName = (person?: { first_name?: string | null; last_name?: string | null } | null): string =>
    person ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() : '';

  /**
   * Tête de liste : locale (communes) lit winning_list.candidates (plusieurs
   * listes d'une même coalition peuvent concourir dans une commune) ; les
   * autres scrutins (législatives, présidentielle) lisent
   * coalition_gagnante.head_of_list (M2O direct sur la coalition).
   */
  const resolveHeadOfList = (item: GeoData, electionType: string): string => {
    if (electionType === 'locale') {
      if (item.winning_list && !item.winning_list.is_substitute && item.winning_list.candidates) {
        const head = item.winning_list.candidates.find((c) => c.position === 1);
        if (head) return `${head.first_name} ${head.last_name}`;
      }
      return "";
    }
    return formatPersonName(item.coalition_gagnante?.head_of_list);
  };

  // Transformer les coordonnées pour Leaflet
  const transformCoordinates = (
    geoData: GeoData[],
    electionType: string,
    electionYear: number,
    contours?: Map<string, ConstituencyContour>,
  ): TransformedRegion[] => {
    return getFilteredData(geoData, electionType, electionYear)
      .map((item) => {
        const constData = item.constituencie!;

        // Contours statiques joints par le slug du référentiel géographique ;
        // Position en secours (réponse fallback legacy)
        const contourRing = constData.geo_slug ? contours?.get(constData.geo_slug)?.ring : undefined;
        const coordsRaw = contourRing?.length ? contourRing : item.Position?.coordinates?.[0] || [];
        const coordinates: [number, number][] = Array.isArray(coordsRaw)
            ? coordsRaw.map((coord: number[]) => [coord[1], coord[0]] as [number, number]) // Flip to [lat, lng]
            : [];

        const headOfList = resolveHeadOfList(item, electionType);

        return {
          id: item.id,
          departement: constData.name || item.departement || "Inconnu",
          region: constData.region || item.region || "",
          winnerName: item.coalition_gagnante?.name || "",
          winnerColor: item.coalition_gagnante?.color || "#cccccc",
          winnerLogo: item.coalition_gagnante?.logo || "",
          headOfList,
          voters: item.voters || 0,
          coordinates: coordinates,
          type: "Polygon" as const,
        };
      })
      .filter(item => item.coordinates.length > 0);
  };

  // Transform data for Table
  const transformTableData = (geoData: GeoData[], electionType: string, electionYear: number): TableResultItem[] => {
      return getFilteredData(geoData, electionType, electionYear)
        .map((item) => {
            const constData = item.constituencie;

            const headOfList = resolveHeadOfList(item, electionType) || "Non défini";

            return {
                id: item.id,
                commune: constData?.name || "Inconnu",
                coalition: item.coalition_gagnante?.name || "Sans coalition",
                coalitionColor: item.coalition_gagnante?.color || "#cccccc",
                headOfList: headOfList,
                votes: item.voters || 0,
                departement: item.departement || "",
                region: constData?.region || item.region || "",
            };
        });
  }

  // Obtenir les données complètes de la carte
  const getMapDataResult = async (electionType: string = 'legislative', electionYear: number) => {
    const contourLevel = electionType === 'locale' ? 'communes' : 'departements';
    const [, contours] = await Promise.all([getGeoData(), loadContours(contourLevel)]);
    return transformCoordinates(geoData.value, electionType, electionYear, contours);
  };

  // Get Table Data
  const getTableDataResult = async (electionType: string = 'legislative', electionYear: number) => {
      await getGeoData();
      return transformTableData(geoData.value, electionType, electionYear);
  }

  return {
    getGeoData,
    getMapDataResult,
    getTableDataResult,
    loading: computed(() => loading.value),
    isLoaded: computed(() => isGeoDataLoaded.value)
  };
}
