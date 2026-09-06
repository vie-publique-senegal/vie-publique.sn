<script setup lang="ts">
/**
 * Carte électorale unifiée (deck.gl via SenegalMap), pilotée par mode :
 * - offices : bureaux/électeurs par département (fichier électoral) ;
 * - results : gagnant par département (élections nationales) ;
 * - results-locale : gagnant par commune — vue initiale agrégée par département
 *   (majorité des communes), clic = drill-down zoomé sur les communes de ce
 *   département (539 communes d'un coup était illisible).
 *
 * Les contours viennent de public/geo/, joints par le slug du référentiel géographique
 * (`geo_slug`). Le slug de circonscription reste la clé des URLs et du classement.
 * Remplace les cartes Leaflet des pages elections-senegal ; les composants
 * legacy restent utilisés par les pages elections/legislatives.
 */
import {
  buildElectionMapConfig,
  aggregateResultsByDepartment,
  type ElectionMapMode,
  type OfficeMapItem,
  type ResultMapItem,
} from '~/config/map-elections';
import { useConstituencyContours, contourPosition } from '~/composables/useConstituencyContours';

interface Props {
  mode: ElectionMapMode;
  electionId?: string | number | null;
  electoralFileId?: string | number | null;
  title?: string;
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  electionId: null,
  electoralFileId: null,
  title: '',
  height: '600px',
});

const emit = defineEmits<{
  'map-ready': [];
  'map-error': [];
  'department-selected': [department: Record<string, unknown>];
  'open-ranking': [constituency: { slug: string; name: string }];
}>();

interface NationalStatsRow {
  department: string | null;
  slug: string | null;
  geo_slug: string | null;
  population: number | null;
  region: string | null;
  count?: Record<string, string>;
  sum?: Record<string, string>;
  countDistinct?: Record<string, string>;
}

