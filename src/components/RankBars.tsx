import { motion } from 'framer-motion'
import { thermalForTemp } from '../palette'

export interface RankItem {
  label: string
  value: number
  /** value used for color mapping (defaults to value) */
  colorTemp?: number
  highlight?: boolean
  suffix?: string
}

interface Props {
  items: RankItem[]
  /** color ramp bounds, since hot-day counts aren't temperatures */
  colorMin?: number
  colorMax?: number
}

export default function RankBars({ items, colorMin, colorMax }: Props) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div>
      {items.map((it, idx) => {
        const ct = it.colorTemp ?? it.value
        const color =
          colorMin != null && colorMax != null
            ? thermalForTemp(ct, colorMin, colorMax)
            : thermalForTemp(ct)
        return (
          <div className={`rank-row${it.highlight ? ' is-this' : ''}`} key={it.label + idx}>
            <span className="rank-idx">{idx + 1}</span>
            <motion.div
              className="rank-bar"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${(it.value / max) * 100}%` }}
              transition={{ delay: idx * 0.04, duration: 0.6, ease: 'easeOut' }}
            />
            <span className="rank-val">
              {it.label} · {it.value.toFixed(it.suffix ? 0 : 1)}
              {it.suffix ?? '°C'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
