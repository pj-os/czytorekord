import { describe, expect, it } from 'vitest'
import { CALENDAR, indexOfToday, monthDayOf, wrapIndex } from '../calendar'
import { dayLabel, monthNom, ordinal, yearsWord } from '../format'
import { tempToT, thermal, thermalForTemp } from '../palette'

describe('yearsWord — Polish pluralization', () => {
  it('handles singular, paucal and plural', () => {
    expect(yearsWord(1)).toBe('rok')
    expect(yearsWord(2)).toBe('lata')
    expect(yearsWord(3)).toBe('lata')
    expect(yearsWord(4)).toBe('lata')
    expect(yearsWord(5)).toBe('lat')
    expect(yearsWord(11)).toBe('lat')
    expect(yearsWord(12)).toBe('lat') // teens exception
    expect(yearsWord(14)).toBe('lat')
    expect(yearsWord(22)).toBe('lata')
    expect(yearsWord(25)).toBe('lat')
  })
})

describe('format helpers', () => {
  it('dayLabel renders genitive Polish month', () => {
    expect(dayLabel(new Date(2026, 5, 27))).toBe('27 czerwca')
    expect(dayLabel(new Date(2026, 0, 31))).toBe('31 stycznia')
  })
  it('monthNom is masculine nominative for all months', () => {
    expect(monthNom(6)).toBe('czerwiec')
    expect(monthNom(1)).toBe('styczeń')
    expect(monthNom(12)).toBe('grudzień')
  })
  it('ordinal adds a dot', () => {
    expect(ordinal(9)).toBe('9.')
  })
})

describe('calendar', () => {
  it('has 365 days and skips Feb 29', () => {
    expect(CALENDAR.length).toBe(365)
    expect(CALENDAR.some((c) => c.month === 2 && c.day === 29)).toBe(false)
  })
  it('monthDayOf maps index to MM-DD', () => {
    expect(monthDayOf(0)).toBe('01-01')
    expect(monthDayOf(364)).toBe('12-31')
  })
  it('indexOfToday round-trips through the calendar', () => {
    const i = indexOfToday(new Date(2026, 5, 27))
    expect(monthDayOf(i)).toBe('06-27')
  })
  it('wrapIndex wraps both directions', () => {
    expect(wrapIndex(-1)).toBe(364)
    expect(wrapIndex(365)).toBe(0)
  })
})

describe('palette', () => {
  it('tempToT clamps the climate range to [0,1] conceptually', () => {
    expect(tempToT(-15)).toBeCloseTo(0, 5)
    expect(tempToT(40)).toBeCloseTo(1, 5)
  })
  it('thermal returns rgb across the ramp', () => {
    expect(thermal(0)).toMatch(/^rgb\(/)
    expect(thermal(1)).toMatch(/^rgb\(/)
    expect(thermal(0.5)).toMatch(/^rgb\(/)
  })
  it('cold maps bluer, heat maps redder', () => {
    const cold = thermalForTemp(-10)
    const hot = thermalForTemp(38)
    const [cr, , cb] = cold.match(/\d+/g)!.map(Number)
    const [hr, , hb] = hot.match(/\d+/g)!.map(Number)
    expect(cb).toBeGreaterThan(cr) // cold: blue dominates red
    expect(hr).toBeGreaterThan(hb) // hot: red dominates blue
  })
})
