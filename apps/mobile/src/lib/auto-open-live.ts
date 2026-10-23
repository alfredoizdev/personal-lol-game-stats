import type { GameflowPhase, LiveViewState } from '@lpp/shared'

export type LiveObservation = { phase: GameflowPhase | null; view: LiveViewState }

/**
 * Jump to the Live tab on the moments that matter: a match was found (ready
 * check) and the game went live. Only on the transition, never on the first
 * observation (launching the app mid-game leaves the user where they are).
 */
export function shouldOpenLive(prev: LiveObservation | null, next: LiveObservation): boolean {
  if (!prev) return false
  if (next.phase === 'ReadyCheck' && prev.phase !== 'ReadyCheck') return true
  if (next.view === 'live' && prev.view !== 'live' && prev.view !== 'stale') return true
  return false
}
