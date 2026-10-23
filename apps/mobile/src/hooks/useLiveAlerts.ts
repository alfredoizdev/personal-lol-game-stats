import { useEffect, useRef, useState } from 'react'
import { alertsForSnapshot, type GoalStatus, type LiveAlert, type LivePhasePayload, type LiveSnapshotV2 } from '@lpp/shared'
import { dismissAlert, expireAlerts, pushAlerts, type QueuedAlert } from '@/lib/live-alerts-queue'

export type AlertGoal = { text: string; status: GoalStatus; now: string | null } | null

/**
 * The in-app alert cards: goal flips and new game events (seen set per game,
 * seeded with whatever is already there when the first snapshot of a game
 * arrives, so opening Live mid-game never floods), plus "Match found".
 */
export function useLiveAlerts(snapshot: LiveSnapshotV2 | null, goal: AlertGoal, phase: LivePhasePayload | null, now: number): { alerts: QueuedAlert[]; dismiss: (id: string) => void } {
  const [queue, setQueue] = useState<QueuedAlert[]>([])
  const seen = useRef<Set<number> | null>(null)
  const goalPrev = useRef<GoalStatus | null>(null)
  const lastGameTime = useRef<number | null>(null)
  const lastPhase = useRef<string | null>(null)

  useEffect(() => {
    if (!snapshot) return
    const t = snapshot.gameTimeSeconds ?? 0
    const newGame = seen.current === null || (lastGameTime.current !== null && t < lastGameTime.current - 60)
    lastGameTime.current = t
    if (newGame) {
      seen.current = new Set(snapshot.events.map((e) => e.id)) // already on the board: not news
      goalPrev.current = goal?.status ?? null
      return
    }
    const fresh: LiveAlert[] = alertsForSnapshot({
      seen: seen.current!,
      snapshot,
      goalPrev: goalPrev.current,
      goalNext: goal?.status ?? null,
      goalText: goal?.text ?? null,
      goalNow: goal?.now ?? null,
    })
    for (const e of snapshot.events) seen.current!.add(e.id)
    if (goal && goal.status !== 'unknown') goalPrev.current = goal.status
    if (snapshot.isFinal) {
      seen.current = null // next game starts clean
      goalPrev.current = null
    }
    if (fresh.length) setQueue((q) => pushAlerts(q, fresh, Date.now()))
  }, [snapshot, goal])

  useEffect(() => {
    const p = phase?.phase ?? null
    if (p === 'ReadyCheck' && lastPhase.current !== 'ReadyCheck') {
      setQueue((q) => pushAlerts(q, [{ id: `phase:ReadyCheck:${phase!.ts}`, kind: 'match_found', title: 'Match found', body: null, tone: 'neutral' }], Date.now()))
    }
    lastPhase.current = p
  }, [phase])

  useEffect(() => {
    setQueue((q) => {
      const next = expireAlerts(q, now)
      return next.length === q.length ? q : next
    })
  }, [now])

  return { alerts: queue, dismiss: (id) => setQueue((q) => dismissAlert(q, id)) }
}
