import { useEffect, useRef } from 'react'
import { router, useSegments } from 'expo-router'
import { useLiveFeed } from '@/lib/live-feed-context'
import { champSelectNavigation, type ChampSelectObservation } from '@/lib/champ-select-nav'

const ROUTE = 'champ-select'

/** Opens the champion select screen when the client enters champion select, closes it when it leaves; a dismissed one stays dismissed. */
export function useChampSelectScreen(): void {
  const { phase } = useLiveFeed()
  const segments = useSegments() as string[]
  const onScreen = segments.includes(ROUTE)
  const prev = useRef<ChampSelectObservation | null>(null)
  const wasOnScreen = useRef(false)
  const dismissedSince = useRef<number | null>(null)

  // Leaving the screen by hand while champion select continues = dismissed for this champion select.
  useEffect(() => {
    if (wasOnScreen.current && !onScreen && phase?.phase === 'ChampSelect') dismissedSince.current = phase.since
    wasOnScreen.current = onScreen
  }, [onScreen, phase])

  useEffect(() => {
    const next: ChampSelectObservation = { phase: phase?.phase ?? null, since: phase?.since ?? 0 }
    const action = champSelectNavigation({ prev: prev.current, next, onScreen, dismissedSince: dismissedSince.current })
    prev.current = next
    if (action === 'open') router.push('/(app)/champ-select')
    if (action === 'close') router.back()
  }, [phase, onScreen])
}
