import { useEffect } from 'react'
import { CALENDAR, wrapIndex } from '../calendar'

interface Props {
  index: number
  todayIndex: number
  label: string // "27 czerwca"
  onChange: (index: number) => void
}

const MONTH_TICKS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
const MONTH_SHORT = ['S', 'L', 'M', 'K', 'M', 'C', 'L', 'S', 'W', 'P', 'L', 'G']

export default function DayScrubber({ index, todayIndex, label, onChange }: Props) {
  // ←/→ steps the day (ignored while typing in an input)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') onChange(wrapIndex(index - 1))
      if (e.key === 'ArrowRight') onChange(wrapIndex(index + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onChange])

  const isToday = index === todayIndex
  const c = CALENDAR[index]

  return (
    <div className="scrubber">
      <div className="scrubber-head">
        <button className="scrub-arrow" onClick={() => onChange(wrapIndex(index - 1))} aria-label="Poprzedni dzień">
          ‹
        </button>
        <div className="scrub-date">
          <span className="scrub-label">{label}</span>
          {isToday ? (
            <span className="scrub-tag scrub-tag-today">dziś</span>
          ) : (
            <button className="scrub-tag scrub-reset" onClick={() => onChange(todayIndex)}>
              ↩ wróć do dziś
            </button>
          )}
        </div>
        <button className="scrub-arrow" onClick={() => onChange(wrapIndex(index + 1))} aria-label="Następny dzień">
          ›
        </button>
      </div>

      <div className="scrub-track-wrap">
        <input
          className="scrub-track"
          type="range"
          min={0}
          max={364}
          value={index}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Wybierz dzień roku"
        />
        {/* today marker on the track */}
        <div className="scrub-today-mark" style={{ left: `${(todayIndex / 364) * 100}%` }} />
        <div className="scrub-months">
          {MONTH_TICKS.map((t, i) => (
            <span key={i} style={{ left: `${(t / 364) * 100}%` }}>
              {MONTH_SHORT[i]}
            </span>
          ))}
        </div>
      </div>
      <p className="scrub-hint">
        ← → lub przeciągnij suwak · {c.day}.{String(c.month).padStart(2, '0')}
      </p>
    </div>
  )
}
