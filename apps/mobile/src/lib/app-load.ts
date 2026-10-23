export type AppLoadState = 'loading' | 'ready'

/**
 * One loading screen at launch (owner, 2026-10-23): EVERY game in the window
 * loads before any tab shows, so no number moves on screen afterwards. Never
 * blocks on nothing: no games or a run that stopped short shows the tabs,
 * which explain and offer Retry. Sticky per account so a later refetch never
 * flashes the screen again.
 */
export function appLoadState(s: { idsPending: boolean; total: number; loaded: number; running: boolean; started: boolean; wasReady: boolean }): AppLoadState {
  if (s.wasReady) return 'ready'
  if (s.idsPending) return 'loading'
  if (s.total === 0) return 'ready'
  if (s.loaded >= s.total) return 'ready'
  // Between the id list arriving and the run starting nothing is running yet: that is still loading, not "stopped short".
  if (!s.started) return 'loading'
  return s.running ? 'loading' : 'ready'
}
