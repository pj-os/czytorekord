import { useEffect, useRef, useState } from 'react'
import { PRESET_CITIES, reverseGeocode, searchCities } from '../api'
import type { Place } from '../types'

interface Props {
  onPick: (place: Place) => void
  onClose: (() => void) | null
}

export default function LocationPicker({ onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const id = setTimeout(async () => {
      try {
        setResults(await searchCities(query))
      } catch {
        /* ignore transient search errors */
      }
    }, 280)
    return () => clearTimeout(id)
  }, [query])

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Twoja przeglądarka nie udostępnia lokalizacji.')
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
        onPick(place)
      },
      () => {
        setLocating(false)
        setError('Nie udało się ustalić lokalizacji — wybierz miasto poniżej.')
      },
      { timeout: 8000, maximumAge: 600000 },
    )
  }

  return (
    <div className="picker-backdrop" onClick={() => onClose?.()}>
      <div className="picker" onClick={(e) => e.stopPropagation()}>
        <h3>Wybierz miejsce</h3>

        <div className="locate-row">
          <button className="chip locate" onClick={useMyLocation} disabled={locating}>
            <span className="dot" />
            {locating ? 'Lokalizuję…' : 'Użyj mojej lokalizacji'}
          </button>
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj miasta…"
        />

        {error && <p style={{ color: '#ff8a7a', fontSize: 13, marginTop: 10 }}>{error}</p>}

        {results.length > 0 ? (
          <div className="result-list">
            {results.map((r, i) => (
              <button className="result" key={i} onClick={() => onPick(r)}>
                <span>{r.name}</span>
                <span className="sub">
                  {[r.admin, r.country].filter(Boolean).join(' · ')}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="section-label">Popularne miasta</div>
            <div className="preset-grid">
              {PRESET_CITIES.map((c) => (
                <button className="chip" key={c.name} onClick={() => onPick(c)}>
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
