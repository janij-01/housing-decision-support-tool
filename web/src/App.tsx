import { useCallback, useEffect, useMemo, useState } from 'react'
import { ILLUSTRATIVE_HEXES } from './data/fixtures'
import { attachObservedNeed } from './data/observedNeed'
import { TYPE_IDS, type HexRecord, type TypeId } from './data/types'
import { PlanningCopilot } from './copilot/PlanningCopilot'
import { Legend } from './map/Legend'
import { MapView, type MapMode } from './map/MapView'
import { deriveMatchStatus } from './model/match'
import {
  BALANCED_WEIGHTS,
  SCENARIOS,
  rankScenarios,
  type ValueWeights as ModelValueWeights,
} from './model/scenarios'
import {
  PlaceReport,
  ScreeningBrief,
  type HousingTypeRow,
} from './panels/PlaceReport'
import {
  ScenarioBuilder,
  type ScenarioScorecard,
  type ValueWeights,
} from './panels/ScenarioBuilder'
import { Toolbar } from './panels/Toolbar'
import { WhyThisColor } from './panels/WhyThisColor'
import { DecisionRibbon, MethodStory } from './story'
import './styles.css'

const TYPE_LABELS: Record<TypeId, string> = {
  adu: 'Accessory dwelling unit (ADU)',
  duplex_triplex: 'Duplex / triplex',
  townhome: 'Townhomes / rowhouses',
  small_apartment: 'Small apartment building',
  large_apartment: 'Mid-size / large apartments',
  senior_accessible: 'Senior / accessible housing',
  rehab_reuse: 'Rehab & reuse of vacant homes',
  detached_sf: 'Detached single-family',
}

const DEMO_TYPE_CHIPS = [
  { value: 'adu', label: 'ADU' },
  { value: 'duplex_triplex', label: 'Duplex / triplex' },
]

const DEFAULT_PLACE = 'Homewood South'

const STATUS_LABELS: Record<string, string> = {
  ready_match: 'Ready match',
  needs_approval: 'Needs approval',
  blocked_by_zoning: 'Blocked by zoning',
  needed_but_hard: 'Needed but hard',
  low_priority: 'Low priority',
  zoning_unknown: 'Zoning unknown',
  not_recommended: 'Not recommended',
  insufficient_data: 'Insufficient data',
}

type ViewCell = HexRecord & { name: string }

function cellName(cell: HexRecord) {
  return cell.neighborhood ?? cell.muni
}

function findCellByPlace(cells: ViewCell[], key: string): ViewCell | undefined {
  const needle = key.toLowerCase()
  return (
    cells.find((cell) => cell.h3 === key) ??
    cells.find((cell) => cell.name.toLowerCase() === needle) ??
    cells.find((cell) =>
      cell.hoodAliases?.some((alias) => alias.toLowerCase() === needle),
    )
  )
}

function displayPlaceName(key: string, cell: ViewCell): string {
  const needle = key.toLowerCase()
  if (cell.name.toLowerCase() === needle) return cell.name
  const alias = cell.hoodAliases?.find((item) => item.toLowerCase() === needle)
  return alias ?? cell.name
}

function placeOptions(cells: ViewCell[]) {
  const homewood: { value: string; label: string }[] = []
  const rest: { value: string; label: string }[] = []

  for (const cell of cells) {
    const acs = Boolean(cell.observedNeed)
    const bucket = cell.name.startsWith('Homewood') ? homewood : rest
    bucket.push({
      value: cell.neighborhood ?? cell.h3,
      label: `${cell.name} · ${cell.muni}${acs ? ' · ACS Need' : ' · fixture Need'}`,
    })
    for (const alias of cell.hoodAliases ?? []) {
      bucket.push({
        value: alias,
        label: `${alias} · ${cell.muni} · ACS Need (grouped with ${cell.name})`,
      })
    }
  }

  return [...homewood, ...rest]
}

function statusFor(cell: HexRecord, type: TypeId) {
  return deriveMatchStatus({
    need: cell.need[type],
    fit: cell.fit[type].band,
    allowed: cell.allowed[type],
    floodway: cell.risk.floodway,
  })
}

function toModelWeights(weights: ValueWeights): ModelValueWeights {
  return {
    protectResidents: weights.protectResidents,
    lowCarbon: weights.lowCarbon,
    climateSafety: weights.climateSafety,
    deepAffordability: weights.deepAffordability,
    speedToBuild: weights.speedToBuild,
  }
}

