'use client'

import { useEffect } from 'react'
import { configureAnalytics, consoleProvider, setConsent } from '../src/analytics'

/** Client-side bootstrap: analytics provider + service worker. Renders nothing. */
export default function ClientInit() {
  useEffect(() => {
    const isProd = process.env.NODE_ENV === 'production'
    const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

    if (isProd && phKey) {
      // lazy-load PostHog only when actually used (keeps it out of the main bundle)
      import('posthog-js').then(({ default: posthog }) => {
        posthog.init(phKey, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
          person_profiles: 'identified_only',
          autocapture: false,
          capture_pageview: true,
          capture_pageleave: true,
        })
        configureAnalytics((event, props) => {
          const clean: Record<string, string | number | boolean> = {}
          if (props) {
            for (const [k, v] of Object.entries(props)) if (v != null) clean[k] = v
          }
          posthog.capture(event, clean)
        })
      })
    } else if (!isProd) {
      configureAnalytics(consoleProvider)
    }
    // prod without a PostHog key: custom events stay unconfigured;
    // Vercel <Analytics/> still provides free page-view stats.
    setConsent(true)

    if (isProd && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
