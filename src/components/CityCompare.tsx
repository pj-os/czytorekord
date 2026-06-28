import { useState } from 'react'
import { track } from '../analytics'
import { daySnapshot } from '../compute'
import { loadClimate } from '../load'
import { thermalForTemp } from '../palette'
import type { ClimateData, DailySeries, Place } from '../types'
import LocationPicker from './LocationPicker'

interface Props {
  base: ClimateData
  monthDay: string
  thisYear: number
  label: string
}

interface CityCol {
  name: string
  avg: number
  recordHot: number
  recordYear: number
}

function colFor(series: DailySeries, name: string, monthDay: string, thisYear: number): CityCol {
  const snap = daySnapshot(series, monthDay, thisYear, false, null)
  return {
    name,
    avg: snap.avg,
    recordHot: snap.recordHot?.tmax ?? NaN,
    recordYear: snap.recordHot?.year ?? 0,
  }
}

/** Side-by-side comparison of the selected calendar day between two cities. */
export default function CityCompare({ base, monthDay, thisYear, label }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [other, setOther] = useState<ClimateData | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function pick(place: Place) {
    setPickerOpen(false)
    setStatus('loading')
    try {
      setOther(await loadClimate(place))
      track('compare', { with: place.name })
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  if (!other) {
    return (
      <div className="compare-empty">
        <button className="chip" onClick={() => setPickerOpen(true)} disabled={status === 'loading'}>
          {status === 'loading' ? 'Wczytuję…' : '➕ porównaj z innym miastem'}
        </button>
        {status === 'error' && (
          <span className="compare-err">Nie udało się pobrać danych (limit API?) — spróbuj ponownie.</span>
        )}
        {pickerOpen && <LocationPicker onPick={pick} onClose={() => setPickerOpen(false)} />}
      </div>
    )
  }

  const a = colFor(base.series, base.place.name, monthDay, thisYear)
  const b = colFor(other.series, other.place.name, monthDay, thisYear)
  const delta = a.avg - b.avg
  const warmer = delta >= 0 ? a : b
  const cooler = delta >= 0 ? b : a

  return (
    <div className="compare">
      <div className="compare-cols">
        {[a, b].map((c) => (
          <div className="compare-card" key={c.name}>
            <div className="compare-name">{c.name}</div>
            <div className="compare-avg" style={{ color: thermalForTemp(c.avg) }}>
              {c.avg.toFixed(1)}
              <span>°C</span>
            </div>
            <div className="compare-meta">średnia {label}</div>
            <div className="compare-meta">
              rekord {Number.isFinite(c.recordHot) ? `${c.recordHot.toFixed(1)}°C` : '—'} ({c.recordYear})
            </div>
          </div>
        ))}
      </div>
      <p className="compare-summary">
        {Math.abs(delta) < 0.1 ? (
          <>
            {label} — w obu miastach średnio podobnie (<b>{a.avg.toFixed(1)}°C</b>).
          </>
        ) : (
          <>
            {label} — cieplej o <b>{Math.abs(delta).toFixed(1)}°C</b>:{' '}
            <b>{warmer.name}</b> ({warmer.avg.toFixed(1)}°C) vs {cooler.name} (
            {cooler.avg.toFixed(1)}°C).
          </>
        )}
      </p>
      <button className="chip compare-reset" onClick={() => setOther(null)}>
        zmień / usuń porównanie
      </button>
    </div>
  )
}
