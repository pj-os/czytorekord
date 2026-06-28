import { thermalForTemp } from './palette'

/** Bare domain shown as a call-to-action on the share card. */
const SHARE_SITE = 'czytorekord.pl'

export interface ShareCard {
  place: string
  dateLabel: string // "27 czerwca 2026"
  tempText: string // "38.2" or "-4.7"
  color: string // "rgb(r,g,b)" from the thermal ramp
  verdict: string // plain-text headline
  sub: string // plain-text supporting line
  forecast: boolean
  url: string // shareable permalink to this exact view
  /** unit after the big number (default "°C"; e.g. "" for a count card) */
  unit?: string
  /** series (chronological) for the mini chart — value drives bar height */
  chart?: { year: number; tmax: number }[]
  /** explicit per-bar colors (else derived from value as a temperature) */
  chartColors?: string[]
  /** year to highlight in the chart (today, or the record year) */
  chartHighlightYear?: number
  /** caption under the chart, e.g. "28 czerwca · maks. rok po roku" */
  chartLabel?: string
}

function rgba(rgb: string, a: number): string {
  return rgb.replace('rgb(', 'rgba(').replace(')', `, ${a})`)
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

async function ensureFonts() {
  try {
    await Promise.all([
      (document as any).fonts.load("700 280px 'Space Grotesk'"),
      (document as any).fonts.load("600 56px 'Space Grotesk'"),
      (document as any).fonts.load("500 30px 'JetBrains Mono'"),
      (document as any).fonts.ready,
    ])
  } catch {
    /* fonts will fall back to system */
  }
}

/** Render a portrait share card (1080×1350) of the current verdict. */
export async function buildShareImage(card: ShareCard): Promise<Blob> {
  await ensureFonts()
  const W = 1080
  const H = 1350
  const cx = W / 2
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const setLS = (px: string) => {
    try {
      ctx.letterSpacing = px
    } catch {
      /* older browsers */
    }
  }

  // background + thermal glow driven by the day's color
  ctx.fillStyle = '#07070c'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(cx, H * 0.04, 0, cx, H * 0.04, H * 0.85)
  glow.addColorStop(0, rgba(card.color, 0.5))
  glow.addColorStop(0.5, rgba(card.color, 0.12))
  glow.addColorStop(1, 'rgba(7,7,12,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // brand (top-left)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(244,244,248,0.45)'
  ctx.font = "500 26px 'JetBrains Mono', monospace"
  setLS('6px')
  ctx.fillText('CZY TO REKORD?', 80, 104)
  setLS('0px')

  // place (top-right) with a colored dot
  ctx.textAlign = 'right'
  ctx.font = "600 30px 'Space Grotesk', sans-serif"
  ctx.fillStyle = '#f4f4f8'
  ctx.fillText(card.place, W - 80, 106)
  const placeW = ctx.measureText(card.place).width
  ctx.beginPath()
  ctx.fillStyle = card.color
  ctx.arc(W - 80 - placeW - 22, 96, 9, 0, Math.PI * 2)
  ctx.fill()

  // date label
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(244,244,248,0.6)'
  ctx.font = "500 32px 'JetBrains Mono', monospace"
  setLS('5px')
  ctx.fillText(card.dateLabel.toUpperCase(), cx, 232)
  setLS('0px')

  // forecast pill
  let numBaseline = 470
  if (card.forecast) {
    ctx.font = "500 24px 'JetBrains Mono', monospace"
    const pill = 'PROGNOZA NA DZIŚ'
    const pw = ctx.measureText(pill).width + 56
    ctx.fillStyle = 'rgba(255,170,80,0.14)'
    roundRect(ctx, cx - pw / 2, 268, pw, 52, 26)
    ctx.fill()
    ctx.fillStyle = '#ffc38a'
    ctx.fillText(pill, cx, 303)
    numBaseline = 510
  }

  // big temperature, scaled to fit width
  const maxNumW = W - 220
  let numSize = 280
  ctx.font = `700 ${numSize}px 'Space Grotesk', sans-serif`
  const numStr = card.tempText
  while (ctx.measureText(numStr).width > maxNumW && numSize > 120) {
    numSize -= 10
    ctx.font = `700 ${numSize}px 'Space Grotesk', sans-serif`
  }
  const unit = card.unit ?? '°C'
  const unitSize = Math.round(numSize * 0.34)
  const numW = ctx.measureText(numStr).width
  ctx.font = `500 ${unitSize}px 'Space Grotesk', sans-serif`
  const unitW = unit ? ctx.measureText(unit).width + 12 : 0
  const startX = cx - (numW + unitW) / 2
  ctx.textAlign = 'left'
  ctx.fillStyle = card.color
  ctx.font = `700 ${numSize}px 'Space Grotesk', sans-serif`
  ctx.fillText(numStr, startX, numBaseline)
  if (unit) {
    ctx.fillStyle = 'rgba(244,244,248,0.6)'
    ctx.font = `500 ${unitSize}px 'Space Grotesk', sans-serif`
    ctx.fillText(unit, startX + numW + 12, numBaseline - numSize * 0.55)
  }

  // verdict (wrapped, bold) — flowing cursor
  ctx.textAlign = 'center'
  ctx.fillStyle = '#f4f4f8'
  ctx.font = "600 54px 'Space Grotesk', sans-serif"
  let y = numBaseline + 130
  for (const l of wrap(ctx, card.verdict, W - 140)) {
    ctx.fillText(l, cx, y)
    y += 64
  }

  // sub (wrapped, dim)
  ctx.fillStyle = 'rgba(244,244,248,0.55)'
  ctx.font = "400 28px 'Space Grotesk', sans-serif"
  y += 10
  for (const l of wrap(ctx, card.sub, W - 200)) {
    ctx.fillText(l, cx, y)
    y += 38
  }

  // signature mini-chart: "this day in history" bars
  if (card.chart && card.chart.length > 1) {
    const data = card.chart
    const temps = data.map((d) => d.tmax)
    const lo = Math.min(...temps) - 1
    const hi = Math.max(...temps) + 1
    const range = hi - lo || 1
    const left = 80
    const right = W - 80
    const bandW = right - left
    const bottom = H - 150
    const bandTop = Math.max(y + 56, bottom - 300)
    const bandH = bottom - bandTop
    const n = data.length
    const gap = 3
    const bw = bandW / n - gap

    // caption
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(244,244,248,0.5)'
    ctx.font = "500 22px 'JetBrains Mono', monospace"
    setLS('2px')
    ctx.fillText((card.chartLabel ?? 'maks. rok po roku').toUpperCase(), cx, bandTop - 26)
    setLS('0px')

    for (let i = 0; i < n; i++) {
      const d = data[i]
      const norm = (d.tmax - lo) / range
      const h = 10 + norm * (bandH - 10)
      const x = left + i * (bandW / n)
      const isHi = d.year === card.chartHighlightYear
      ctx.fillStyle = card.chartColors?.[i] ?? thermalForTemp(d.tmax)
      ctx.globalAlpha = isHi ? 1 : 0.85
      roundRect(ctx, x, bottom - h, Math.max(2, bw), h, 3)
      ctx.fill()
      if (isHi) {
        ctx.globalAlpha = 1
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        roundRect(ctx, x - 1, bottom - h - 1, Math.max(2, bw) + 2, h + 2, 3)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1

    // axis endpoints
    ctx.fillStyle = 'rgba(244,244,248,0.38)'
    ctx.font = "500 20px 'JetBrains Mono', monospace"
    ctx.textAlign = 'left'
    ctx.fillText(String(data[0].year), left, bottom + 30)
    ctx.textAlign = 'right'
    const lastIsToday = data[data.length - 1].year === card.chartHighlightYear && card.forecast
    ctx.fillText(lastIsToday ? 'dziś' : String(data[data.length - 1].year), right, bottom + 30)
  }

  // footer — site URL (call to action) + data attribution
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = "700 30px 'JetBrains Mono', monospace"
  ctx.fillText(SHARE_SITE, cx, H - 74)
  ctx.fillStyle = 'rgba(244,244,248,0.32)'
  ctx.font = "500 22px 'JetBrains Mono', monospace"
  ctx.fillText('dane: Open-Meteo · reanaliza ERA5, od 1940', cx, H - 42)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export type ShareResult = 'shared' | 'downloaded' | 'copied' | 'error'

/** Share the card via the Web Share API, falling back to download + clipboard. */
export async function shareCard(card: ShareCard): Promise<ShareResult> {
  let blob: Blob
  try {
    blob = await buildShareImage(card)
  } catch {
    return 'error'
  }
  const file = new File([blob], 'czy-to-rekord.png', { type: 'image/png' })
  const text = `${card.verdict} (${card.place}) — Czy to rekord?`
  const nav = navigator as Navigator & {
    canShare?: (d?: ShareData) => boolean
    share?: (d: ShareData) => Promise<void>
  }

  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: 'Czy to rekord?', text, url: card.url })
      return 'shared'
    } catch (e) {
      // user cancelled the native sheet — not an error worth surfacing
      if (e instanceof Error && e.name === 'AbortError') return 'shared'
    }
  }

  // fallback: download the image and copy the link + text
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objUrl
  a.download = 'czy-to-rekord.png'
  a.click()
  URL.revokeObjectURL(objUrl)
  try {
    await navigator.clipboard.writeText(`${text}\n${card.url}`)
    return 'copied'
  } catch {
    return 'downloaded'
  }
}
