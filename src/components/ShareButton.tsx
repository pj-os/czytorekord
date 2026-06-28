import { useState } from 'react'
import { createPortal } from 'react-dom'
import { track } from '../analytics'
import { buildShareImage, type ShareCard } from '../share'

interface Props {
  card: ShareCard
}

type State = 'idle' | 'working' | 'error'

export default function ShareButton({ card }: Props) {
  const [state, setState] = useState<State>('idle')
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null)

  async function onClick() {
    if (state === 'working') return
    setState('working')
    let blob: Blob
    try {
      blob = await buildShareImage(card)
    } catch {
      setState('error')
      return
    }
    track('share', { place: card.place })
    const file = new File([blob], 'czy-to-rekord.png', { type: 'image/png' })
    const nav = navigator as Navigator & {
      canShare?: (d?: ShareData) => boolean
      share?: (d: ShareData) => Promise<void>
    }
    const canShareFiles = !!(nav.canShare && nav.canShare({ files: [file] }) && nav.share)
    const isTouch = window.matchMedia?.('(pointer: coarse)').matches

    // mobile/tablet with file sharing → native share sheet
    if (canShareFiles && isTouch) {
      try {
        await nav.share!({ files: [file], title: 'Czy to rekord?', text: shareText(card), url: card.url })
        setState('idle')
        return
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          setState('idle')
          return
        }
      }
    }

    // desktop → show a preview with an explicit download (reliable across browsers)
    setPreview({ url: URL.createObjectURL(blob), file })
    setState('idle')
  }

  function close() {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  async function systemShare() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    if (preview && nav.share) {
      try {
        await nav.share({ files: [preview.file], title: 'Czy to rekord?', text: shareText(card), url: card.url })
      } catch {
        /* cancelled */
      }
    }
  }

  const canSystemShare =
    typeof navigator !== 'undefined' &&
    'share' in navigator &&
    !!(navigator as Navigator & { canShare?: (d?: ShareData) => boolean }).canShare?.({
      files: [new File([new Blob()], 'x.png', { type: 'image/png' })],
    })

  return (
    <>
      <button className="share-btn" onClick={onClick} disabled={state === 'working'}>
        <ShareIcon />
        {state === 'working' ? 'Tworzę obrazek…' : state === 'error' ? 'Nie udało się — spróbuj ponownie' : 'Udostępnij'}
      </button>

      {preview &&
        createPortal(
          <div className="picker-backdrop" onClick={close}>
            <div className="share-preview" onClick={(e) => e.stopPropagation()}>
              <button className="about-close" onClick={close} aria-label="Zamknij">
                ✕
              </button>
              <img src={preview.url} alt="Grafika do udostępnienia" />
              <div className="share-preview-actions">
                <a className="share-btn" href={preview.url} download="czy-to-rekord.png">
                  Pobierz obrazek
                </a>
                {canSystemShare && (
                  <button className="chip" onClick={systemShare}>
                    Udostępnij…
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

function shareText(card: ShareCard): string {
  return `${card.verdict} (${card.place}) — Czy to rekord?`
}

function ShareIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
      <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </svg>
  )
}
