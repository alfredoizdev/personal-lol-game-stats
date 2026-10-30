import { useSyncExternalStore } from 'react'

// The end time of the last game whose post-game review was opened, app-wide: once the
// review has been seen, the Live tab goes straight to Prepare instead of offering it again.
let reviewed: number | null = null
const listeners = new Set<() => void>()

export function markReviewed(endedAt: number): void {
  reviewed = endedAt
  listeners.forEach((l) => l())
}

export function isReviewed(endedAt: number | null): boolean {
  return endedAt !== null && reviewed === endedAt
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Whether the review of the game that ended at `endedAt` has already been opened. */
export function useIsReviewed(endedAt: number | null): boolean {
  const value = useSyncExternalStore(subscribe, () => reviewed, () => reviewed)
  return endedAt !== null && value === endedAt
}
