import { motion } from 'framer-motion'
import { thermalForTemp } from '../palette'
import type { DayInHistory } from '../types'

interface Props {
  history: DayInHistory[] // prior years only
  subjectValue: number | null // current-year value on this date, if known
  subjectYear: number
  subjectIsToday: boolean
  label: string // e.g. "27 czerwca"
}

/**
 * Vertical bars, one per year, for one calendar day across history.
 * Height & color encode the day's max temperature. The current-year bar
 * (today or an already-passed date) is highlighted; if that value isn't known
 * yet we instead highlight the all-time record bar.
 */
export default function DayHistory({
  history,
  subjectValue,
  subjectYear,
  subjectIsToday,
  label,
}: Props) {
  const data: DayInHistory[] =
    subjectValue != null ? [...history, { year: subjectYear, tmax: subjectValue }] : [...history]

  if (data.length === 0) return null

  const temps = data.map((d) => d.tmax)
  const lo = Math.min(...temps) - 1
  const hi = Math.max(...temps) + 1
  const range = hi - lo || 1
  const recordYear = data.reduce((m, d) => (d.tmax > m.tmax ? d : m), data[0]).year

  const W = 100
  const H = 100
  const n = data.length
  const gap = 0.25
  const bw = W / n - gap

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 160 }}>
        {data.map((d, i) => {
          const norm = (d.tmax - lo) / range
          const barH = 8 + norm * (H - 12)
          const x = i * (W / n) + gap / 2
          const isSubject = subjectValue != null && d.year === subjectYear
          const isRecord = subjectValue == null && d.year === recordYear
          const outline = isSubject || isRecord
          return (
            <motion.rect
              key={d.year}
              x={x}
              width={bw}
              rx={0.4}
              initial={{ height: 0, y: H }}
              animate={{ height: barH, y: H - barH }}
              transition={{ delay: i * 0.004, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              fill={thermalForTemp(d.tmax)}
              stroke={outline ? '#fff' : 'none'}
              strokeWidth={outline ? 0.5 : 0}
              opacity={outline ? 1 : 0.9}
              style={{ transition: 'fill 0.4s ease' }}
            >
              <title>
                {d.year}: {d.tmax.toFixed(1)}°C
                {isSubject ? (subjectIsToday ? ' (dziś)' : ` (${subjectYear})`) : ''}
                {isRecord ? ' — rekord' : ''}
              </title>
            </motion.rect>
          )
        })}
      </svg>
      <div className="day-axis">
        <span>{data[0]?.year}</span>
        <span>{label} · maks. temperatura w danym roku</span>
        <span>{subjectValue != null ? (subjectIsToday ? 'dziś' : subjectYear) : data[data.length - 1]?.year}</span>
      </div>
    </div>
  )
}
