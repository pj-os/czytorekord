import type {
  DailySeries,
  DayInHistory,
  DaySnapshot,
  MonthStat,
  Verdict,
  YearStat,
} from './types'

function mean(nums: number[]): number {
  if (!nums.length) return NaN
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

/** All historical max readings for a given MM-DD calendar day, oldest→newest. */
export function dayInHistory(series: DailySeries, monthDay: string): DayInHistory[] {
  const out: DayInHistory[] = []
  for (let i = 0; i < series.time.length; i++) {
    const t = series.time[i]
    if (t.slice(5) === monthDay && series.tmax[i] != null) {
      out.push({ year: Number(t.slice(0, 4)), tmax: series.tmax[i] })
    }
  }
  return out
}

/**
 * Judge today's value against this same calendar day in every prior year,
 * and against every day ever recorded.
 */
export function buildVerdict(
  series: DailySeries,
  monthDay: string,
  todayValue: number,
  thisYear: number,
): Verdict {
  const history = dayInHistory(series, monthDay).filter((d) => d.year < thisYear)
  const values = history.map((d) => d.tmax)

  // rank on this calendar day (1 = hottest)
  const hotterSame = values.filter((v) => v > todayValue).length
  const dayRank = hotterSame + 1
  const dayTotal = values.length + 1

  // rank from the cold end (1 = coldest)
  const colderSame = values.filter((v) => v < todayValue).length
  const coldRank = colderSame + 1

  // most recent prior year that beat today (hotter / colder)
  let lastHotterYear: number | null = null
  let lastHotterValue: number | null = null
  let lastColderYear: number | null = null
  let lastColderValue: number | null = null
  for (let y = history.length - 1; y >= 0; y--) {
    if (lastHotterYear == null && history[y].tmax > todayValue) {
      lastHotterYear = history[y].year
      lastHotterValue = history[y].tmax
    }
    if (lastColderYear == null && history[y].tmax < todayValue) {
      lastColderYear = history[y].year
      lastColderValue = history[y].tmax
    }
    if (lastHotterYear != null && lastColderYear != null) break
  }

  const coolerOrEqual = values.filter((v) => v <= todayValue).length
  const percentile = values.length ? (coolerOrEqual / values.length) * 100 : 100

  // all-time ranks across every recorded day
  const allMax = series.tmax.filter((v) => v != null)
  const allTimeRank = allMax.filter((v) => v > todayValue).length + 1
  const allTimeColdRank = allMax.filter((v) => v < todayValue).length + 1

  return {
    dayRank,
    dayTotal,
    coldRank,
    lastHotterYear,
    lastHotterValue,
    lastColderYear,
    lastColderValue,
    percentile,
    allTimeRank,
    allTimeColdRank,
    allTimeTotal: allMax.length + 1,
    dayMin: values.length ? Math.min(...values) : todayValue,
    dayMax: values.length ? Math.max(...values) : todayValue,
    dayAvg: mean(values),
  }
}

/**
 * Everything needed to render an arbitrary calendar day.
 * `liveValue` (today's live max) overrides the archive when the date is today.
 */
export function daySnapshot(
  series: DailySeries,
  monthDay: string,
  thisYear: number,
  isToday: boolean,
  liveValue: number | null,
): DaySnapshot {
  const all = dayInHistory(series, monthDay)
  const history = all.filter((d) => d.year < thisYear)

  // the value we judge for the *current* year on this date
  let subjectValue: number | null = null
  if (isToday && liveValue != null) {
    subjectValue = liveValue
  } else {
    const thisYearEntry = all.find((d) => d.year === thisYear)
    subjectValue = thisYearEntry ? thisYearEntry.tmax : null
  }

  const verdict =
    subjectValue != null ? buildVerdict(series, monthDay, subjectValue, thisYear) : null

  // historical extremes for this calendar day (across the full record)
  let recordHot: DayInHistory | null = null
  let recordCold: DayInHistory | null = null
  for (const d of all) {
    if (!recordHot || d.tmax > recordHot.tmax) recordHot = d
    if (!recordCold || d.tmax < recordCold.tmax) recordCold = d
  }
  const avg = all.length ? all.reduce((a, d) => a + d.tmax, 0) / all.length : NaN

  return { monthDay, history, subjectValue, verdict, recordHot, recordCold, avg }
}

export interface TodayProgress {
  /** highest temperature reached so far today (hours up to and including now) */
  maxSoFar: number
  /** highest forecast temperature for the remaining hours of today */
  maxRest: number
  /** true while the day's peak is still ahead (rest-of-day forecast beats what's been reached) */
  peakAhead: boolean
}

/**
 * From today's hourly forecast + the current time, work out the max reached so
 * far vs. what's still coming — so the UI can stop calling the value a
 * "forecast" once the daily peak has passed (e.g. late afternoon/evening).
 */
export function todayProgress(times: string[], temps: number[], nowIso: string): TodayProgress {
  const nowHour = nowIso.slice(0, 13) // "YYYY-MM-DDTHH"
  let maxSoFar = -Infinity
  let maxRest = -Infinity
  for (let i = 0; i < times.length; i++) {
    const t = temps[i]
    if (t == null) continue
    if (times[i].slice(0, 13) <= nowHour) maxSoFar = Math.max(maxSoFar, t)
    else maxRest = Math.max(maxRest, t)
  }
  return { maxSoFar, maxRest, peakAhead: maxRest > maxSoFar + 0.3 }
}

export interface ExtremeDay {
  monthDay: string
  year: number
  tmax: number
}

/** The single hottest and coldest daily-max readings in the whole record. */
export function extremeDays(series: DailySeries): { hottest: ExtremeDay; coldest: ExtremeDay } {
  let hiV = -Infinity
  let loV = Infinity
  let hiI = 0
  let loI = 0
  for (let i = 0; i < series.tmax.length; i++) {
    const v = series.tmax[i]
    if (v == null) continue
    if (v > hiV) {
      hiV = v
      hiI = i
    }
    if (v < loV) {
      loV = v
      loI = i
    }
  }
  return {
    hottest: { monthDay: series.time[hiI].slice(5), year: Number(series.time[hiI].slice(0, 4)), tmax: hiV },
    coldest: { monthDay: series.time[loI].slice(5), year: Number(series.time[loI].slice(0, 4)), tmax: loV },
  }
}

export interface LifeStats {
  birthYear: number
  yearsLived: number
  totalHotDays: number
  totalTropicalNights: number
  earlyAvg: number // avg hot days in the first 10 years of life
  recentAvg: number // avg hot days in the last 10 lived years
  perYear: { year: number; hotDays: number }[]
}

/** Personal heat history: how hot days accumulated across someone's life. */
export function lifeStats(years: YearStat[], birthYear: number, upToYear: number): LifeStats {
  const lived = years.filter((y) => y.year >= birthYear && y.year <= upToYear)
  const avg = (arr: YearStat[]) =>
    arr.length ? arr.reduce((a, y) => a + y.hotDays, 0) / arr.length : 0
  return {
    birthYear,
    yearsLived: lived.length,
    totalHotDays: lived.reduce((a, y) => a + y.hotDays, 0),
    totalTropicalNights: lived.reduce((a, y) => a + y.tropicalNights, 0),
    earlyAvg: avg(lived.slice(0, 10)),
    recentAvg: avg(lived.slice(-10)),
    perYear: lived.map((y) => ({ year: y.year, hotDays: y.hotDays })),
  }
}

export function yearStats(series: DailySeries): YearStat[] {
  const byYear = new Map<number, { means: number[]; hot: number; trop: number }>()
  for (let i = 0; i < series.time.length; i++) {
    const year = Number(series.time[i].slice(0, 4))
    if (!byYear.has(year)) byYear.set(year, { means: [], hot: 0, trop: 0 })
    const e = byYear.get(year)!
    if (series.tmean[i] != null) e.means.push(series.tmean[i])
    if (series.tmax[i] != null && series.tmax[i] >= 30) e.hot++
    if (series.tmin[i] != null && series.tmin[i] >= 20) e.trop++
  }
  return [...byYear.entries()]
    .map(([year, e]) => ({
      year,
      mean: mean(e.means),
      hotDays: e.hot,
      tropicalNights: e.trop,
    }))
    .sort((a, b) => a.year - b.year)
}

export function monthStats(series: DailySeries): MonthStat[] {
  const byKey = new Map<string, { year: number; month: number; means: number[] }>()
  for (let i = 0; i < series.time.length; i++) {
    const year = Number(series.time[i].slice(0, 4))
    const month = Number(series.time[i].slice(5, 7))
    const key = `${year}-${month}`
    if (!byKey.has(key)) byKey.set(key, { year, month, means: [] })
    if (series.tmean[i] != null) byKey.get(key)!.means.push(series.tmean[i])
  }
  return [...byKey.values()].map((e) => ({
    year: e.year,
    month: e.month,
    mean: mean(e.means),
  }))
}
