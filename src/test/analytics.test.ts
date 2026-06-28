import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetAnalytics,
  configureAnalytics,
  hasConsent,
  pendingCount,
  setConsent,
  track,
} from '../analytics'

describe('analytics — consent gating (RODO)', () => {
  beforeEach(() => __resetAnalytics())

  it('queues events and sends nothing without consent + provider', () => {
    const sent: string[] = []
    configureAnalytics((e) => sent.push(e))
    track('view')
    track('share')
    expect(sent).toEqual([]) // no consent yet
    expect(pendingCount()).toBe(2)
    expect(hasConsent()).toBe(false)
  })

  it('flushes the queue once consent is granted', () => {
    const sent: string[] = []
    configureAnalytics((e) => sent.push(e))
    track('view')
    setConsent(true)
    expect(sent).toEqual(['view'])
    expect(pendingCount()).toBe(0)
    track('share')
    expect(sent).toEqual(['view', 'share']) // live after consent
  })

  it('drops queued events when consent is denied', () => {
    const sent: string[] = []
    configureAnalytics((e) => sent.push(e))
    track('view')
    setConsent(false)
    setConsent(true)
    expect(sent).toEqual([]) // the pre-denial event was dropped
  })

  it('holds events until a provider is attached', () => {
    setConsent(true)
    track('view') // consent but no provider → queued
    expect(pendingCount()).toBe(1)
    const sent: string[] = []
    configureAnalytics((e) => sent.push(e))
    expect(sent).toEqual(['view'])
  })

  it('a throwing provider never breaks track()', () => {
    setConsent(true)
    configureAnalytics(() => {
      throw new Error('boom')
    })
    expect(() => track('view')).not.toThrow()
  })
})
