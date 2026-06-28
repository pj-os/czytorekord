import { motion } from 'framer-motion'
import { useState } from 'react'
import { lifeStats } from '../compute'
import { thermalForTemp } from '../palette'
import type { ShareCard } from '../share'
import type { YearStat } from '../types'
import ShareButton from './ShareButton'

interface Props {
  years: YearStat[]
  thisYear: number
  place: string
  /** permalink used on the share card */
  url: string
}

/** "Twój wiek w upałach" — enter a birth year, see heat days accumulate across your life. */
export default function LifePanel({ years, thisYear, place, url }: Props) {
  const minYear = years.length ? years[0].year : 1940
  const upTo = thisYear - 1
  const [birthYear, setBirthYear] = useState(1990)

  const clamped = Math.max(minYear, Math.min(upTo, birthYear))
  const stats = lifeStats(years, clamped, upTo)
  const maxHot = Math.max(1, ...stats.perYear.map((y) => y.hotDays))
  const factor = stats.earlyAvg > 0 ? stats.recentAvg / stats.earlyAvg : null
  // only compare decades when they don't overlap (≥20 lived years) and differ enough
  const showTrend = factor != null && factor >= 1.15 && stats.yearsLived >= 20

  const lifeCard: ShareCard = {
    place,
    dateLabel: 'Twój wiek w upałach',
    tempText: String(stats.totalHotDays),
    unit: '',
    color: thermalForTemp(34),
    verdict: `dni upalnych (≥30°C) od ${clamped}`,
    sub: showTrend
      ? `Dni upalnych rocznie: ~${stats.earlyAvg.toFixed(0)} w dzieciństwie → ~${stats.recentAvg.toFixed(0)} dziś`
      : `przez ${stats.yearsLived} lat · ${stats.totalTropicalNights} nocy tropikalnych`,
    forecast: false,
    url,
    chart: stats.perYear.map((y) => ({ year: y.year, tmax: y.hotDays })),
    chartColors: stats.perYear.map((y) => thermalForTemp(28 + (y.hotDays / maxHot) * 12)),
    chartLabel: 'dni upalne rok po roku',
  }

  return (
    <div>
      <div className="life-input-row">
        <label htmlFor="birthyear">Rok urodzenia</label>
        <input
          id="birthyear"
          type="number"
          min={minYear}
          max={upTo}
          value={birthYear}
          onChange={(e) => setBirthYear(Number(e.target.value))}
        />
      </div>

      <p className="life-lead">
        Od Twojego urodzenia w <b>{clamped}</b> roku {place} przeżyło z Tobą{' '}
        <b>{stats.totalHotDays}</b> dni upalnych (≥30°C) i <b>{stats.totalTropicalNights}</b> nocy
        tropikalnych — przez <b>{stats.yearsLived}</b> lat.
      </p>
      {showTrend && (
        <p className="life-lead life-trend">
          Dni upalnych rocznie: w dzieciństwie ~<b>{stats.earlyAvg.toFixed(0)}</b>, dziś ~
          <b>{stats.recentAvg.toFixed(0)}</b> — to <b>×{factor!.toFixed(1)}</b> więcej.
        </p>
      )}

      <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: 90, marginTop: 14 }}>
        {stats.perYear.map((y, i) => {
          const n = stats.perYear.length
          const bw = 100 / n - 0.2
          const h = 2 + (y.hotDays / maxHot) * 27
          return (
            <motion.rect
              key={y.year}
              x={i * (100 / n) + 0.1}
              width={bw}
              rx={0.3}
              initial={{ height: 0, y: 30 }}
              animate={{ height: h, y: 30 - h }}
              transition={{ delay: i * 0.01, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              fill={thermalForTemp(28 + (y.hotDays / maxHot) * 12)}
            >
              <title>
                {y.year}: {y.hotDays} dni upalnych
              </title>
            </motion.rect>
          )
        })}
      </svg>
      <div className="day-axis">
        <span>{stats.perYear[0]?.year ?? clamped}</span>
        <span>dni upalne (≥30°C) rok po roku</span>
        <span>{upTo}</span>
      </div>

      <div className="share-row">
        <ShareButton card={lifeCard} />
      </div>
    </div>
  )
}
