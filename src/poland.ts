// Static, precomputed all-time records per calendar day for the preset cities.
// Generated offline (scripts) → /public/data/city-records.json — so "where was
// it hottest on this date, and when" is instant and free (no runtime API hit).

export interface CityRecordEntry {
  c: string // city slug
  t: number // record max temperature (°C)
  y: number // year of the record
}

export interface CityRecords {
  cities: Record<string, string> // slug → display name
  byDay: Record<string, CityRecordEntry[]> // "MM-DD" → entries sorted hottest-first
}

export interface RankedRecord {
  slug: string
  name: string
  tmax: number
  year: number
}

/** Hottest-first ranking of cities for a calendar day, resolved to display names. */
export function recordsForDay(records: CityRecords, monthDay: string): RankedRecord[] {
  const day = records.byDay[monthDay] ?? []
  return day.map((e) => ({
    slug: e.c,
    name: records.cities[e.c] ?? e.c,
    tmax: e.t,
    year: e.y,
  }))
}

export interface AbsoluteRecord extends RankedRecord {
  monthDay: string
}

/** The single hottest reading across all tracked spots and days (where + when). */
export function absoluteRecord(records: CityRecords): AbsoluteRecord | null {
  let best: AbsoluteRecord | null = null
  for (const md of Object.keys(records.byDay)) {
    const top = records.byDay[md][0]
    if (top && (!best || top.t > best.tmax)) {
      best = { slug: top.c, name: records.cities[top.c] ?? top.c, tmax: top.t, year: top.y, monthDay: md }
    }
  }
  return best
}

let cache: CityRecords | null = null

/** Fetch the static records dataset once (cached in memory). */
export async function loadCityRecords(): Promise<CityRecords | null> {
  if (cache) return cache
  try {
    const res = await fetch('/data/city-records.json')
    if (!res.ok) return null
    cache = (await res.json()) as CityRecords
    return cache
  } catch {
    return null
  }
}
