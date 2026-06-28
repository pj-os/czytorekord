import { useEffect } from 'react'
import AboutContent from './AboutContent'

interface Props {
  startYear: number
  onClose: () => void
}

/** "O projekcie / Metodologia" — trust & E-E-A-T content. Becomes an SSR page after the Next.js migration. */
export default function AboutModal({ startYear, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="about-backdrop" onClick={onClose}>
      <div
        className="about"
        role="dialog"
        aria-modal="true"
        aria-label="O projekcie i metodologia"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="about-close" onClick={onClose} aria-label="Zamknij">
          ✕
        </button>
        <AboutContent startYear={startYear} />
      </div>
    </div>
  )
}
