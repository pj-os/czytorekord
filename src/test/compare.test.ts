import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { daySnapshot } from '../compute'
import type { DailySeries } from '../types'

function load(slug: string): DailySeries {
  return JSON.parse(readFileSync(resolve('src/test/fixtures', `${slug}.json`), 'utf-8'))
}
const warszawa = load('warszawa')
const zakopane = load('zakopane')

describe('city comparison premise', () => {
  it('lowland Warszawa is warmer than mountain Zakopane in midsummer', () => {
    const w = daySnapshot(warszawa, '07-15', 2026, false, null)
    const z = daySnapshot(zakopane, '07-15', 2026, false, null)
    expect(w.avg).toBeGreaterThan(z.avg)
    // and the gap is meaningful (mountains are clearly cooler)
    expect(w.avg - z.avg).toBeGreaterThan(1)
  })

  it('both cities expose a comparable record for the same day', () => {
    const w = daySnapshot(warszawa, '07-15', 2026, false, null)
    const z = daySnapshot(zakopane, '07-15', 2026, false, null)
    expect(w.recordHot).not.toBeNull()
    expect(z.recordHot).not.toBeNull()
    expect(w.recordHot!.tmax).toBeGreaterThan(z.recordHot!.tmax)
  })
})
