import type { Place } from './types'

export interface UrlState {
  place: Place | null
  monthDay: string | null
}

/** Parse a shareable view (place + calendar day) out of the query string. */
export function readUrlState(search?: string): UrlState {
  // SSR-safe: no window during server prerender
  if (search === undefined) {
    if (typeof window === 'undefined') return { place: null, monthDay: null }
    search = window.location.search
  }
  const p = new URLSearchParams(search)
  const lat = Number(p.get('lat'))
  const lon = Number(p.get('lon'))
  const name = p.get('n')
  const d = p.get('d')

  let place: Place | null = null
  if (name && Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
    place = {
      name,
      admin: p.get('a') || null,
      country: p.get('c') || '',
      latitude: lat,
      longitude: lon,
    }
  }
  const monthDay = d && /^\d{2}-\d{2}$/.test(d) ? d : null
  return { place, monthDay }
}

/** Build the query string for a given view (no leading "?"). */
export function buildQuery(place: Place, monthDay: string): string {
  const p = new URLSearchParams()
  p.set('n', place.name)
  if (place.admin) p.set('a', place.admin)
  if (place.country) p.set('c', place.country)
  p.set('lat', place.latitude.toFixed(4))
  p.set('lon', place.longitude.toFixed(4))
  p.set('d', monthDay)
  return p.toString()
}

/** Reflect the current view into the address bar without adding history entries. */
export function writeUrlState(place: Place, monthDay: string): void {
  const qs = buildQuery(place, monthDay)
  const url = `${window.location.pathname}?${qs}`
  window.history.replaceState(null, '', url)
}

/** Absolute shareable URL for the current view (relative during SSR). */
export function shareUrl(place: Place, monthDay: string): string {
  const qs = buildQuery(place, monthDay)
  if (typeof window === 'undefined') return `/?${qs}`
  return `${window.location.origin}${window.location.pathname}?${qs}`
}
