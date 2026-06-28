'use client'

import { track as vercelTrack } from '@vercel/analytics'
import { useEffect } from 'react'
import { configureAnalytics, consoleProvider, setConsent } from '../src/analytics'

/** Client-side bootstrap: analytics provider + service worker. Renders nothing. */
export default function ClientInit() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // forward our events to Vercel Web Analytics (cookieless → no consent banner)
      configureAnalytics((event, props) => {
        const clean: Record<string, string | number | boolean> = {}
        if (props) {
          for (const [k, v] of Object.entries(props)) if (v != null) clean[k] = v
        }
        vercelTrack(event, clean)
      })
    } else {
      configureAnalytics(consoleProvider)
    }
    setConsent(true)

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
