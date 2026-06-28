import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '../src/index.css'
import ClientInit from './ClientInit'

const DESC =
  'Sprawdź, czy dzisiejsza temperatura w Twoim mieście to rekord. Ponad 80 lat danych pogodowych (od 1940) dla całej Polski — rekordy ciepła i zimna, dni upalne, noce tropikalne.'

export const metadata: Metadata = {
  metadataBase: new URL('https://czytorekord.pl'),
  title: {
    default: 'Czy to rekord? — termiczna historia Polski',
    template: '%s · Czy to rekord?',
  },
  description: DESC,
  applicationName: 'Czy to rekord?',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, title: 'Czy to rekord?' },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    title: 'Czy to rekord? — termiczna historia Polski',
    description: DESC,
    images: ['/icon.svg'],
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  themeColor: '#07070c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Czy to rekord?',
  url: 'https://czytorekord.pl',
  applicationCategory: 'WeatherApplication',
  operatingSystem: 'Web',
  inLanguage: 'pl',
  isAccessibleForFree: true,
  description: DESC,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'PLN' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <ClientInit />
      </body>
    </html>
  )
}
