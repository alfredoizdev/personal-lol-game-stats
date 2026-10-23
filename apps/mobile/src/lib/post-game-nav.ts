import type { GameflowPhase, LiveViewState } from '@lpp/shared'

export type PostGameObservation = { view: LiveViewState; phase: GameflowPhase | null; endedAt: number | null }

const NEXT_QUEUE: readonly GameflowPhase[] = ['Matchmaking', 'ReadyCheck', 'ChampSelect']

/**
 * The post-game screen opens when a game just ended (a new `endedAt`), never on
 * the first observation; closes by itself when the next queue starts or a new
 * game goes live while it shows; a dismissed game is not reopened.
 */
export function postGameNavigation({ prev, next, onScreen, dismissedEndedAt }: { prev: PostGameObservation | null; next: PostGameObservation; onScreen: boolean; dismissedEndedAt: number | null }): 'open' | 'close' | 'none' {
  if (onScreen) {
    if (next.view === 'live' || (next.phase !== null && NEXT_QUEUE.includes(next.phase))) return 'close'
    return 'none'
  }
  if (!prev || next.endedAt === null || next.view !== 'ended') return 'none'
  const fresh = prev.endedAt !== next.endedAt || prev.view !== 'ended'
  return fresh && dismissedEndedAt !== next.endedAt ? 'open' : 'none'
}
