import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cityBySlug, fetchArchive } from '../../../src/api'
import { daySnapshot } from '../../../src/compute'
import { dayLabel } from '../../../src/format'
import { buildQuery } from '../../../src/url'

// ISR: render once and cache, regenerate at most hourly. Pages build lazily on
// first visit (no build-time fetch → build never hits the API rate limit), and
// Next dedupes the per-city archive fetch across that city's date-pages.
export const revalidate = 3600
export const dynamicParams = true

// empty → nothing prebuilt at build time (no build-time API hit), but this opts
// the route into static+ISR: pages are generated on first visit and then cached.
export function generateStaticParams() {
  return []
}

interface Params {
  params: { miasto: string; data: string }
}

const MD_RE = /^(\d{2})-(\d{2})$/

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function labelFor(monthDay: string): string {
  const m = MD_RE.exec(monthDay)
  if (!m) return monthDay
  return dayLabel(new Date(2024, Number(m[1]) - 1, Number(m[2])))
}

export function generateMetadata({ params }: Params): Metadata {
  const city = cityBySlug(params.miasto)
  if (!city || !MD_RE.test(params.data)) return { title: 'Nie znaleziono' }
  const label = labelFor(params.data)
  const title = `${city.name}: pogoda ${label} w historii`
  const description = `Rekordy temperatury na ${label} dla miasta ${city.name} — najwyższa i najniższa od 1940 roku, średnia i przebieg rok po roku.`
  const url = `/${city.slug}/${params.data}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article', images: ['/icon.svg'] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function CityDayPage({ params }: Params) {
  const city = cityBySlug(params.miasto)
  if (!city || !MD_RE.test(params.data)) notFound()

  const label = labelFor(params.data)
  const now = new Date()
  const thisYear = now.getFullYear()
  const end = new Date(now.getTime() - 2 * 86400000)
  const endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`

  let snap
  try {
    const series = await fetchArchive(city, endDate)
    snap = daySnapshot(series, params.data, thisYear, false, null)
  } catch {
    snap = null
  }

  const appUrl = `/?${buildQuery(city, params.data)}`

  return (
    <main className="page">
      <Link href="/" className="page-back">
        ← Czy to rekord?
      </Link>

      <article className="seo">
        <p className="seo-kicker">{city.name}</p>
        <h1>
          {label} w historii — {city.name}
        </h1>

        {!snap || !snap.recordHot ? (
          <p className="seo-lead">Dane chwilowo niedostępne. Spróbuj ponownie za chwilę.</p>
        ) : (
          <>
            <p className="seo-lead">
              {city.name}, {label}: najcieplej <b>{snap.recordHot.tmax.toFixed(1)}°C</b> (rok{' '}
              {snap.recordHot.year}), najchłodniej <b>{snap.recordCold?.tmax.toFixed(1)}°C</b> (rok{' '}
              {snap.recordCold?.year}), średnia maksymalna <b>{snap.avg.toFixed(1)}°C</b>.
            </p>

            <p className="seo-cta">
              <Link href={appUrl}>▸ Zobacz interaktywnie, czy dziś pada rekord →</Link>
            </p>

            <h2>{label} rok po roku (ostatnie lata)</h2>
            <table className="seo-table">
              <thead>
                <tr>
                  <th>Rok</th>
                  <th>Maks. temperatura</th>
                </tr>
              </thead>
              <tbody>
                {[...snap.history]
                  .slice(-15)
                  .reverse()
                  .map((d) => (
                    <tr key={d.year}>
                      <td>{d.year}</td>
                      <td>{d.tmax.toFixed(1)}°C</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        )}

        <p className="seo-foot">
          Dane: reanaliza ERA5 (Open-Meteo), od 1940. Zobacz{' '}
          <Link href="/o-projekcie">metodologię</Link>.
        </p>
      </article>
    </main>
  )
}
