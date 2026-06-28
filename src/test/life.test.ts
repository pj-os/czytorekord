import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lifeStats, yearStats } from '../compute'
import type { DailySeries } from '../types'

const warszawa = JSON.parse(
  readFileSync(resolve('src/test/fixtures/warszawa.json'), 'utf-8'),
) as DailySeries
const ys = yearStats(warszawa)

describe('lifeStats', () => {
  it('counts only years within the lived range', () => {
    const s = lifeStats(ys, 1990, 2025)
    expect(s.yearsLived).toBe(36) // 1990..2025 inclusive
    expect(s.perYear[0].year).toBe(1990)
    expect(s.perYear[s.perYear.length - 1].year).toBe(2025)
  })

  it('totals equal the sum of per-year values', () => {
    const s = lifeStats(ys, 2000, 2025)
    const sumHot = s.perYear.reduce(
      (a, y) => a + (ys.find((x) => x.year === y.year)?.hotDays ?? 0),
      0,
    )
    expect(s.totalHotDays).toBe(sumHot)
    expect(s.totalHotDays).toBeGreaterThanOrEqual(0)
    expect(s.totalTropicalNights).toBeGreaterThanOrEqual(0)
  })

  it('handles a birth year with no early window gracefully', () => {
    const s = lifeStats(ys, 2025, 2025)
    expect(s.yearsLived).toBe(1)
    expect(Number.isFinite(s.earlyAvg)).toBe(true)
    expect(Number.isFinite(s.recentAvg)).toBe(true)
  })

  it('GOLDEN: born 1990, Warszawa', () => {
    expect(lifeStats(ys, 1990, 2025)).toMatchSnapshot()
  })
})