function scenarioCards(weights: ValueWeights): ScenarioScorecard[] {
  const scores = new Map(
    rankScenarios(SCENARIOS, toModelWeights(weights)).map((result) => [
      result.scenarioId,
      result.score / 100,
    ]),
  )

  return SCENARIOS.map((scenario) => {
    const homes = Object.values(scenario.mix).reduce(
      (sum, count) => sum + (count ?? 0),
      0,
    )
    const zoningEase =
      homes === 0
        ? 0
        : Math.min(
            1,
            (scenario.facts.homesByRight +
              scenario.facts.homesNeedApproval * 0.55) /
              homes,
          )

    return {
      id: scenario.id,
      label: scenario.name,
      description: scenario.description,
      homes,
      householdsServed: scenario.facts.householdsServedShare,
      landFit: Math.min(
        1,
        scenario.facts.suitableParcels /
          Math.max(1, scenario.facts.parcelsRequired),
      ),
      zoningEase,
      displacementSafety: 1 - scenario.facts.displacementPressure,
      carbon: scenario.valueScores.lowCarbon,
      climate: scenario.valueScores.climateSafety,
      speed: scenario.valueScores.speedToBuild,
      score: scores.get(scenario.id) ?? 0,
    }
  })
}

function App() {
  const cells = useMemo<ViewCell[]>(
    () =>
      ILLUSTRATIVE_HEXES.map((cell) => {
        const withNeed = attachObservedNeed(cell)
        return { ...withNeed, name: cellName(withNeed) }
      }),
    [],
  )
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const [selectedPlace, setSelectedPlace] = useState(() => {
    const requested = params.get('place')
    return requested && findCellByPlace(cells, requested)
      ? requested
      : DEFAULT_PLACE
  })
  const [selectedType, setSelectedType] = useState<TypeId>(() => {
    const requested = params.get('type')
    return TYPE_IDS.includes(requested as TypeId)
      ? (requested as TypeId)
      : 'adu'
  })
  const [mode, setMode] = useState<MapMode>(() =>
    params.get('view') === 'match' ? 'match' : 'need',
  )
  const [is3d, setIs3d] = useState(() => params.get('dimension') === '3d')
  const [copied, setCopied] = useState(false)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [explanationOpen, setExplanationOpen] = useState(false)
  const [mapFocusVersion, setMapFocusVersion] = useState(0)
  const [weights, setWeights] = useState<ValueWeights>({
    protectResidents: BALANCED_WEIGHTS.protectResidents * 50,
    lowCarbon: BALANCED_WEIGHTS.lowCarbon * 50,
    climateSafety: BALANCED_WEIGHTS.climateSafety * 50,
    deepAffordability: BALANCED_WEIGHTS.deepAffordability * 50,
    speedToBuild: BALANCED_WEIGHTS.speedToBuild * 50,
  })

  const selectedBase =
    findCellByPlace(cells, selectedPlace) ?? cells[0]
  const selected: ViewCell = {
    ...selectedBase,
    name: displayPlaceName(selectedPlace, selectedBase),
  }

  useEffect(() => {
    const next = new URLSearchParams()
    next.set('place', selectedPlace)
    next.set('type', selectedType)
    next.set('view', mode)
    next.set('dimension', is3d ? '3d' : '2d')
    window.history.replaceState(null, '', `${window.location.pathname}?${next}`)
  }, [is3d, mode, selectedPlace, selectedType])

  useEffect(() => {
    if (!copilotOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCopilotOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [copilotOpen])

  const getStatus = useCallback(
    (cell: ViewCell) => statusFor(cell, selectedType),
    [selectedType],
  )
  const getNeed = useCallback(
    (cell: ViewCell) => cell.need[selectedType],
    [selectedType],
  )
  const getTooltip = useCallback(
    (cell: ViewCell) => {
      const status = statusFor(cell, selectedType)
      const fit = cell.fit[selectedType]
      const needSource = cell.observedNeed
        ? 'ACS 2019–23'
        : 'illustrative Need'
      return `${TYPE_LABELS[selectedType]}: ${STATUS_LABELS[status]}. Need ${cell.need[selectedType]} (${needSource}). ${fit.parcels} illustrative suitable parcels.\nClick to see why.`
    },
    [selectedType],
  )

  const rows = useMemo<HousingTypeRow[]>(
    () =>
      TYPE_IDS.map((type) => ({
        id: type,
        label: TYPE_LABELS[type],
        need: selected.need[type],
        fit: selected.fit[type].band,
        allowed: selected.allowed[type],
        status: statusFor(selected, type),
        parcels: selected.fit[type].parcels,
        homes: selected.fit[type].homes,
        zoningNote: selected.inCity
          ? 'Illustrative MVP allowance. Exact zoning section is not yet verified.'
          : 'Zoning is not available in the fixture dataset. Verify with the municipality.',
      })),
    [selected],
  )

  const unknowns = useMemo(() => {
    const items = [
      'Sewer and water capacity are not included.',
      'Parcel ownership and willingness to sell are unknown.',
      'Household preferences require community engagement.',
    ]
    if (selected.observedNeed) {
      items.unshift(
        `Need uses ${selected.observedNeed.vintage}; ACS groups ${selected.observedNeed.groupedHoods.join(', ')}.`,
      )
    }
    if (!selected.inCity) {
      items.unshift(
        `Zoning for ${selected.muni} has not been loaded or human-verified.`,
      )
    } else {
      items.unshift(
        'Pittsburgh zoning values are illustrative until the code matrix is human-verified.',
      )
    }
    if (selected.moeFlags.length > 0) {
      items.push(
        'One or more household estimates have high uncertainty in this fixture.',
      )
    }
    return items
  }, [selected])

  const handleWeightChange = (
    key: keyof ValueWeights,
    value: number,
  ) => {
    setWeights((current) => ({ ...current, [key]: value }))
  }

  const copyViewLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            HM
          </span>
          <div>
            <h1>Allegheny Housing Match Map</h1>
            <p>Need × Fit × Allowed — a planning conversation starter</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className="copilot-button"
            type="button"
            aria-controls="planning-copilot-drawer"
            aria-expanded={copilotOpen}
            onClick={() => setCopilotOpen(true)}
          >
            <span aria-hidden="true">✦</span> Ask the map
          </button>
          <button className="share-button" type="button" onClick={copyViewLink}>
            {copied ? 'Link copied' : 'Share this view'}
          </button>
          <span className="prototype-pill">
            Need: ACS 2019–23 · Fit/Allowed: fixture
          </span>
        </div>
      </header>

      <main className="workspace">
        <Toolbar
          places={placeOptions(cells)}
          place={
            findCellByPlace(cells, selectedPlace)
              ? selectedPlace
              : (selected.neighborhood ?? selected.h3)
          }
          onPlaceChange={(value) => {
            setSelectedPlace(value)
            setMapFocusVersion((version) => version + 1)
          }}
          types={TYPE_IDS.map((type) => ({
            value: type,
            label: TYPE_LABELS[type],
          }))}
          type={selectedType}
          onTypeChange={(value) => setSelectedType(value as TypeId)}
          compareTypes={DEMO_TYPE_CHIPS}
          mode={mode}
          onModeChange={setMode}
          is3d={is3d}
          onDimensionChange={setIs3d}
        />

        <DecisionRibbon
          placeName={selected.name}
          typeLabel={TYPE_LABELS[selectedType]}
          need={selected.need[selectedType]}
          fit={selected.fit[selectedType].band}
          allowed={selected.allowed[selectedType]}
          action={statusFor(selected, selectedType)}
          needNote={
            selected.observedNeed
              ? `${selected.observedNeed.vintage} living-alone and vacancy drive this Need band (${selected.observedNeed.catalogName}).`
              : undefined
          }
        />

        <div className="primary-layout">
          <section className="map-panel">
            <MapView
              key={`${mapFocusVersion}-${is3d ? '3d' : '2d'}`}
              cells={cells}
              selected={selected}
              mode={mode}
              is3d={is3d}
              getStatus={getStatus}
              getNeed={getNeed}
              getTooltip={getTooltip}
              onSelect={(cell, picked) => {
                setSelectedPlace(
                  picked?.hood ?? cell.neighborhood ?? cell.h3,
                )
                setExplanationOpen(true)
              }}
            />
            <Legend mode={mode} />
            {explanationOpen ? (
              <WhyThisColor
                cell={selected}
                placeName={selected.name}
                type={selectedType}
                typeLabel={TYPE_LABELS[selectedType]}
                mode={mode}
                onClose={() => setExplanationOpen(false)}
              />
            ) : null}
          </section>

          <aside className="report-panel">
            <PlaceReport
              name={selected.name}
              municipality={selected.muni}
              confidence={selected.confidence}
              selectedTypeLabel={TYPE_LABELS[selectedType]}
              rows={rows}
              unknowns={unknowns}
              cell={selected}
            />
            <ScreeningBrief
              placeName={selected.name}
              municipality={selected.muni}
              typeLabel={TYPE_LABELS[selectedType]}
              need={selected.need[selectedType]}
              fit={selected.fit[selectedType].band}
              allowed={selected.allowed[selectedType]}
              status={statusFor(selected, selectedType)}
              hasAcsNeed={Boolean(selected.observedNeed)}
              catalogName={selected.observedNeed?.catalogName}
            />
          </aside>
        </div>

        <ScenarioBuilder
          placeName={selected.name}
          scenarios={scenarioCards(weights)}
          weights={weights}
          onWeightChange={handleWeightChange}
        />

        <MethodStory />

        <p className="disclaimer">
          <strong>Decision-support prototype.</strong> Not legal, zoning,
          financial, engineering, or permitting advice. Need for in-city
          places that join a WPRDC hood name uses ACS 2019–23 (UCSUR/WPRDC).
          Fit, Allowed, match colors, parcel counts, and outside-city scores
          remain illustrative fixtures. Verify authoritative sources and
          engage affected communities before acting.
        </p>
      </main>

      {copilotOpen ? (
        <div
          className="copilot-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setCopilotOpen(false)
          }}
        >
          <aside
            id="planning-copilot-drawer"
            className="copilot-drawer"
            aria-label="Planning copilot"
          >
            <button
              className="copilot-close"
              type="button"
              aria-label="Close planning copilot"
              onClick={() => setCopilotOpen(false)}
            >
              ×
            </button>
            <PlanningCopilot
              selectedHex={selected}
              selectedType={selectedType}
              matchStatus={statusFor(selected, selectedType)}
            />
          </aside>
        </div>
      ) : null}
    </div>
  )
}

export default App
