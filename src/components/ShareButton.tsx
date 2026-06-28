import { useState } from 'react'
import { track } from '../analytics'
import { shareCard, type ShareCard } from '../share'

interface Props {
  card: ShareCard
}

export default function ShareButton({ card }: Props) {
  const [state, setState] = useState<
    'idle' | 'working' | 'shared' | 'downloaded' | 'copied' | 'error'
  >('idle')

  async function onClick() {
    if (state === 'working') return
    setState('working')
    const res = await shareCard(card)
    track('share', { result: res })
    setState(res)
    if (res !== 'error') setTimeout(() => setState('idle'), 2600)
  }

  const label =
    state === 'working'
      ? 'Tworzę obrazek…'
      : state === 'shared'
        ? 'Udostępniono ✓'
        : state === 'copied'
          ? 'Skopiowano link + obrazek ✓'
          : state === 'downloaded'
            ? 'Pobrano obrazek ✓'
            : state === 'error'
              ? 'Nie udało się — spróbuj ponownie'
              : 'Udostępnij'

  return (
    <button className="share-btn" onClick={onClick} disabled={state === 'working'}>
      <ShareIcon />
      {label}
    </button>
  )
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
