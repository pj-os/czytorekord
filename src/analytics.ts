// Provider-agnostic analytics layer.
//
// Design goals:
//  - RODO-friendly: NOTHING leaves the browser until the user grants consent
//    AND a concrete provider has been configured. Events queue until then.
//  - Vendor-neutral: plug in Plausible / GA / PostHog / etc. via configureAnalytics().
//  - Zero hard dependency: the app calls track() freely; wiring a real provider
//    and a consent banner is a later decision (see ROADMAP "wymaga decyzji").

export type AnalyticsProps = Record<string, string | number | boolean | undefined>
export type AnalyticsProvider = (event: string, props?: AnalyticsProps) => void

interface QueuedEvent {
  event: string
  props?: AnalyticsProps
}

const queue: QueuedEvent[] = []
let provider: AnalyticsProvider | null = null
let consentGranted = false

function flush(): void {
  if (!consentGranted || !provider) return
  while (queue.length) {
    const e = queue.shift()!
    try {
      provider(e.event, e.props)
    } catch {
      /* a failing provider must never break the app */
    }
  }
}

/** Attach a concrete sink (Plausible/GA/PostHog/…). Pass null to detach. */
export function configureAnalytics(p: AnalyticsProvider | null): void {
  provider = p
  flush()
}

/** Grant/revoke consent. Granting flushes queued events; revoking drops them. */
export function setConsent(granted: boolean): void {
  consentGranted = granted
  if (granted) flush()
  else queue.length = 0
}

export function hasConsent(): boolean {
  return consentGranted
}

/** Record an event. Held in a queue until consent + provider are both present. */
export function track(event: string, props?: AnalyticsProps): void {
  queue.push({ event, props })
  flush()
}

/** Number of events waiting to be sent (testing / debugging). */
export function pendingCount(): number {
  return queue.length
}

/** Reset all module state — test only. */
export function __resetAnalytics(): void {
  queue.length = 0
  provider = null
  consentGranted = false
}

/** A simple dev sink that logs to the console (used only in development). */
export const consoleProvider: AnalyticsProvider = (event, props) => {
  // eslint-disable-next-line no-console
  console.debug('[analytics]', event, props ?? {})
}
