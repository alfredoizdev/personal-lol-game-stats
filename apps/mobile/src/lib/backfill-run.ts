/**
 * Backfill run state shared by every `useOwnHistory` instance (the Live tab's
 * Prepare block and the Performance tab mount one each). One snapshot per
 * Riot account; `claimRun` makes sure only one instance drives the loop.
 */
/** `limit`: only the first n ids are fetched in this run (the Performance tab's 40); null = every id. */
export type RunState = { running: boolean; error: unknown | null; limit: number | null }

const IDLE: RunState = { running: false, error: null, limit: null }
const runs = new Map<string, RunState>()
const owners = new Set<string>()
const listeners = new Set<() => void>()

export function getRun(puuid: string | undefined): RunState {
  return (puuid && runs.get(puuid)) || IDLE
}

export function setRun(puuid: string, patch: Partial<RunState>): void {
  runs.set(puuid, { ...getRun(puuid), ...patch })
  for (const fn of listeners) fn()
}

export function subscribeRuns(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** True when this caller now owns the run for that account; false if another instance already does. */
export function claimRun(puuid: string): boolean {
  if (owners.has(puuid)) return false
  owners.add(puuid)
  return true
}

export function isRunOwned(puuid: string): boolean {
  return owners.has(puuid)
}

export function releaseRun(puuid: string): void {
  owners.delete(puuid)
}
