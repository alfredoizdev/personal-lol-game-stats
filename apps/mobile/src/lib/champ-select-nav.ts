import type { GameflowPhase } from '@lpp/shared'

export type ChampSelectObservation = { phase: GameflowPhase | null; since: number }

/**
 * The champion select screen opens on the transition into ChampSelect (never on
 * the first observation), closes by itself when the phase leaves it while the
 * screen shows, and does not reopen the same champion select (keyed by `since`)
 * once the player dismissed it.
 */
export function champSelectNavigation({ prev, next, onScreen, dismissedSince }: { prev: ChampSelectObservation | null; next: ChampSelectObservation; onScreen: boolean; dismissedSince: number | null }): 'open' | 'close' | 'none' {
  const inCs = next.phase === 'ChampSelect'
  if (inCs && prev && prev.phase !== 'ChampSelect' && dismissedSince !== next.since) return 'open'
  if (!inCs && onScreen) return 'close'
  return 'none'
}
