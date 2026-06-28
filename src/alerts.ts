// Record-alert sign-up skeleton.
//
// Provider-agnostic: validates input and hands the subscription to a configured
// backend sink. Until a real backend is wired (user decision — provider/keys),
// it falls back to a local-storage mock so the whole flow is exercisable today.

export interface AlertSubscription {
  email: string
  place: string
  lat: number
  lon: number
  createdAt?: string
}

export type AlertSink = (sub: AlertSubscription) => Promise<void>

// Pragmatic email check — good enough for client-side UX; the backend revalidates.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  const v = value.trim()
  return v.length <= 254 && EMAIL_RE.test(v)
}

let sink: AlertSink | null = null

/** Attach the real backend (e.g. POST /api/alerts). Pass null to use the mock. */
export function configureAlertSink(fn: AlertSink | null): void {
  sink = fn
}

const LS_KEY = 'czytorekord.alerts'

function mockStore(sub: AlertSubscription): void {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_KEY) || '[]') as AlertSubscription[]
    existing.push(sub)
    localStorage.setItem(LS_KEY, JSON.stringify(existing))
  } catch {
    /* storage unavailable — mock is best-effort */
  }
}

export function listLocalAlerts(): AlertSubscription[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as AlertSubscription[]
  } catch {
    return []
  }
}

export type SubscribeResult = 'ok' | 'invalid-email'

/** Submit a subscription. Throws only on backend failure; bad email returns a code. */
export async function subscribeAlert(sub: AlertSubscription): Promise<SubscribeResult> {
  if (!isValidEmail(sub.email)) return 'invalid-email'
  const enriched: AlertSubscription = { ...sub, email: sub.email.trim() }
  if (sink) {
    await sink(enriched)
  } else {
    mockStore(enriched)
  }
  return 'ok'
}
