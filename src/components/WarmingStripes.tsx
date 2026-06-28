import { useEffect, useRef } from 'react'
import { thermal } from '../palette'
import type { YearStat } from '../types'

interface Props {
  years: YearStat[]
}

/**
 * Ed-Hawkins-style warming stripes: one vertical bar per year, colored by how
 * that year's mean compares to the baseline period. Reveals left→right on mount.
 */
export default function WarmingStripes({ years }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const hoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || years.length === 0) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    // baseline: mean of the 1951-1980 reference period (climatology standard)
    const base = years.filter((y) => y.year >= 1951 && y.year <= 1980)
    const baseMean =
      (base.length ? base : years).reduce((a, y) => a + y.mean, 0) /
      (base.length || years.length)
    const anomalies = years.map((y) => y.mean - baseMean)
    const maxAbs = Math.max(0.5, ...anomalies.map((a) => Math.abs(a)))

    let raf = 0
    let progress = 0

    function draw() {
      const w = canvas!.clientWidth
      const h = canvas!.clientHeight
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const n = years.length
      const bw = w / n
      const shown = Math.floor(n * progress)
      for (let i = 0; i < shown; i++) {
        // map anomaly [-maxAbs, +maxAbs] → [0,1] on thermal ramp
        const t = 0.5 + anomalies[i] / (2 * maxAbs)
        ctx.fillStyle = thermal(t)
        ctx.fillRect(i * bw, 0, Math.ceil(bw) + 1, h)
      }
    }

    function animate() {
      progress = Math.min(1, progress + 0.025)
      draw()
      if (progress < 1) raf = requestAnimationFrame(animate)
    }
    animate()

    function onResize() {
      progress = 1
      draw()
    }
    window.addEventListener('resize', onResize)

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      const i = Math.floor(((e.clientX - rect.left) / rect.width) * years.length)
      const y = years[Math.max(0, Math.min(years.length - 1, i))]
      const hov = hoverRef.current
      if (hov && y) {
        hov.style.opacity = '1'
        hov.style.left = `${e.clientX - rect.left}px`
        const sign = y.mean - baseMean >= 0 ? '+' : ''
        hov.textContent = `${y.year} · ${y.mean.toFixed(1)}°C (${sign}${(y.mean - baseMean).toFixed(1)})`
      }
    }
    function onLeave() {
      if (hoverRef.current) hoverRef.current.style.opacity = '0'
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [years])

  const first = years[0]?.year
  const last = years[years.length - 1]?.year

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={ref}
        style={{ width: '100%', height: 140, borderRadius: 10, display: 'block' }}
      />
      <div
        ref={hoverRef}
        style={{
          position: 'absolute',
          top: -28,
          transform: 'translateX(-50%)',
          opacity: 0,
          pointerEvents: 'none',
          fontFamily: 'var(--mono)',
          fontSize: 12,
          background: '#101019',
          border: '1px solid var(--panel-border)',
          padding: '4px 8px',
          borderRadius: 6,
          whiteSpace: 'nowrap',
          transition: 'opacity 0.15s',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-faint)',
        }}
      >
        <span>{first}</span>
        <span>każdy pasek = jeden rok · odchylenie od średniej 1951–1980</span>
        <span>{last}</span>
      </div>
    </div>
  )
}
