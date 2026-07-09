// app/config/map-elections.ts — Configuration du composant carte électoral unifié.
// Construit un SenegalMapConfig par mode (bureaux / résultats / résultats communaux),
// joint aux contours statiques public/geo/elections/ par slug de circonscription.
import type { SenegalMapConfig, MapDatasetConfig, RGBAColor, LegendConfig } from '~~/types/map'

/** Convertit un hex en RGBA */
function hexToRgba(hex: string | null | undefined, alpha = 190): RGBAColor {
  if (!hex || !/^#[0-9a-fA-F]{6}/.test(hex)) return [148, 163, 184, alpha]
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b, alpha]
}

/** Mode public (prop du composant) — le drill-down départements↔communes des
 * résultats locaux est un état interne du composant, pas une valeur de mode exposée. */
export type ElectionMapMode = 'offices' | 'results' | 'results-locale'

/** Mode interne du builder : `results-locale-departments` = agrégat par département
 * (vue initiale du mode locale, avant drill-down sur les communes). */
type BuilderMode = ElectionMapMode | 'results-locale-departments'

/** Item du mode bureaux : une circonscription départementale du fichier électoral */
export interface OfficeMapItem {
  slug: string
  name: string
  region?: string | null
  voters: number
  offices: number
  places: number
  municipalities: number
  population: number | null
}

/** Item des modes résultats : gagnant d'une circonscription */
export interface ResultMapItem {
  slug: string
  name: string
  winnerName: string
  winnerColor: string
  headOfList: string
  voters: number
  parentSlug?: string | null
  parentName?: string | null
}

/** Agrège des résultats communaux en un item par département (majorité des communes) */
export function aggregateResultsByDepartment(communes: ResultMapItem[]): ResultMapItem[] {
  interface Bucket {
    slug: string
    name: string
    voters: number
    winners: Map<string, { color: string; count: number }>
    total: number
  }
  const byDept = new Map<string, Bucket>()

  for (const commune of communes) {
    const slug = commune.parentSlug
    if (!slug) continue
    if (!byDept.has(slug)) {
      byDept.set(slug, {
        slug,
        name: commune.parentName || slug,
        voters: 0,
        winners: new Map(),
        total: 0,
      })
    }
    const bucket = byDept.get(slug)!
    bucket.voters += commune.voters || 0
    bucket.total++
    if (commune.winnerName) {
      const entry = bucket.winners.get(commune.winnerName)
      if (entry) entry.count++
      else bucket.winners.set(commune.winnerName, { color: commune.winnerColor, count: 1 })
    }
  }

  return [...byDept.values()].map((bucket) => {
    const [majorityName, majority] =
      [...bucket.winners.entries()].sort((a, b) => b[1].count - a[1].count)[0] || []
    return {
      slug: bucket.slug,
      name: bucket.name,
      winnerName: majorityName || '',
      winnerColor: majority?.color || '',
      headOfList: majority ? `${majority.count}/${bucket.total} communes` : '',
      voters: bucket.voters,
    }
  })
}

const formatNumber = (value: number | null | undefined) =>
  value === null || value === undefined ? 'N/A' : value.toLocaleString('fr-FR')

function buildOfficesDataset(data: OfficeMapItem[]): MapDatasetConfig<OfficeMapItem> {
  const maxVoters = Math.max(1, ...data.map((d) => d.voters || 0))
  return {
    id: 'election-offices',
    label: 'Bureaux de vote',
    icon: '🗳️',
    type: 'choropleth',
    visible: true,
    data,
    geoLevel: 'departements',
    joinField: 'slug',
    geoJoinField: 'slug',
    getValue: (d) => d.voters || 0,
    colorScale: {
      type: 'gradient',
      stops: [
        { value: 0, color: [220, 252, 231, 190], label: 'Moins d\'électeurs' },
        { value: maxVoters * 0.25, color: [134, 239, 172, 190] },
        { value: maxVoters * 0.5, color: [34, 197, 94, 190] },
        { value: maxVoters, color: [21, 128, 61, 200], label: 'Plus d\'électeurs' },
      ],
      fallback: [148, 163, 184, 120],
    },
    pickable: true,
    popup: {
      title: (d) => d.name,
      fields: [
        { key: 'voters', label: 'Électeurs', format: 'number' },
        { key: 'offices', label: 'Bureaux de vote', format: 'number' },
        { key: 'places', label: 'Lieux de vote', format: 'number' },
        { key: 'municipalities', label: 'Communes', format: 'number' },
        {
          key: 'population',
          label: 'Population',
          formatter: (value) => formatNumber(value as number | null),
        },
      ],
      actions: [{ label: 'Voir le détail', event: 'open-detail' }],
    },
  }
}

