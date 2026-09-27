import { describe, expect, it } from 'vitest'
import { ILLUSTRATIVE_HEXES } from './fixtures'
import {
  attachObservedNeed,
  deriveNeedBands,
  findAcsPlace,
} from './observedNeed'

describe('ACS neighborhood need', () => {
  it('joins Homewood South 1:1 and groups North with West', () => {
    expect(findAcsPlace('Homewood South')?.catalogName).toBe('Homewood South')
    expect(findAcsPlace('Homewood North')?.catalogName).toBe(
      'Homewood North - Homewood West',
    )
    expect(findAcsPlace('Homewood West')?.catalogName).toBe(
      'Homewood North - Homewood West',
    )
    expect(findAcsPlace('Wilkinsburg West')).toBeUndefined()
  })

  it('rates Homewood South as high need for ADU, duplex, and rehab', () => {
    const south = findAcsPlace('Homewood South')
    expect(south).toBeDefined()
    const bands = deriveNeedBands(south!)
    expect(bands.adu).toBe('high')
    expect(bands.duplex_triplex).toBe('high')
    expect(bands.rehab_reuse).toBe('high')
  })

  it('does not treat low-vacancy Point Breeze North as high rehab need', () => {
    const place = findAcsPlace('Point Breeze North')
    expect(deriveNeedBands(place!).rehab_reuse).toBe('low')
  })

  it('overwrites fixture Need but leaves Fit and Allowed on Homewood cells', () => {
    const north = ILLUSTRATIVE_HEXES.find(
      (hex) => hex.neighborhood === 'Homewood North',
    )
    expect(north).toBeDefined()
    const next = attachObservedNeed(north!)
    expect(next.observedNeed?.vintage).toContain('ACS 2019')
    expect(next.hoodAliases).toEqual(['Homewood West'])
    expect(next.need.duplex_triplex).toBe('high')
    expect(next.fit).toEqual(north!.fit)
    expect(next.allowed).toEqual(north!.allowed)
  })

  it('leaves outside-city fixtures untouched', () => {
    const wilkinsburg = ILLUSTRATIVE_HEXES.find(
      (hex) => hex.neighborhood === 'Wilkinsburg West',
    )
    expect(attachObservedNeed(wilkinsburg!)).toEqual(wilkinsburg)
  })
})
