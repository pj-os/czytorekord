import { describe, expect, it } from 'vitest'
import { indexOfMonthDay, monthDayOf } from '../calendar'
import { buildQuery, readUrlState } from '../url'
import type { Place } from '../types'

const warszawa: Place = {
  name: 'Warszawa',
  admin: 'Mazowieckie',
  country: 'PL',
  latitude: 52.2298,
  longitude: 21.0118,
}

describe('url state', () => {
  it('round-trips a place + day through query string', () => {
    const qs = buildQuery(warszawa, '07-15')
    const parsed = readUrlState(`?${qs}`)
    expect(parsed.monthDay).toBe('07-15')
    expect(parsed.place?.name).toBe('Warszawa')
    expect(parsed.place?.admin).toBe('Mazowieckie')
    expect(parsed.place?.latitude).toBeCloseTo(52.2298, 3)
    expect(parsed.place?.longitude).toBeCloseTo(21.0118, 3)
  })

  it('returns nulls for an empty query', () => {
    const parsed = readUrlState('')
    expect(parsed.place).toBeNull()
    expect(parsed.monthDay).toBeNull()
  })

  it('rejects a malformed day', () => {
    expect(readUrlState('?n=X&lat=1&lon=1&d=7-5').monthDay).toBeNull()
    expect(readUrlState('?n=X&lat=1&lon=1&d=bad').monthDay).toBeNull()
  })

  it('ignores a place without coordinates', () => {
    expect(readUrlState('?n=Nigdzie&d=07-15').place).toBeNull()
  })
})

describe('monthDay ↔ index', () => {
  it('is reversible for every calendar day', () => {
    for (let i = 0; i < 365; i++) {
      expect(indexOfMonthDay(monthDayOf(i))).toBe(i)
    }
  })
})
