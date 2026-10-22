import type { LiveSnapshotV2 } from '@lpp/shared'

export type TrendPoint = { minute: number; me: number | null; enemy: number | null }

const MAX_POINTS = 60

/**
 * One point per whole game minute of CS/min for you and the lane opponent,
 * built on the phone from the snapshots it receives. A snapshot in a minute
 * already recorded replaces that point; game time going backwards means a
 * new game, so the history restarts.
 */
export function appendTrendPoint(history: TrendPoint[], snapshot: LiveSnapshotV2): TrendPoint[] {
  const t = snapshot.gameTimeSeconds
  if (t === null || t < 60) return history
  const minute = Math.floor(t / 60)
  const point: TrendPoint = { minute, me: snapshot.me.csPerMin, enemy: snapshot.opponent?.csPerMin ?? null }
  const last = history[history.length - 1]
  let next: TrendPoint[]
  if (last && minute < last.minute) next = [point]
  else if (last && minute === last.minute) next = [...history.slice(0, -1), point]
  else next = [...history, point]
  return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
}
