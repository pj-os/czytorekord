import { describe, expect, it } from 'vitest'
import { todayProgress } from '../compute'

// 24 hourly timestamps for a single day
const times = Array.from({ length: 24 }, (_, h) => `2026-06-28T${String(h).padStart(2, '0')}:00`)
// a typical summer curve: cool morning, peak ~15:00 (33°C), cooling into evening
const temps = [
  18, 17, 16, 16, 15, 16, 18, 21, 24, 27, 29, 31, 32, 33, 33, 33, 32, 30, 28, 26, 24, 22, 21, 20,
]

describe('todayProgress', () => {
  it('morning: peak is still ahead (forecast)', () => {
    const p = todayProgress(times, temps, '2026-06-28T09:30')
    expect(p.maxSoFar).toBe(27) // up to 09:00
    expect(p.maxRest).toBe(33)
    expect(p.peakAhead).toBe(true)
  })

  it('right at the peak hour: no longer meaningfully ahead', () => {
    const p = todayProgress(times, temps, '2026-06-28T15:30')
    expect(p.maxSoFar).toBe(33)
    expect(p.peakAhead).toBe(false)
  })

  it('evening: peak has passed, value is effectively final', () => {
    const p = todayProgress(times, temps, '2026-06-28T19:10')
    expect(p.maxSoFar).toBe(33)
    expect(p.maxRest).toBeLessThan(p.maxSoFar)
    expect(p.peakAhead).toBe(false)
  })

  it('last hour of the day: nothing left ahead', () => {
    const p = todayProgress(times, temps, '2026-06-28T23:45')
    expect(p.maxSoFar).toBe(33)
    expect(p.maxRest).toBe(-Infinity)
    expect(p.peakAhead).toBe(false)
  })

  it('ignores null readings', () => {
    const p = todayProgress(['2026-06-28T00:00', '2026-06-28T01:00'], [null as unknown as number, 5], '2026-06-28T02:00')
    expect(p.maxSoFar).toBe(5)
  })
})
