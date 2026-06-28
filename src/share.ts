export interface ShareCard {
  place: string
  dateLabel: string // "27 czerwca 2026"
  tempText: string // "38.2" or "-4.7"
  color: string // "rgb(r,g,b)" from the thermal ramp
  verdict: string // plain-text headline
  sub: string // plain-text supporting line
  forecast: boolean
  url: string // shareable permalink to this exact view
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
  try {
    ctx.letterSpacing = '6px'
  } catch {
    /* older browsers */
  }
  ctx.fillText('CZY TO REKORD?', 80, 110)
  try {
    ctx.letterSpacing = '0px'
  } catch {
    /* noop */
  }

  // place (top-right) with a colored dot
  ctx.textAlign = 'right'
  ctx.font = "600 30px 'Space Grotesk', sans-serif"
  ctx.fillStyle = '#f4f4f8'
  ctx.fillText(card.place, W - 80, 112)
  const placeW = ctx.measureText(card.place).width
  ctx.beginPath()
  ctx.fillStyle = card.color
  ctx.arc(W - 80 - placeW - 22, 102, 9, 0, Math.PI * 2)
  ctx.fill()

  // date label
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(244,244,248,0.6)'
  ctx.font = "500 34px 'JetBrains Mono', monospace"
  try {
    ctx.letterSpacing = '5px'
  } catch {
    /* noop */
  }
  ctx.fillText(card.dateLabel.toUpperCase(), cx, 470)
  try {
    ctx.letterSpacing = '0px'
  } catch {
    /* noop */
  }

  // forecast pill
  if (card.forecast) {
    ctx.font = "500 24px 'JetBrains Mono', monospace"
    const pill = 'PROGNOZA NA DZIŚ'
    const pw = ctx.measureText(pill).width + 56
    const px = cx - pw / 2
    const py = 520
    ctx.fillStyle = 'rgba(255,170,80,0.14)'
    roundRect(ctx, px, py, pw, 52, 26)
    ctx.fill()
    ctx.fillStyle = '#ffc38a'
    ctx.fillText(pill, cx, py + 35)
  }

  // big temperature, scaled to fit width
  const maxNumW = W - 200
  let numSize = 300
  ctx.font = `700 ${numSize}px 'Space Grotesk', sans-serif`
  const numStr = card.tempText
  while (ctx.measureText(numStr).width > maxNumW && numSize > 120) {
    numSize -= 10
    ctx.font = `700 ${numSize}px 'Space Grotesk', sans-serif`
  }
  const unitSize = Math.round(numSize * 0.34)
  const numW = ctx.measureText(numStr).width
  ctx.font = `500 ${unitSize}px 'Space Grotesk', sans-serif`
  const unitW = ctx.measureText('°C').width
  const totalW = numW + unitW + 12
  const startX = cx - totalW / 2
  const numBaseline = 800
  ctx.textAlign = 'left'
  ctx.fillStyle = card.color
  ctx.font = `700 ${numSize}px 'Space Grotesk', sans-serif`
  ctx.fillText(numStr, startX, numBaseline)
  ctx.fillStyle = 'rgba(244,244,248,0.6)'
  ctx.font = `500 ${unitSize}px 'Space Grotesk', sans-serif`
  ctx.fillText('°C', startX + numW + 12, numBaseline - numSize * 0.55)

  // verdict (wrapped, bold)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#f4f4f8'
  ctx.font = "600 56px 'Space Grotesk', sans-serif"
  const vLines = wrap(ctx, card.verdict, W - 160)
  let y = 980
  for (const l of vLines) {
    ctx.fillText(l, cx, y)
    y += 70
  }

  // sub (wrapped, dim)
  ctx.fillStyle = 'rgba(244,244,248,0.55)'
  ctx.font = "400 30px 'Space Grotesk', sans-serif"
  const sLines = wrap(ctx, card.sub, W - 200)
  y += 12
  for (const l of sLines) {
    ctx.fillText(l, cx, y)
    y += 42
  }

  // footer
  ctx.fillStyle = 'rgba(244,244,248,0.32)'
  ctx.font = "500 24px 'JetBrains Mono', monospace"
  ctx.fillText('dane: Open-Meteo · reanaliza ERA5, od 1940', cx, H - 70)

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
