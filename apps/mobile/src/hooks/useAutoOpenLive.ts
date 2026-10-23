import { useEffect, useRef } from 'react'
import { router, useSegments } from 'expo-router'
import { useLiveFeed } from '@/lib/live-feed-context'
import { shouldOpenLive, type LiveObservation } from '@/lib/auto-open-live'

/** Switches to the Live tab when a match is found or a game starts (from any tab). */
export function useAutoOpenLive(): void {
  const { phase, state } = useLiveFeed()
  const segments = useSegments() as string[]
  const prev = useRef<LiveObservation | null>(null)
  useEffect(() => {
    const next: LiveObservation = { phase: phase?.phase ?? null, view: state }
    const open = shouldOpenLive(prev.current, next)
    prev.current = next
    if (open && !segments.includes('live')) router.navigate('/(app)/(tabs)/live')
  }, [phase, state, segments])
}
