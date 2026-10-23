/** The tabs open once this many of your newest games are ready (what Matches and Performance show first). The rest keeps loading behind them. */
export const FIRST_READY = 20

export type AppLoadState = 'loading' | 'ready'

/**
 * One loading screen at launch (owner, 2026-10-23): the games load ONCE for
 * every tab instead of each screen loading on entry. Never blocks on nothing:
 * no games or a run that stopped short shows the tabs, which explain and offer
 * Retry. Sticky per account so a later refetch never flashes the screen again.
 */
export function appLoadState(s: { idsPending: boolean; total: number; loadedInFirst: number; running: boolean; wasReady: boolean }): AppLoadState {
  if (s.wasReady) return 'ready'
  if (s.idsPending) return 'loading'
  if (s.total === 0) return 'ready'
  if (s.loadedInFirst >= Math.min(FIRST_READY, s.total)) return 'ready'
  return s.running ? 'loading' : 'ready'
}
