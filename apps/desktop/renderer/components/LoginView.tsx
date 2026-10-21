import { useState, type FormEvent } from 'react'
import { RIOT_DISCLAIMER } from '@lpp/shared'

export function LoginView() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = await window.lpp.auth.signIn(email.trim(), password)
    setBusy(false)
    if (result.error) setError(result.error)
  }

  return (
    <main className="screen">
      <img className="logo" src="./logo.png" alt="LanePulse" />
      <h1 className="title">Sign in</h1>
      <p className="hint">Use the same account as on your phone.</p>
      <form className="form" onSubmit={onSubmit}>
        <input
          className="input"
          type="email"
          placeholder="Email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="error">{error}</p> : null}
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="disclaimer">{RIOT_DISCLAIMER}</p>
    </main>
  )
}
