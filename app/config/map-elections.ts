// app/config/map-elections.ts — Configuration du composant carte électoral unifié.
// Construit un SenegalMapConfig par mode (bureaux / résultats / résultats communaux),
// joint aux contours statiques public/geo/ par le slug du référentiel géographique
// (`geoSlug`, ex. « departement-bambey »). `slug` reste le slug de CIRCONSCRIPTION :
// c'est la clé des URLs publiques et de l'API de classement, il ne joint plus rien.
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
  /** Slug de circonscription — URLs et API, jamais la jointure des contours */
  slug: string
  /** Slug du référentiel géographique — clé de jointure des contours */
  geoSlug: string
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
  /** Slug de circonscription — URLs et API de classement, jamais la jointure des contours */
  slug: string
  /** Slug du référentiel géographique — clé de jointure des contours */
  geoSlug: string
  name: string
  winnerName: string
  winnerColor: string
  headOfList: string
  voters: number
  /** Slug de circonscription du département parent (affichage, classement) */
  parentSlug?: string | null
  /** Slug géographique du département parent — pilote l'agrégat et le drill-down */
  parentGeoSlug?: string | null
  parentName?: string | null
  /** Commune sans limite cartographiée : rendue en point, signalée dans l'info-bulle */
  contourUnavailable?: boolean
  /** Indicateurs de résultat (nullables : saisis éditorialement au fil de l'eau) */
  votersCount?: number | null
  nullBallots?: number | null
  validVotes?: number | null
  participationRate?: number | null
  winningVotes?: number | null
  winningPercentage?: number | null
  /** Second tour (présidentielle) : présent seulement si le scrutin en a eu un */
  round2WinnerName?: string | null
  round2WinnerColor?: string | null
  round2VotersCount?: number | null
  round2NullBallots?: number | null
  round2ValidVotes?: number | null
  round2ParticipationRate?: number | null
  round2WinningVotes?: number | null
  round2WinningPercentage?: number | null
}

/**
 * Agrège des résultats communaux en un item par département (majorité des communes).
 * Le regroupement se fait sur le slug GÉOGRAPHIQUE du parent — c'est lui qui joint le
 * fond départemental et qui pilote le drill-down ; le slug de circonscription est
 * conservé à côté pour le panneau de classement.
 */
export function aggregateResultsByDepartment(communes: ResultMapItem[]): ResultMapItem[] {
  interface Bucket {
    slug: string
    geoSlug: string
    name: string
    voters: number
    winners: Map<string, { color: string; count: number }>
    total: number
  }
  const byDept = new Map<string, Bucket>()

  for (const commune of communes) {
    const geoSlug = commune.parentGeoSlug
    if (!geoSlug) continue
    if (!byDept.has(geoSlug)) {
      byDept.set(geoSlug, {
        slug: commune.parentSlug || geoSlug,
        geoSlug,
        name: commune.parentName || geoSlug,
        voters: 0,
        winners: new Map(),
        total: 0,
      })
    }
    const bucket = byDept.get(geoSlug)!
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
      geoSlug: bucket.geoSlug,
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
    // Jointure sur le slug du référentiel des deux côtés : `geoSlug` sur la donnée,
    // `slug` sur les features GeoJSON (réindexées sur le référentiel).
    joinField: 'geoSlug',
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
    // Jointure sur le slug du référentiel des deux côtés : `geoSlug` sur la donnée,
    // `slug` sur les features GeoJSON (réindexées sur le référentiel).
    joinField: 'geoSlug',
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
        // Commune sans limite cartographiée : le dire explicitement, sinon un simple
        // point sur la carte se lirait comme une commune oubliée.
        {
          key: 'contourUnavailable',
          label: 'Contour',
          showIf: (d) => !!d.contourUnavailable,
          formatter: () => 'Non disponible - position approximative',
        },
        {
          key: 'winnerName',
          label: 'Vainqueur',
          format: 'badge',
          color: (d) => d.winnerColor || '#94a3b8',
        },
        {
          key: 'winningPercentage',
          label: 'Score du vainqueur',
          showIf: (d) => d.winningPercentage != null,
          formatter: (value) => `${(value as number).toFixed(1)}%`,
        },
        {
          key: 'winningVotes',
          label: 'Voix du vainqueur',
          showIf: (d) => d.winningVotes != null,
          formatter: (value) => formatNumber(value as number),
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
        {
          key: 'participationRate',
          label: 'Participation',
          showIf: (d) => d.participationRate != null,
          formatter: (value) => `${(value as number).toFixed(1)}%`,
        },
        {
          key: 'validVotes',
          label: 'Suffrages exprimés',
          showIf: (d) => d.validVotes != null,
          formatter: (value) => formatNumber(value as number),
        },
        {
          key: 'nullBallots',
          label: 'Bulletins nuls',
          showIf: (d) => d.nullBallots != null,
          formatter: (value) => formatNumber(value as number),
        },
        // Bloc second tour : n'apparaît que si cette circonscription/élection en a eu un
        {
          key: 'round2WinnerName',
          label: 'Vainqueur (2d tour)',
          format: 'badge',
          color: (d) => d.round2WinnerColor || '#94a3b8',
          showIf: (d) => !!d.round2WinnerName,
        },
        {
          key: 'round2WinningPercentage',
          label: 'Score (2d tour)',
          showIf: (d) => !!d.round2WinnerName && d.round2WinningPercentage != null,
          formatter: (value) => `${(value as number).toFixed(1)}%`,
        },
        {
          key: 'round2ParticipationRate',
          label: 'Participation (2d tour)',
          showIf: (d) => !!d.round2WinnerName && d.round2ParticipationRate != null,
          formatter: (value) => `${(value as number).toFixed(1)}%`,
        },
      ],
      actions: [{ label: 'Voir le classement', event: 'open-ranking' }],
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
      // Départements : le fichier canonique de SenegalMap, réindexé sur le référentiel
      communes: isCommunesLevel ? '/geo/senegal-communes.geojson' : null,
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
