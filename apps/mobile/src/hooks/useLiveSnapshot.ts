import { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { liveViewState, parseLiveSnapshot, type LiveSnapshotV2, type LiveViewState } from '@lpp/shared'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const TICK_MS = 1000

/**
 * Subscribes to the user's Realtime channel and keeps the newest valid
 * `live-snapshot`. View state is re-evaluated every second so staleness
 * shows up without new messages.
 */
export function useLiveSnapshot(): { snapshot: LiveSnapshotV2 | null; state: LiveViewState; connected: boolean } {
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<LiveSnapshotV2 | null>(null)
  const [connected, setConnected] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const latestTs = useRef(0)
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
    if (!user) {
      setSnapshot(null)
      setConnected(false)
      return
    }
    const channel = supabase
      .channel(`user:${user.id}`)
      .on('broadcast', { event: 'live-snapshot' }, (msg: { payload?: unknown }) => {
        const parsed = parseLiveSnapshot(msg.payload)
        if (!parsed || parsed.ts < latestTs.current) return
        latestTs.current = parsed.ts
        setSnapshot(parsed)
      })
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    return () => {
      void supabase.removeChannel(channel)
      setConnected(false)
    }
  }, [user, generation])

  return { snapshot, state: liveViewState(snapshot, now), connected }
}
