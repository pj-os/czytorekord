import { useState } from 'react'
import { subscribeAlert } from '../alerts'
import { track } from '../analytics'
import type { Place } from '../types'

interface Props {
  place: Place
}

type State = 'idle' | 'submitting' | 'done' | 'invalid' | 'error'

/** "Powiadom mnie o rekordzie" — captures an email for record alerts (mock backend for now). */
export default function AlertSignup({ place }: Props) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'submitting') return
    setState('submitting')
    try {
      const res = await subscribeAlert({
        email,
        place: place.name,
        lat: place.latitude,
        lon: place.longitude,
      })
      if (res === 'invalid-email') {
        setState('invalid')
        return
      }
      track('alert_subscribe', { place: place.name })
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <p className="alert-done" role="status">
        ✓ Zapisano! Damy znać, gdy zbliży się rekord — <b>{place.name}</b>.
      </p>
    )
  }

  return (
    <form className="alert-form" onSubmit={onSubmit}>
      <label htmlFor="alert-email" className="sr-only">
        Adres e-mail
      </label>
      <input
        id="alert-email"
        type="email"
        inputMode="email"
        placeholder="twój@email.pl"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (state === 'invalid' || state === 'error') setState('idle')
        }}
        aria-invalid={state === 'invalid'}
      />
      <button className="alert-submit" type="submit" disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Zapisuję…' : 'Powiadom mnie'}
      </button>
      <span className="alert-status" aria-live="polite">
        {state === 'invalid' && 'Sprawdź adres e-mail.'}
        {state === 'error' && 'Nie udało się — spróbuj ponownie.'}
      </span>
    </form>
  )
}
