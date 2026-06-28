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

export async function fetchCurrent(place: Place): Promise<CurrentWeather> {
  const url =
    `${FORECAST}?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,weather_code,is_day&timezone=auto`
  const d = await getJSON(url)
  const c = d.current
  return {
    temperature: c.temperature_2m,
    time: c.time,
    weatherCode: c.weather_code,
    isDay: c.is_day === 1,
  }
}

/** Today's max so far + min, from the forecast daily endpoint (covers the live day). */
export async function fetchToday(place: Place): Promise<{ tmax: number; tmin: number }> {
  const url =
    `${FORECAST}?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`
  const d = await getJSON(url)
  return { tmax: d.daily.temperature_2m_max[0], tmin: d.daily.temperature_2m_min[0] }
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
