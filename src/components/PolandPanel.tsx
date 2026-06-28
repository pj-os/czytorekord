import { useEffect, useMemo, useState } from 'react'
import { track } from '../analytics'
import { fetchPolandNow, PRESET_CITIES, type PolandNowEntry } from '../api'
import { thermalForTemp } from '../palette'
import { loadCityRecords, recordsForDay, type CityRecords } from '../poland'
import type { Place } from '../types'

interface Props {
  monthDay: string
  label: string
  isToday: boolean
  onPickCity: (place: Place) => void
}

interface Row {
  slug: string
  name: string
  value: number
  year?: number
}

/** "Najcieplej w Polsce": live ranking today + all-time record ranking for the selected day. */
export default function PolandPanel({ monthDay, label, isToday, onPickCity }: Props) {
  const [data, setData] = useState<CityRecords | null>(null)
  const [now, setNow] = useState<PolandNowEntry[] | null>(null)

  useEffect(() => {
    loadCityRecords().then(setData)
  }, [])

  useEffect(() => {
    if (isToday) fetchPolandNow().then(setNow).catch(() => setNow(null))
  }, [isToday])

  const records: Row[] = useMemo(
    () =>
      data
        ? recordsForDay(data, monthDay).map((r) => ({
            slug: r.slug,
            name: r.name,
            value: r.tmax,
            year: r.year,
          }))
        : [],
    [data, monthDay],
  )

  function pick(slug: string) {
    const p = PRESET_CITIES.find((c) => c.slug === slug)
    if (p) {
      track('poland_pick', { place: p.name })
      onPickCity(p)
    }
  }

  const liveRows: Row[] | null =
    isToday && now
      ? now.map((e) => ({ slug: e.slug, name: e.name, value: e.dayMax }))
      : null

  return (
    <div>
      {liveRows && liveRows.length > 0 && (
        <div className="poland-block">
          <p className="poland-head">🔥 Najcieplej teraz w Polsce (prognoza dziś)</p>
          <Ranking rows={liveRows} onPick={pick} />
        </div>
      )}

      <div className="poland-block">
        <p className="poland-head">
          Rekordy {label} — gdzie i kiedy {records.length === 0 && '(ładuję…)'}
        </p>
        <Ranking rows={records} onPick={pick} showYear />
      </div>

      <p className="poland-foot">Wśród 12 śledzonych miast · dane od 1940. Kliknij, by otworzyć.</p>
    </div>
  )
}

function Ranking({
  rows,
  onPick,
  showYear,
}: {
  rows: Row[]
  onPick: (slug: string) => void
  showYear?: boolean
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="poland-list">
      {rows.slice(0, 8).map((r, i) => (
        <button className="poland-row" key={r.slug} onClick={() => onPick(r.slug)}>
          <span className="poland-rank">{i + 1}</span>
          <span className="poland-name">{r.name}</span>
          <span
            className="poland-bar"
            style={{ width: `${(r.value / max) * 100}%`, background: thermalForTemp(r.value) }}
          />
          <span className="poland-val">
            {r.value.toFixed(1)}°C{showYear && r.year ? ` · ${r.year}` : ''}
          </span>
        </button>
      ))}
    </div>
  )
}