function buildResultsDataset(
  data: ResultMapItem[],
  geoLevel: 'departements' | 'communes',
  options: { headOfListLabel?: string } = {},
): MapDatasetConfig<ResultMapItem> {
  const { headOfListLabel = 'Tête de liste' } = options
  return {
    id: 'election-results',
    label: 'Résultats',
    icon: '🏆',
    type: 'choropleth',
    visible: true,
    data,
    geoLevel,
    joinField: 'slug',
    geoJoinField: 'slug',
    getColor: (d) => hexToRgba(d.winnerColor),
    colorScale: {
      type: 'category',
      stops: [],
      fallback: [148, 163, 184, 110],
    },
    pickable: true,
    popup: {
      title: (d) => d.name,
      fields: [
        {
          key: 'winnerName',
          label: 'Vainqueur',
          format: 'badge',
          color: (d) => d.winnerColor || '#94a3b8',
        },
        {
          key: 'headOfList',
          label: headOfListLabel,
          formatter: (value) => (value ? String(value) : '—'),
        },
        {
          key: 'voters',
          label: 'Électeurs',
          formatter: (value) => formatNumber(value as number),
        },
      ],
    },
  }
}

/** Légende du mode résultats : une entrée par coalition gagnante */
function buildResultsLegend(data: ResultMapItem[]): LegendConfig {
  const byWinner = new Map<string, { color: string; count: number }>()
  for (const item of data) {
    if (!item.winnerName) continue
    const entry = byWinner.get(item.winnerName)
    if (entry) entry.count++
    else byWinner.set(item.winnerName, { color: item.winnerColor || '#94a3b8', count: 1 })
  }
  return {
    title: 'Coalition en tête',
    type: 'items',
    items: [...byWinner.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([label, { color, count }]) => ({ label, color, count })),
    position: 'bottom-left',
  }
}

export interface ElectionMapConfigOptions {
  mode: BuilderMode
  title?: string
  height?: string
  theme?: 'dark' | 'light'
  /** Centre/zoom initiaux — utilisés pour recentrer sur un département au drill-down */
  center?: [number, number]
  zoom?: number
}

const SENEGAL_CENTER: [number, number] = [-14.4524, 14.4974]

export function buildElectionMapConfig(
  options: ElectionMapConfigOptions,
  data: OfficeMapItem[] | ResultMapItem[],
): SenegalMapConfig {
  const { mode, title = '', height, theme = 'light', center, zoom } = options
  const isCommunesLevel = mode === 'results-locale'
  const isDeptAggregate = mode === 'results-locale-departments'

  const dataset =
    mode === 'offices'
      ? buildOfficesDataset(data as OfficeMapItem[])
      : buildResultsDataset(data as ResultMapItem[], isCommunesLevel ? 'communes' : 'departements', {
          headOfListLabel: isDeptAggregate ? 'Communes en faveur' : 'Tête de liste',
        })

  const legend: LegendConfig =
    mode === 'offices'
      ? { title: 'Électeurs inscrits', type: 'gradient', colorScale: dataset.colorScale, position: 'bottom-left' }
      : buildResultsLegend(data as ResultMapItem[])

  return {
    title,
    theme,
    height: height ?? '600px',
    center: center ?? SENEGAL_CENTER,
    zoom: zoom ?? 6.3,
    interactionMode: 'flat',
    geoSources: {
      regions: null,
      // Départements : le fichier canonique porte les slugs de circonscriptions
      communes: isCommunesLevel ? '/geo/senegal-communes-contours.geojson' : null,
    },
    datasets: [dataset],
    legend,
    controls: {
      navigation: true,
      layerToggles: false,
      regionPresets: false,
      search: false,
      themeToggle: false,
      fullscreen: false,
      export: false,
    },
  }
}

/** Compat : config par défaut de la page démo /carte/elections (données vides) */
export const electionMapConfig: SenegalMapConfig = buildElectionMapConfig(
  { mode: 'offices', title: 'Carte électorale du Sénégal', height: 'calc(100dvh - 64px)', theme: 'dark' },
  [],
)
