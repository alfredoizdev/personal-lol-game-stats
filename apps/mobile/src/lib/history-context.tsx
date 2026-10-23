import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useOwnHistory, type OwnHistory } from '@/hooks/useOwnHistory'
import { appLoadState, type AppLoadState } from '@/lib/app-load'
import type { LinkedAccount } from '@/lib/linked-account'

export type AppHistory = OwnHistory & {
  /** 'loading' until every game in the window is ready (the launch screen), then 'ready' for good for this account. */
  state: AppLoadState
  /** True once the launch load was started for this account (screens tell "still loading" from "stopped short"). */
  started: boolean
}

const HistoryContext = createContext<AppHistory | null>(null)

/**
 * The player's last 100 games, loaded ONCE at launch and shared by every tab
 * (owner, 2026-10-23). Mounted in the app layout; `useHistory()` reads it.
 */
export function HistoryProvider({ account, children }: { account: LinkedAccount | null; children: ReactNode }) {
  const history = useOwnHistory(account, false)
  const puuid = account?.puuid ?? null
  const startedFor = useRef<string | null>(null)
  const [readyFor, setReadyFor] = useState<string | null>(null)

  // Start the full window once per account, as soon as the id list is known.
  useEffect(() => {
    if (!puuid || history.total === 0 || startedFor.current === puuid) return
    startedFor.current = puuid
    if (history.loaded < history.total) history.start()
  }, [puuid, history])

  const state = appLoadState({
    idsPending: history.idsPending,
    total: history.total,
    loaded: history.loaded,
    running: history.running,
    wasReady: puuid !== null && readyFor === puuid,
  })
  useEffect(() => {
    if (puuid && state === 'ready' && readyFor !== puuid) setReadyFor(puuid)
  }, [puuid, state, readyFor])

  return <HistoryContext.Provider value={{ ...history, state, started: startedFor.current === puuid }}>{children}</HistoryContext.Provider>
}

export function useHistory(): AppHistory {
  const v = useContext(HistoryContext)
  if (!v) throw new Error('useHistory outside HistoryProvider')
  return v
}
