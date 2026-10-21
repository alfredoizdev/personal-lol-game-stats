import { useEffect, useState } from 'react'
import type { LeagueStatus } from '@lpp/shared'
import { RIOT_DISCLAIMER } from '@lpp/shared'
import { statusLabel } from '@shared/status-label'

const DOT_CLASS: Record<LeagueStatus['state'], string> = {
  CLOSED: 'dot dot-grey',
  STARTING: 'dot dot-amber',
  CONNECTED: 'dot dot-green',
  ERROR: 'dot dot-red',
}

export function StatusView() {
  const [status, setStatus] = useState<LeagueStatus>({ state: 'CLOSED' })

  useEffect(() => {
    let cancelled = false
    void window.lpp.getStatus().then((s) => {
      if (!cancelled) setStatus(s)
    })
    const unsubscribe = window.lpp.onStatusChanged(setStatus)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return (
    <main className="screen">
      <h1 className="title">Collector</h1>
      <div className="status-row">
        <span className={DOT_CLASS[status.state]} aria-hidden="true" />
        <span className="status-text">{statusLabel(status)}</span>
      </div>
      <button className="button" onClick={() => void window.lpp.forceRefresh().then(setStatus)}>
        Refresh
      </button>
      <p className="hint">Keep this app running while you play. Your stats show up on your phone.</p>
      <p className="disclaimer">{RIOT_DISCLAIMER}</p>
    </main>
  )
}
