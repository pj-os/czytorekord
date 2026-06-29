import { todayProgress } from './compute'
import type { CurrentWeather, DailySeries, Place } from './types'

const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search'
const REVERSE = 'https://api.bigdatacloud.net/data/reverse-geocode-client'
const FORECAST = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive'

export const ARCHIVE_START = '1940-01-01'

/** A handful of major PL cities so the picker is instant without typing. */
export const PRESET_CITIES: Place[] = [
  { slug: 'warszawa', name: 'Warszawa', admin: 'Mazowieckie', country: 'PL', latitude: 52.2298, longitude: 21.0118 },
  { slug: 'krakow', name: 'Kraków', admin: 'Małopolskie', country: 'PL', latitude: 50.0614, longitude: 19.9372 },
  { slug: 'lodz', name: 'Łódź', admin: 'Łódzkie', country: 'PL', latitude: 51.7592, longitude: 19.456 },
  { slug: 'wroclaw', name: 'Wrocław', admin: 'Dolnośląskie', country: 'PL', latitude: 51.1079, longitude: 17.0385 },
  { slug: 'poznan', name: 'Poznań', admin: 'Wielkopolskie', country: 'PL', latitude: 52.4064, longitude: 16.9252 },
  { slug: 'gdansk', name: 'Gdańsk', admin: 'Pomorskie', country: 'PL', latitude: 54.352, longitude: 18.6466 },
  { slug: 'szczecin', name: 'Szczecin', admin: 'Zachodniopomorskie', country: 'PL', latitude: 53.4285, longitude: 14.5528 },
  { slug: 'lublin', name: 'Lublin', admin: 'Lubelskie', country: 'PL', latitude: 51.2465, longitude: 22.5684 },
  { slug: 'katowice', name: 'Katowice', admin: 'Śląskie', country: 'PL', latitude: 50.2649, longitude: 19.0238 },
  { slug: 'bialystok', name: 'Białystok', admin: 'Podlaskie', country: 'PL', latitude: 53.1325, longitude: 23.1688 },
  { slug: 'rzeszow', name: 'Rzeszów', admin: 'Podkarpackie', country: 'PL', latitude: 50.0413, longitude: 21.999 },
  { slug: 'zakopane', name: 'Zakopane', admin: 'Małopolskie', country: 'PL', latitude: 49.299, longitude: 19.9496 },
]

/** Look up a preset city by its URL slug. */
export function cityBySlug(slug: string): Place | null {
  return PRESET_CITIES.find((c) => c.slug === slug) ?? null
}

/**
 * Broader set used for the "Najcieplej w Polsce" ranking + records — includes
 * known heat/extreme spots (Słubice, the warm SW border, etc.), not just the
 * big cities, so the absolute record actually surfaces the real hot places.
 */
export const POLAND_SPOTS: Place[] = [
  ...PRESET_CITIES,
  { slug: 'slubice', name: 'Słubice', admin: 'Lubuskie', country: 'PL', latitude: 52.3508, longitude: 14.5601 },
  { slug: 'kostrzyn', name: 'Kostrzyn n. Odrą', admin: 'Lubuskie', country: 'PL', latitude: 52.5896, longitude: 14.6486 },
  { slug: 'gorzow', name: 'Gorzów Wlkp.', admin: 'Lubuskie', country: 'PL', latitude: 52.7368, longitude: 15.2288 },
  { slug: 'zielona-gora', name: 'Zielona Góra', admin: 'Lubuskie', country: 'PL', latitude: 51.9356, longitude: 15.5062 },
  { slug: 'legnica', name: 'Legnica', admin: 'Dolnośląskie', country: 'PL', latitude: 51.2070, longitude: 16.1619 },
  { slug: 'glogow', name: 'Głogów', admin: 'Dolnośląskie', country: 'PL', latitude: 51.6640, longitude: 16.0844 },
  { slug: 'opole', name: 'Opole', admin: 'Opolskie', country: 'PL', latitude: 50.6751, longitude: 17.9213 },
  { slug: 'tarnow', name: 'Tarnów', admin: 'Małopolskie', country: 'PL', latitude: 50.0121, longitude: 20.9858 },
  { slug: 'sandomierz', name: 'Sandomierz', admin: 'Świętokrzyskie', country: 'PL', latitude: 50.6829, longitude: 21.7497 },
  { slug: 'kielce', name: 'Kielce', admin: 'Świętokrzyskie', country: 'PL', latitude: 50.8661, longitude: 20.6286 },
  { slug: 'czestochowa', name: 'Częstochowa', admin: 'Śląskie', country: 'PL', latitude: 50.8118, longitude: 19.1203 },
  { slug: 'kalisz', name: 'Kalisz', admin: 'Wielkopolskie', country: 'PL', latitude: 51.7611, longitude: 18.0911 },
  { slug: 'torun', name: 'Toruń', admin: 'Kujawsko-Pomorskie', country: 'PL', latitude: 53.0138, longitude: 18.5984 },
  { slug: 'bydgoszcz', name: 'Bydgoszcz', admin: 'Kujawsko-Pomorskie', country: 'PL', latitude: 53.1235, longitude: 18.0084 },
  { slug: 'plock', name: 'Płock', admin: 'Mazowieckie', country: 'PL', latitude: 52.5463, longitude: 19.7065 },
  { slug: 'radom', name: 'Radom', admin: 'Mazowieckie', country: 'PL', latitude: 51.4027, longitude: 21.1471 },
  { slug: 'olsztyn', name: 'Olsztyn', admin: 'Warmińsko-Mazurskie', country: 'PL', latitude: 53.7799, longitude: 20.4942 },
  { slug: 'suwalki', name: 'Suwałki', admin: 'Podlaskie', country: 'PL', latitude: 54.1115, longitude: 22.9309 },
]

