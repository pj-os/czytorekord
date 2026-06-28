import { describe, expect, it } from 'vitest'
import { recordsForDay, type CityRecords } from '../poland'

const sample: CityRecords = {
  cities: { warszawa: 'Warszawa', zakopane: 'Zakopane', krakow: 'Kraków' },
  byDay: {
    '07-15': [
      { c: 'krakow', t: 36.1, y: 2015 },
      { c: 'warszawa', t: 34.8, y: 1994 },
      { c: 'zakopane', t: 27.3, y: 2024 },
    ],
  },
}

describe('recordsForDay', () => {
  it('resolves slugs to names, preserving the hottest-first order', () => {
    const r = recordsForDay(sample, '07-15')
    expect(r.map((x) => x.name)).toEqual(['Kraków', 'Warszawa', 'Zakopane'])
    expect(r[0]).toEqual({ slug: 'krakow', name: 'Kraków', tmax: 36.1, year: 2015 })
  })

  it('returns an empty array for an unknown day', () => {
    expect(recordsForDay(sample, '01-01')).toEqual([])
  })
})
