import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildVerdict,
  dayInHistory,
  daySnapshot,
  extremeDays,
  monthStats,
  yearStats,
} from '../compute'
import type { DailySeries } from '../types'

function load(slug: string): DailySeries {
  const raw = readFileSync(resolve('src/test/fixtures', `${slug}.json`), 'utf-8')
  return JSON.parse(raw) as DailySeries
}

const warszawa = load('warszawa')
const zakopane = load('zakopane')
// Fixtures are frozen at 1940-01-01 .. 2025-12-31, so treat 2026 as "this year".
const YEAR = 2026

describe('dayInHistory', () => {
  it('returns one entry per year for a calendar day', () => {
    const hist = dayInHistory(warszawa, '07-15')
    expect(hist.length).toBe(86) // 1940..2025
    expect(hist[0].year).toBe(1940)
    expect(hist[hist.length - 1].year).toBe(2025)
    expect(hist.every((d) => Number.isFinite(d.tmax))).toBe(true)
  })
})

describe('buildVerdict — invariants', () => {
  const v = buildVerdict(warszawa, '07-15', 34.0, YEAR)

  it('day rank + cold rank are consistent with the sample size', () => {
    // every prior reading is either hotter, colder, or equal to the subject
    const hist = dayInHistory(warszawa, '07-15').filter((d) => d.year < YEAR)
    const hotter = hist.filter((d) => d.tmax > 34.0).length
    const colder = hist.filter((d) => d.tmax < 34.0).length
    expect(v.dayRank).toBe(hotter + 1)
    expect(v.coldRank).toBe(colder + 1)
    expect(v.dayTotal).toBe(hist.length + 1)
  })

  it('percentile is bounded and sane', () => {
    expect(v.percentile).toBeGreaterThanOrEqual(0)
    expect(v.percentile).toBeLessThanOrEqual(100)
  })

  it('all-time ranks bracket the totals', () => {
    expect(v.allTimeRank).toBeGreaterThanOrEqual(1)
    expect(v.allTimeColdRank).toBeGreaterThanOrEqual(1)
    expect(v.allTimeRank).toBeLessThanOrEqual(v.allTimeTotal)
    expect(v.allTimeColdRank).toBeLessThanOrEqual(v.allTimeTotal)
  })

  it('last-hotter / last-colder years are strictly in the past', () => {
    if (v.lastHotterYear != null) expect(v.lastHotterYear).toBeLessThan(YEAR)
    if (v.lastColderYear != null) expect(v.lastColderYear).toBeLessThan(YEAR)
  })
})

describe('buildVerdict — monotonicity', () => {
  it('a hotter subject never ranks worse and never has lower percentile', () => {
    const cool = buildVerdict(warszawa, '07-15', 25, YEAR)
    const hot = buildVerdict(warszawa, '07-15', 35, YEAR)
    expect(hot.dayRank).toBeLessThanOrEqual(cool.dayRank)
    expect(hot.percentile).toBeGreaterThanOrEqual(cool.percentile)
    expect(hot.allTimeRank).toBeLessThanOrEqual(cool.allTimeRank)
  })
})

describe('buildVerdict — records', () => {
  it('an impossibly hot value is the all-time + same-day heat record', () => {
    const v = buildVerdict(warszawa, '07-15', 99, YEAR)
    expect(v.dayRank).toBe(1)
    expect(v.allTimeRank).toBe(1)
    expect(v.lastHotterYear).toBeNull()
    expect(v.lastColderYear).not.toBeNull()
  })

  it('an impossibly cold value is the all-time + same-day cold record', () => {
    const v = buildVerdict(warszawa, '01-31', -99, YEAR)
    expect(v.coldRank).toBe(1)
    expect(v.allTimeColdRank).toBe(1)
    expect(v.lastColderYear).toBeNull()
    expect(v.lastHotterYear).not.toBeNull()
  })
})

describe('GOLDEN: buildVerdict snapshots', () => {
  it('Warszawa · 15 lipca · 34.0°C', () => {
    expect(buildVerdict(warszawa, '07-15', 34.0, YEAR)).toMatchSnapshot()
  })
  it('Warszawa · 31 stycznia · -4.7°C', () => {
    expect(buildVerdict(warszawa, '01-31', -4.7, YEAR)).toMatchSnapshot()
  })
  it('Zakopane · 15 lipca · 24.0°C', () => {
    expect(buildVerdict(zakopane, '07-15', 24.0, YEAR)).toMatchSnapshot()
  })
})

describe('daySnapshot', () => {
  it('today path uses the live value and produces a verdict', () => {
    const snap = daySnapshot(warszawa, '07-15', YEAR, true, 38.5)
    expect(snap.subjectValue).toBe(38.5)
    expect(snap.verdict).not.toBeNull()
    expect(snap.recordHot).not.toBeNull()
    expect(snap.recordCold).not.toBeNull()
    expect(snap.history.every((d) => d.year < YEAR)).toBe(true)
  })

  it('a year with no data yields no subject and no verdict (historical-only)', () => {
    const snap = daySnapshot(warszawa, '07-15', 2030, false, null)
    expect(snap.subjectValue).toBeNull()
    expect(snap.verdict).toBeNull()
    expect(snap.recordHot).not.toBeNull()
  })

  it('GOLDEN: Warszawa · 15 lipca · today 38.5°C', () => {
    expect(daySnapshot(warszawa, '07-15', YEAR, true, 38.5)).toMatchSnapshot()
  })
})

describe('yearStats', () => {
  const ys = yearStats(warszawa)

  it('covers every year ascending from 1940 to 2025', () => {
    expect(ys[0].year).toBe(1940)
    expect(ys[ys.length - 1].year).toBe(2025)
    for (let i = 1; i < ys.length; i++) expect(ys[i].year).toBeGreaterThan(ys[i - 1].year)
  })

  it('hot days and tropical nights are non-negative and within the year', () => {
    for (const y of ys) {
      expect(y.hotDays).toBeGreaterThanOrEqual(0)
      expect(y.hotDays).toBeLessThanOrEqual(366)
      expect(y.tropicalNights).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(y.mean)).toBe(true)
    }
  })
})

describe('extremeDays', () => {
  it('finds the global hottest and coldest daily-max readings', () => {
    const { hottest, coldest } = extremeDays(warszawa)
    const allMax = warszawa.tmax.filter((v) => v != null)
    expect(hottest.tmax).toBe(Math.max(...allMax))
    expect(coldest.tmax).toBe(Math.min(...allMax))
    expect(hottest.monthDay).toMatch(/^\d{2}-\d{2}$/)
    expect(coldest.monthDay).toMatch(/^\d{2}-\d{2}$/)
  })

  it('GOLDEN: Warszawa extremes', () => {
    expect(extremeDays(warszawa)).toMatchSnapshot()
  })
})

describe('monthStats', () => {
  it('produces one entry per year-month and finite means', () => {
    const ms = monthStats(warszawa)
    expect(ms.length).toBe(86 * 12)
    expect(ms.every((m) => Number.isFinite(m.mean))).toBe(true)
    expect(ms.every((m) => m.month >= 1 && m.month <= 12)).toBe(true)
  })
})