/** Look up any tracked spot (big city or extreme) by slug. */
export function spotBySlug(slug: string): Place | null {
  return POLAND_SPOTS.find((c) => c.slug === slug) ?? null
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function getJSON(url: string, retries = 2): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url)
    if (res.ok) return res.json()
    // Open-Meteo rate-limits the free tier — back off and retry on 429.
    if (res.status === 429 && attempt < retries) {
      await sleep(1200 * (attempt + 1))
      continue
    }
    throw new Error(`HTTP ${res.status} dla ${url}`)
  }
}

/** Free-text city search (Open-Meteo geocoding). */
export async function searchCities(query: string): Promise<Place[]> {
  if (!query.trim()) return []
  const url = `${GEOCODE}?name=${encodeURIComponent(query)}&count=8&language=pl&format=json`
  const data = await getJSON(url)
  if (!data.results) return []
  return data.results.map((r: any) => ({
    name: r.name,
    admin: r.admin1 ?? null,
    country: r.country_code ?? r.country ?? '',
    latitude: r.latitude,
    longitude: r.longitude,
  }))
}

/** Reverse-geocode browser coordinates into a human place name (no API key). */
export async function reverseGeocode(lat: number, lon: number): Promise<Place> {
  try {
    const url = `${REVERSE}?latitude=${lat}&longitude=${lon}&localityLanguage=pl`
    const d = await getJSON(url)
    const name = d.city || d.locality || d.principalSubdivision || 'Twoja lokalizacja'
    return {
      name,
      admin: d.principalSubdivision ?? null,
      country: d.countryCode ?? '',
      latitude: lat,
      longitude: lon,
    }
  } catch {
    return { name: 'Twoja lokalizacja', admin: null, country: '', latitude: lat, longitude: lon }
  }
}

export interface TodayConditions {
  current: CurrentWeather
  /** highest temp reached so far today */
  maxSoFar: number
  /** day's max (reached or still forecast) */
  dayMax: number
  /** true while the daily peak is still ahead */
  peakAhead: boolean
}

/** Current reading + today's hourly run, in one call — used to judge the live day. */
export async function fetchTodayConditions(place: Place): Promise<TodayConditions> {
  const url =
    `${FORECAST}?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,weather_code,is_day&hourly=temperature_2m&forecast_days=1&timezone=auto`
  const d = await getJSON(url)
  const c = d.current
  const current: CurrentWeather = {
    temperature: c.temperature_2m,
    time: c.time,
    weatherCode: c.weather_code,
    isDay: c.is_day === 1,
  }
  const prog = todayProgress(d.hourly.time, d.hourly.temperature_2m, c.time)
  return {
    current,
    maxSoFar: prog.maxSoFar,
    dayMax: Math.max(prog.maxSoFar, prog.maxRest),
    peakAhead: prog.peakAhead,
  }
}

export interface PolandNowEntry {
  slug: string
  name: string
  temp: number
  dayMax: number
}

/** Live: current temp + today's max for all preset cities, in ONE multi-location call. */
export async function fetchPolandNow(): Promise<PolandNowEntry[]> {
  const lats = POLAND_SPOTS.map((c) => c.latitude).join(',')
  const lons = POLAND_SPOTS.map((c) => c.longitude).join(',')
  const url =
    `${FORECAST}?latitude=${lats}&longitude=${lons}` +
    `&current=temperature_2m&daily=temperature_2m_max&forecast_days=1&timezone=auto`
  const d = await getJSON(url)
  const arr: any[] = Array.isArray(d) ? d : [d]
  return POLAND_SPOTS.map((c, i) => {
    const r = arr[i] ?? {}
    return {
      slug: c.slug ?? c.name,
      name: c.name,
      temp: r.current?.temperature_2m,
      dayMax: r.daily?.temperature_2m_max?.[0],
    }
  })
    .filter((e) => e.dayMax != null)
    .sort((a, b) => b.dayMax - a.dayMax)
}

export async function fetchArchive(place: Place, endDate: string): Promise<DailySeries> {
  // Only request max+min (cheaper on the free tier's cost-weighted limit);
  // the daily mean is approximated as their midpoint, which is plenty accurate
  // for warming stripes and annual/monthly rankings.
  const url =
    `${ARCHIVE}?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&start_date=${ARCHIVE_START}&end_date=${endDate}` +
    `&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
  const d = await getJSON(url)
  const tmax: number[] = d.daily.temperature_2m_max
  const tmin: number[] = d.daily.temperature_2m_min
  const tmean = tmax.map((mx, i) =>
    mx != null && tmin[i] != null ? (mx + tmin[i]) / 2 : (mx ?? tmin[i]),
  )
  return { time: d.daily.time, tmax, tmin, tmean }
}
