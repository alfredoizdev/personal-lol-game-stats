import { useEffect, useState } from 'react'
import type { AuthState } from '../electron/preload'
import { LoginView } from './components/LoginView'
import { StatusView } from './components/StatusView'

export function App() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    void window.lpp.auth.getState().then((s) => {
      if (!cancelled) setAuth(s)
    })
    const unsubscribe = window.lpp.auth.onStateChanged(setAuth)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  if (auth.status === 'loading') {
    return (
      <main className="screen">
        <p className="hint">Loading…</p>
      </main>
    )
  }
  if (auth.status === 'signed-out') return <LoginView />
  return <StatusView email={auth.email} />
}
