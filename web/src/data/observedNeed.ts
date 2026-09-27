import type { Band, HexRecord, ObservedNeed, TypeId } from './types'
import { TYPE_IDS } from './types'

export const ACS_NEED_VINTAGE = 'ACS 2019–2023 (UCSUR / WPRDC)'

export interface AcsPlace {
  catalogName: string
  hoods: readonly string[]
  livingAlone: number
  vacancy: number
  age65: number
  familyHh: number
  ownerShare: number
  renterShare: number
  transitShare: number
  share1to2: number | null
  totParcels: number | null
}

/**
 * Neighborhood ACS extracts for in-city fixture places.
 * Source: UCSUR profiles via WPRDC, same catalog as the 5173 scorer.
 */
export const ACS_PLACES: readonly AcsPlace[] = [
  {
    catalogName: 'Homewood North - Homewood West',
    hoods: ['Homewood North', 'Homewood West'],
    livingAlone: 0.480028031,
    vacancy: 0.303902439,
    age65: 0.228159712,
    familyHh: 0.507358094,
    ownerShare: 0.465311843,
    renterShare: 0.534688157,
    transitShare: 0.134353741,
    share1to2: 0.5473684210526316,
    totParcels: 950,
  },
  {
    catalogName: 'Homewood South',
    hoods: ['Homewood South'],
    livingAlone: 0.504282655,
    vacancy: 0.409608091,
    age65: 0.165413534,
    familyHh: 0.492505353,
    ownerShare: 0.332976445,
    renterShare: 0.667023555,
    transitShare: 0.279569892,
    share1to2: null,
    totParcels: null,
  },
  {
    catalogName: 'East Liberty',
    hoods: ['East Liberty'],
    livingAlone: 0.571960298,
    vacancy: 0.206692913,
    age65: 0.092822186,
    familyHh: 0.300558313,
    ownerShare: 0.237282878,
    renterShare: 0.762717122,
    transitShare: 0.269653877,
    share1to2: 0.5276828434723172,
    totParcels: 1463,
  },
  {
    catalogName: 'Larimer',
    hoods: ['Larimer'],
    livingAlone: 0.444976077,
    vacancy: 0.276816609,
    age65: 0.22173913,
    familyHh: 0.456140351,
    ownerShare: 0.29984051,
    renterShare: 0.70015949,
    transitShare: 0.209829868,
    share1to2: null,
    totParcels: null,
  },
  {
    catalogName: 'Point Breeze North',
    hoods: ['Point Breeze North'],
    livingAlone: 0.382051282,
    vacancy: 0.072164948,
    age65: 0.141377758,
    familyHh: 0.364102564,
    ownerShare: 0.372649573,
    renterShare: 0.627350427,
    transitShare: 0.069015097,
    share1to2: 0.6456241032998565,
    totParcels: 697,
  },
  {
    catalogName: 'Hazelwood-Glen Hazelwood-New Homestead-Hays',
    hoods: ['Hazelwood'],
    livingAlone: 0.409663013,
    vacancy: 0.181999336,
    age65: 0.240935276,
    familyHh: 0.522939505,
    ownerShare: 0.568818514,
    renterShare: 0.431181486,
    transitShare: 0.153846154,
    share1to2: null,
    totParcels: null,
  },
]

export function findAcsPlace(hood: string | undefined): AcsPlace | undefined {
  if (!hood) return undefined
  const needle = hood.toLowerCase()
  return ACS_PLACES.find((place) =>
    place.hoods.some((name) => name.toLowerCase() === needle),
  )
}

function toBand(score: number | null | undefined): Band {
  if (score == null || Number.isNaN(score)) return 'uncertain'
  if (score >= 0.4) return 'high'
  if (score >= 0.28) return 'medium'
  return 'low'
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function deriveNeedBands(place: AcsPlace): Record<TypeId, Band> {
  const living = place.livingAlone
  const vacancy = place.vacancy
  const family = place.familyHh
  const owner = place.ownerShare
  const renter = place.renterShare
  const transit = place.transitShare
  const senior = place.age65

  const scores: Record<TypeId, number> = {
    adu: 0.85 * living + 0.15 * senior,
    duplex_triplex: 0.6 * Math.max(vacancy, living) + 0.4 * family,
    townhome: 0.55 * family + 0.45 * owner,
    small_apartment: 0.45 * renter + 0.35 * vacancy + 0.2 * transit,
    large_apartment: 0.45 * renter + 0.55 * transit,
    senior_accessible: clamp01(senior * 1.85),
    rehab_reuse: vacancy,
    detached_sf: family,
  }

  return Object.fromEntries(
    TYPE_IDS.map((type) => [type, toBand(scores[type])]),
  ) as Record<TypeId, Band>
}

export function toObservedNeed(place: AcsPlace): ObservedNeed {
  return {
    catalogName: place.catalogName,
    vintage: ACS_NEED_VINTAGE,
    livingAlone: place.livingAlone,
    vacancy: place.vacancy,
    age65: place.age65,
    familyHh: place.familyHh,
    share1to2: place.share1to2,
    totParcels: place.totParcels,
    groupedHoods: place.hoods,
  }
}

export function attachObservedNeed(hex: HexRecord): HexRecord {
  const place = findAcsPlace(hex.neighborhood)
  if (!place) return hex

  const aliases = place.hoods.filter((hood) => hood !== hex.neighborhood)
  return {
    ...hex,
    need: deriveNeedBands(place),
    observedNeed: toObservedNeed(place),
    hoodAliases: aliases,
    households: {
      ...hex.households,
      hh_1_2: place.livingAlone,
    },
  }
}
