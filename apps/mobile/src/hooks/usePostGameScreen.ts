import { useEffect, useRef } from 'react'
import { router, useSegments } from 'expo-router'
import { useLiveFeed } from '@/lib/live-feed-context'
import { postGameNavigation, type PostGameObservation } from '@/lib/post-game-nav'
import { markReviewed } from '@/lib/reviewed-game'

const ROUTE = 'post-game'

/** Opens the post-game screen when a game ends, closes it when the next queue or game starts; a dismissed one stays dismissed. */
export function usePostGameScreen(): void {
  const { state, phase, endedAt } = useLiveFeed()
  const segments = useSegments() as string[]
  const onScreen = segments.includes(ROUTE)
  const prev = useRef<PostGameObservation | null>(null)
  const wasOnScreen = useRef(false)
  const dismissedEndedAt = useRef<number | null>(null)

  // Leaving the screen by hand while the game is still the ended one = dismissed for that game.
  useEffect(() => {
    if (wasOnScreen.current && !onScreen && endedAt !== null) dismissedEndedAt.current = endedAt
    wasOnScreen.current = onScreen
  }, [onScreen, endedAt])

  useEffect(() => {
    const next: PostGameObservation = { view: state, phase: phase?.phase ?? null, endedAt }
    const action = postGameNavigation({ prev: prev.current, next, onScreen, dismissedEndedAt: dismissedEndedAt.current })
    prev.current = next
    if (action === 'open') {
      if (endedAt !== null) markReviewed(endedAt) // the Live tab stops offering this game's review
      router.push('/(app)/post-game')
    }
    if (action === 'close') router.back()
  }, [state, phase, endedAt, onScreen])
}
