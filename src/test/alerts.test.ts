import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  configureAlertSink,
  isValidEmail,
  subscribeAlert,
  type AlertSubscription,
} from '../alerts'

afterEach(() => configureAlertSink(null))

describe('isValidEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(isValidEmail('a@b.pl')).toBe(true)
    expect(isValidEmail('  jan.kowalski@example.com  ')).toBe(true)
  })
  it('rejects malformed addresses', () => {
    for (const bad of ['', 'no-at', 'a@b', 'a b@c.pl', '@b.pl', 'a@.pl']) {
      expect(isValidEmail(bad)).toBe(false)
    }
  })
})

const sub: AlertSubscription = {
  email: 'jan@example.com',
  place: 'Warszawa',
  lat: 52.23,
  lon: 21.01,
}

describe('subscribeAlert', () => {
  it('returns invalid-email without calling the sink', async () => {
    const sink = vi.fn().mockResolvedValue(undefined)
    configureAlertSink(sink)
    const res = await subscribeAlert({ ...sub, email: 'nope' })
    expect(res).toBe('invalid-email')
    expect(sink).not.toHaveBeenCalled()
  })

  it('hands a trimmed subscription to the configured sink', async () => {
    const sink = vi.fn().mockResolvedValue(undefined)
    configureAlertSink(sink)
    const res = await subscribeAlert({ ...sub, email: '  jan@example.com ' })
    expect(res).toBe('ok')
    expect(sink).toHaveBeenCalledOnce()
    expect(sink.mock.calls[0][0].email).toBe('jan@example.com')
    expect(sink.mock.calls[0][0].place).toBe('Warszawa')
  })

  it('propagates backend failure', async () => {
    configureAlertSink(() => Promise.reject(new Error('500')))
    await expect(subscribeAlert(sub)).rejects.toThrow('500')
  })
})
