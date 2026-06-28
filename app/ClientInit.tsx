'use client'

import { useEffect } from 'react'
import { configureAnalytics, consoleProvider, setConsent } from '../src/analytics'

/** Client-side bootstrap: analytics (dev) + service worker (prod). Renders nothing. */
export default function ClientInit() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      configureAnalytics(consoleProvider)
      setConsent(true)
    }
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
