import type { Metadata } from 'next'
import Link from 'next/link'
import AboutContent from '../../src/components/AboutContent'

export const metadata: Metadata = {
  title: 'O projekcie i metodologia',
  description:
    'Skąd dane (Open-Meteo / reanaliza ERA5), jak liczymy rekordy, dni upalne i noce tropikalne, oraz ograniczenia.',
}

export default function Page() {
  return (
    <main className="page">
      <Link href="/" className="page-back">
        ← wróć do aplikacji
      </Link>
      <article className="about about-static">
        <AboutContent startYear={1940} />
      </article>
    </main>
  )
}