interface ResultRow {
  id: number;
  voters: number | null;
  voters_count?: number | null;
  null_ballots?: number | null;
  valid_votes?: number | null;
  participation_rate?: number | null;
  winning_votes?: number | null;
  winning_percentage?: number | null;
  round_2_voters_count?: number | null;
  round_2_null_ballots?: number | null;
  round_2_valid_votes?: number | null;
  round_2_participation_rate?: number | null;
  round_2_winning_votes?: number | null;
  round_2_winning_percentage?: number | null;
  coalition_gagnante?: {
    name?: string | null;
    color?: string | null;
    head_of_list?: {
      id: number | null;
      slug: string | null;
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
  round_2_coalition_gagnante?: {
    name?: string | null;
    color?: string | null;
    head_of_list?: {
      id: number | null;
      slug: string | null;
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
  constituencie?: {
    name: string;
    slug?: string | null;
    geo_slug?: string | null;
    nationale_type?: string | null;
    parent?: { name?: string | null; slug?: string | null; geo_slug?: string | null } | null;
  } | null;
  winning_list?: {
    is_substitute?: boolean;
    candidates?: { position?: number; first_name?: string; last_name?: string }[];
  } | null;
}

const asInt = (value: string | undefined) => parseInt(value || '0') || 0;

const formatPersonName = (
  person?: { first_name?: string | null; last_name?: string | null } | null,
): string => (person ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() : '');

/**
 * Tête de liste : mode results-locale (communes) lit winning_list.candidates
 * (plusieurs listes d'une même coalition peuvent concourir dans une commune) ;
 * les autres scrutins (results, national) lisent coalition_gagnante.head_of_list
 * (M2O direct sur la coalition).
 */
const headOfList = (row: ResultRow, mode: ElectionMapMode): string => {
  if (mode === 'results-locale') {
    const list = row.winning_list;
    if (!list || list.is_substitute || !Array.isArray(list.candidates)) return '';
    const head = list.candidates.find((c) => c.position === 1);
    return formatPersonName(head);
  }
  return formatPersonName(row.coalition_gagnante?.head_of_list);
};

const dataKey = computed(
  () => `election-map-${props.mode}-${props.electionId ?? ''}-${props.electoralFileId ?? ''}`,
);

const { data: items, status } = useAsyncData(
  dataKey,
  async (): Promise<OfficeMapItem[] | ResultMapItem[]> => {
    if (props.mode === 'offices') {
      const params: Record<string, string> = { groupBy: 'department' };
      if (props.electoralFileId) params.electoral_file = String(props.electoralFileId);
      else if (props.electionId) params.election = String(props.electionId);

      const response = await $fetch<{ data: NationalStatsRow[] }>('/api/elections/map/national', {
        params,
      });
      return (response?.data || [])
        .filter((row) => row.geo_slug && row.department)
        .map((row) => ({
          slug: row.slug ?? row.geo_slug!,
          geoSlug: row.geo_slug!,
          name: row.department!,
          region: row.region,
          voters: asInt(row.sum?.voters),
          offices: asInt(row.count?.office_number),
          places: asInt(row.countDistinct?.polling_place),
          municipalities: asInt(row.countDistinct?.municipality),
          population: row.population,
        }));
    }

    const params: Record<string, string> = {};
    if (props.electionId) params.election = String(props.electionId);
    const rows = await $fetch<ResultRow[]>('/api/carte/result', { params });
    const wantedLevel = props.mode === 'results-locale' ? 'commune' : 'departement';
    return (rows || [])
      .filter(
        (row) => row.constituencie?.geo_slug && row.constituencie?.nationale_type === wantedLevel,
      )
      .map((row) => ({
        slug: row.constituencie!.slug ?? row.constituencie!.geo_slug!,
        geoSlug: row.constituencie!.geo_slug!,
        name: row.constituencie!.name,
        winnerName: row.coalition_gagnante?.name || '',
        winnerColor: row.coalition_gagnante?.color || '',
        headOfList: headOfList(row, props.mode),
        voters: row.voters || 0,
        parentSlug: row.constituencie?.parent?.slug ?? null,
        parentGeoSlug: row.constituencie?.parent?.geo_slug ?? null,
        parentName: row.constituencie?.parent?.name ?? null,
        votersCount: row.voters_count ?? null,
        nullBallots: row.null_ballots ?? null,
        validVotes: row.valid_votes ?? null,
        participationRate: row.participation_rate ?? null,
        winningVotes: row.winning_votes ?? null,
        winningPercentage: row.winning_percentage ?? null,
        round2WinnerName: row.round_2_coalition_gagnante?.name || null,
        round2WinnerColor: row.round_2_coalition_gagnante?.color || null,
        round2VotersCount: row.round_2_voters_count ?? null,
        round2NullBallots: row.round_2_null_ballots ?? null,
        round2ValidVotes: row.round_2_valid_votes ?? null,
        round2ParticipationRate: row.round_2_participation_rate ?? null,
        round2WinningVotes: row.round_2_winning_votes ?? null,
        round2WinningPercentage: row.round_2_winning_percentage ?? null,
      }));
  },
  { watch: [dataKey], server: false, default: () => [] },
);

watch(
  status,
  (newStatus) => {
    if (newStatus === 'error') emit('map-error');
    else if (newStatus === 'success') {
      if ((items.value || []).length === 0) emit('map-error');
      else emit('map-ready');
    }
  },
  { immediate: true },
);

// ─── Drill-down du mode résultats locaux : départements → communes ──────────
// Vue initiale : agrégat par
// département (majorité des communes) ; clic = zoom sur les communes de ce
// département.
// `slug` est ici le slug GÉOGRAPHIQUE du département (clé du fond départemental
// réindexé et de `parentGeoSlug` des communes).
const drillDownDept = ref<{ slug: string; name: string } | null>(null);
const { loadContours } = useConstituencyContours();
const drillDownCenter = ref<[number, number] | null>(null);

watch(
  () => props.mode,
  (mode) => {
    if (mode !== 'results-locale') drillDownDept.value = null;
  },
);

async function drillDownTo(slug: string, name: string) {
  // Résoudre le centre AVANT de faire basculer la clé de remontage : SenegalMap
  // ne lit center/zoom qu'à l'initialisation, un remount avec un centre encore
  // nul retomberait sur le centre par défaut du Sénégal.
  const contours = await loadContours('departements');
  const contour = contours.get(slug);
  drillDownCenter.value = contour ? contourPosition(contour) : null;
  drillDownDept.value = { slug, name };
}

function resetDrillDown() {
  drillDownDept.value = null;
  drillDownCenter.value = null;
}

const departmentAggregate = computed(() =>
  props.mode === 'results-locale'
    ? aggregateResultsByDepartment((items.value || []) as ResultMapItem[])
    : [],
);

const communesForDrillDown = computed(() => {
  if (!drillDownDept.value) return [];
  return ((items.value || []) as ResultMapItem[]).filter(
    (c) => c.parentGeoSlug === drillDownDept.value!.slug,
  );
});

const mapConfig = computed(() => {
  if (props.mode === 'results-locale') {
    if (drillDownDept.value) {
      return buildElectionMapConfig(
        {
          mode: 'results-locale',
          title: props.title,
          height: props.height,
          theme: 'light',
          center: drillDownCenter.value ?? undefined,
          zoom: 9.5,
        },
        communesForDrillDown.value,
      );
    }
    return buildElectionMapConfig(
      {
        mode: 'results-locale-departments',
        title: props.title,
        height: props.height,
        theme: 'light',
      },
      departmentAggregate.value,
    );
  }

  return buildElectionMapConfig(
    { mode: props.mode, title: props.title, height: props.height, theme: 'light' },
    (items.value || []) as OfficeMapItem[] | ResultMapItem[],
  );
});

// Remonte la carte au changement de niveau (nouveau fond GeoJSON + recentrage)
const mapInstanceKey = computed(() =>
  props.mode === 'results-locale'
    ? `locale-${drillDownDept.value?.slug ?? 'departments'}`
    : props.mode,
);

/** Clic sur « Voir le détail » du popup (mode bureaux) : panneau département */
async function openDepartmentDetail(item: OfficeMapItem & { region?: string | null }) {
  let municipalities: {
    municipality: string;
    voters: number;
    offices: number;
    places: number;
    population: number;
  }[] = [];
  try {
    const params: Record<string, string> = { groupBy: 'municipality', department: item.name };
    if (props.electoralFileId) params.electoral_file = String(props.electoralFileId);
    else if (props.electionId) params.election = String(props.electionId);
    const response = await $fetch<{
      data: { municipality: string; voters: number; offices: number; places: number }[];
    }>('/api/elections/map/national', { params });
    municipalities = (response?.data || []).map((m) => ({ ...m, population: 0 }));
  } catch {
    municipalities = [];
  }

  emit('department-selected', {
    departement: item.name,
    region: item.region ?? '',
    municipalities,
    totalVoters: item.voters,
    totalOffices: item.offices,
    totalPlaces: item.places,
    totalPopulation: item.population ?? 0,
    municipalityCount: item.municipalities,
  });
}

/** Clic sur un département agrégé (mode results-locale, avant drill-down) : zoom communes */
function openDepartmentAggregate(dept: ResultMapItem) {
  drillDownTo(dept.geoSlug, dept.name);
}

/** Clic sur une commune (mode results-locale, drill-down actif) : panneau détail */
function openCommuneDetail(commune: ResultMapItem) {
  if (!commune.parentName) return;
  const communes = communesForDrillDown.value.map((c) => ({
    id: c.slug,
    commune: c.name,
    coalition: c.winnerName || 'Sans coalition',
    coalitionColor: c.winnerColor || '#cccccc',
    headOfList: c.headOfList || 'Non défini',
    votes: c.voters,
    departement: c.parentName,
  }));

  emit('department-selected', {
    departement: commune.parentName,
    communes,
  });
}

function handleAction(payload: { event: string; data: unknown }) {
  if (props.mode === 'offices' && payload.event === 'open-detail') {
    openDepartmentDetail(payload.data as OfficeMapItem);
  } else if (props.mode !== 'offices' && payload.event === 'open-ranking') {
    const item = payload.data as ResultMapItem;
    emit('open-ranking', { slug: item.slug, name: item.name });
  }
}

function handleRegionClick(payload: { code: string; name: string; data: unknown }) {
  if (props.mode !== 'results-locale' || !payload.data) return;
  if (drillDownDept.value) {
    openCommuneDetail(payload.data as ResultMapItem);
  } else {
    openDepartmentAggregate(payload.data as ResultMapItem);
  }
}
</script>

<template>
  <ClientOnly>
    <div class="relative w-full" :style="{ height: props.height }">
      <MapSenegalMap
        :key="mapInstanceKey"
        :config="mapConfig"
        @action="handleAction"
        @region-click="handleRegionClick"
      />
      <UButton
        v-if="mode === 'results-locale' && drillDownDept"
        icon="i-heroicons-arrow-left"
        color="white"
        size="sm"
        class="absolute left-4 top-4 z-20 shadow-md"
        @click="resetDrillDown"
      >
        Retour aux départements
      </UButton>
    </div>
    <template #fallback>
      <div class="flex w-full items-center justify-center" :style="{ height: props.height }">
        <div
          class="border-t-primary-600 h-10 w-10 animate-spin rounded-full border-4 border-gray-200"
        />
      </div>
    </template>
  </ClientOnly>
</template>
