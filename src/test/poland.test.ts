import { describe, expect, it } from 'vitest'
import { absoluteRecord, recordsForDay, type CityRecords } from '../poland'

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

describe('absoluteRecord', () => {
  it('finds the single hottest reading across all days + cities', () => {
    const records: CityRecords = {
      cities: { a: 'A', b: 'B' },
      byDay: {
        '07-15': [{ c: 'a', t: 36.1, y: 2015 }],
        '08-01': [{ c: 'b', t: 38.4, y: 2019 }],
        '06-10': [{ c: 'a', t: 33.0, y: 2010 }],
      },
    }
    const abs = absoluteRecord(records)
    expect(abs).toEqual({ slug: 'b', name: 'B', tmax: 38.4, year: 2019, monthDay: '08-01' })
  })
})
