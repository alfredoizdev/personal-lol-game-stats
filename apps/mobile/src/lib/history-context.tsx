import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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
  const [startedFor, setStartedFor] = useState<string | null>(null)
  const [readyFor, setReadyFor] = useState<string | null>(null)
  const started = puuid !== null && startedFor === puuid

  // Start the full window once per account, as soon as the id list is known.
  useEffect(() => {
    if (!puuid || history.total === 0 || started) return
    setStartedFor(puuid)
    if (history.loaded < history.total) history.start()
  }, [puuid, started, history])

  // A restored id list refreshes on launch: until that first refresh lands, the list is still "pending" for the launch screen,
  // so games played since the last launch load behind the screen, not behind the tabs.
  const [refreshedFor, setRefreshedFor] = useState<string | null>(null)
  useEffect(() => {
    if (puuid && !history.idsPending && !history.idsFetching && refreshedFor !== puuid) setRefreshedFor(puuid)
  }, [puuid, history.idsPending, history.idsFetching, refreshedFor])
  const state = appLoadState({
    idsPending: history.idsPending || (puuid !== null && refreshedFor !== puuid),
    total: history.total,
    loaded: history.loaded,
    running: history.running,
    started,
    wasReady: puuid !== null && readyFor === puuid,
  })
  useEffect(() => {
    if (puuid && state === 'ready' && readyFor !== puuid) setReadyFor(puuid)
  }, [puuid, state, readyFor])

  return <HistoryContext.Provider value={{ ...history, state, started }}>{children}</HistoryContext.Provider>
}

export function useHistory(): AppHistory {
  const v = useContext(HistoryContext)
  if (!v) throw new Error('useHistory outside HistoryProvider')
  return v
}
