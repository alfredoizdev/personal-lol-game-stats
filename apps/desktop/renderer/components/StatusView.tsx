import { useEffect, useState } from 'react'
import type { LeagueStatus } from '@lpp/shared'
import { RIOT_DISCLAIMER } from '@lpp/shared'
import { liveLabel, statusLabel } from '@shared/status-label'
import type { LiveState } from '../../electron/league/live-poller'

const DOT_CLASS: Record<LeagueStatus['state'], string> = {
  CLOSED: 'dot dot-grey',
  STARTING: 'dot dot-amber',
  CONNECTED: 'dot dot-green',
  ERROR: 'dot dot-red',
}

export function StatusView({ email }: { email: string }) {
  const [status, setStatus] = useState<LeagueStatus>({ state: 'CLOSED' })
  const [live, setLive] = useState<LiveState>({ kind: 'idle' })

  useEffect(() => {
    let cancelled = false
    void window.lpp.getStatus().then((s) => {
      if (!cancelled) setStatus(s)
    })
    const unsubscribe = window.lpp.onStatusChanged(setStatus)
    void window.lpp.getLive().then((l) => {
      if (!cancelled) setLive(l)
    })
    const unsubscribeLive = window.lpp.onLiveChanged(setLive)
    return () => {
      cancelled = true
      unsubscribe()
      unsubscribeLive()
    }
  }, [])

  return (
    <main className="screen">
      <img className="logo" src="./logo.png" alt="LanePulse" />
      <h1 className="title">LanePulse collector</h1>
      <div className="status-row">
        <span className={DOT_CLASS[status.state]} aria-hidden="true" />
        <span className="status-text">{statusLabel(status)}</span>
      </div>
      <div className="status-row">
        <span className={live.kind === 'live' ? 'dot dot-red' : live.kind === 'waiting' ? 'dot dot-amber' : 'dot dot-grey'} aria-hidden="true" />
        <span className="status-text">{liveLabel(live)}</span>
      </div>
      <button className="button" onClick={() => void window.lpp.forceRefresh().then(setStatus)}>
        Refresh
      </button>
      <p className="hint">Keep this app running while you play. Your stats show up on your phone.</p>
      <div className="account-row">
        <span className="hint">{email}</span>
        <button className="button" onClick={() => void window.lpp.auth.signOut()}>
          Sign out
        </button>
      </div>
      <p className="disclaimer">{RIOT_DISCLAIMER}</p>
    </main>
  )
}
