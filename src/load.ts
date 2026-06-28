import { fetchArchive, fetchTodayConditions } from './api'
import { buildVerdict, dayInHistory, monthStats, yearStats } from './compute'
import type { ClimateData, DailySeries, Place } from './types'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/**
 * The archive (1940→) only changes once a day, so cache it per location/end-date
 * in localStorage. Keeps reloads instant and avoids the free-tier rate limit.
 * Current + today readings are always fetched fresh (they're tiny).
 */
function archiveCacheKey(place: Place, endDate: string) {
  return `czytorekord.archive.${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}.${endDate}`
}

async function getArchive(place: Place, endDate: string): Promise<DailySeries> {
  const key = archiveCacheKey(place, endDate)
  try {
    const cached = localStorage.getItem(key)
    if (cached) return JSON.parse(cached) as DailySeries
  } catch {
    /* corrupt cache — ignore and refetch */
  }
  const series = await fetchArchive(place, endDate)
  try {
    // drop stale entries for other end-dates of the same place before writing
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith('czytorekord.archive.') && k !== key) localStorage.removeItem(k)
    }
    localStorage.setItem(key, JSON.stringify(series))
  } catch {
    /* quota exceeded — fine, we just won't cache */
  }
  return series
}

export async function loadClimate(place: Place): Promise<ClimateData> {
  const now = new Date()
  const thisYear = now.getFullYear()
  const monthDay = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  // archive lags a few days; ask up to 2 days ago to stay within availability
  const endRef = new Date(now.getTime() - 2 * 86400000)
  const endDate = `${endRef.getFullYear()}-${pad(endRef.getMonth() + 1)}-${pad(endRef.getDate())}`

  const [cond, series] = await Promise.all([
    fetchTodayConditions(place),
    getArchive(place, endDate),
  ])

  // the value we judge: the day's max (already reached, or still forecast ahead)
  const todayValue = cond.dayMax

  const verdict = buildVerdict(series, monthDay, todayValue, thisYear)
  const ys = yearStats(series)
  const ms = monthStats(series)

  return {
    place,
    current: cond.current,
    todayValue,
    todayMaxSoFar: cond.maxSoFar,
    todayPeakAhead: cond.peakAhead,
    series,
    dayInHistory: dayInHistory(series, monthDay).filter((d) => d.year < thisYear),
    yearStats: ys,
    monthStats: ms,
    verdict,
    startYear: ys.length ? ys[0].year : 1940,
    endYear: thisYear,
  }
}
