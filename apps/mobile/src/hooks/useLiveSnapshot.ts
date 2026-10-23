import { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { liveTopic, liveViewState, parseLivePhase, parseLiveSnapshot, type LivePhasePayload, type LiveSnapshotV2, type LiveViewState } from '@lpp/shared'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const TICK_MS = 1000

export type LiveFeed = {
  snapshot: LiveSnapshotV2 | null
  state: LiveViewState
  connected: boolean
  /** Client phase relayed by the desktop (lobby, queue, ready check…) and when the phone received it. */
  phase: LivePhasePayload | null
  phaseReceivedAt: number
  /** When the phone received the current snapshot (its own clock). */
  receivedAt: number
  /** When the final snapshot of the current game arrived; null while no game has ended. */
  endedAt: number | null
  /** Shared one-second clock for countdowns and expiries. */
  now: number
}

/**
 * Subscribes to the user's private Realtime channel (`lanepulse:<id>`) and keeps
 * the newest valid `live-snapshot` plus the latest `live-phase`. View state is
 * re-evaluated every second so staleness shows up without new messages.
 */
export function useLiveSnapshot(): LiveFeed {
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<LiveSnapshotV2 | null>(null)
  const [phase, setPhase] = useState<{ payload: LivePhasePayload; receivedAt: number } | null>(null)
  const [endedAt, setEndedAt] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const latestTs = useRef(0)
  const latestPhaseTs = useRef(0)
  const receivedAt = useRef(0)
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [])

  // Resubscribe when the app returns to the foreground (iOS drops sockets in background).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setGeneration((g) => g + 1)
    })
    return () => sub.remove()
  }, [])

  useEffect(() => {
    latestTs.current = 0 // a different account (or a desktop clock that moved) must not be suppressed
    latestPhaseTs.current = 0
    if (!user) {
      setSnapshot(null)
      setPhase(null)
      setConnected(false)
      return
    }
    const channel = supabase
      .channel(liveTopic(user.id), { config: { private: true } })
      .on('broadcast', { event: 'live-snapshot' }, (msg: { payload?: unknown }) => {
        const parsed = parseLiveSnapshot(msg.payload)
        if (!parsed || parsed.ts < latestTs.current) return
        latestTs.current = parsed.ts
        receivedAt.current = Date.now()
        setSnapshot(parsed)
        if (parsed.isFinal) setEndedAt((e) => e ?? Date.now())
        else setEndedAt(null)
      })
      .on('broadcast', { event: 'live-phase' }, (msg: { payload?: unknown }) => {
        const parsed = parseLivePhase(msg.payload)
        if (!parsed || parsed.ts < latestPhaseTs.current) return
        latestPhaseTs.current = parsed.ts
        setPhase({ payload: parsed, receivedAt: Date.now() })
      })
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    return () => {
      void supabase.removeChannel(channel)
      setConnected(false)
    }
  }, [user, generation])

  return {
    snapshot,
    state: liveViewState(snapshot, now, 15_000, receivedAt.current),
    connected,
    phase: phase?.payload ?? null,
    phaseReceivedAt: phase?.receivedAt ?? 0,
    receivedAt: receivedAt.current,
    endedAt,
    now,
  }
}
