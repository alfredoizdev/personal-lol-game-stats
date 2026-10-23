import { formatGoal, type GoalMetric } from '@lpp/shared'
import { BACKFILL_COUNT } from './backfill'

/**
 * Prepare loads its whole window (the last 100 games) by itself, like the
 * Performance tab: one progress line while it runs, nothing when done, a
 * retry only when a run stopped short. Never a "load" button.
 */
export function backfillLine(s: { idsPending: boolean; total: number; loaded: number; running: boolean; error: unknown | null }): { text: string; retry: boolean } | null {
  if (s.idsPending) return { text: 'Finding your recent games…', retry: false }
  if (s.total === 0) return { text: s.error ? "Couldn't list your games" : 'No recent games found', retry: !!s.error }
  if (s.loaded >= s.total) return null
  if (s.running || !s.error) return { text: `Loading your last ${Math.min(BACKFILL_COUNT, s.total)} games… ${s.loaded} of ${s.total}`, retry: false }
  return { text: `${s.loaded} of ${s.total} games loaded`, retry: true }
}

export type GoalSaveState = { kind: 'saved' | 'dirty'; line: string } | null

/** After "Save goal": a confirmation that stays visible, and a reminder once the editor moves away from what was saved. */
export function goalSaveState(saved: { metric: GoalMetric; target: number } | null, editor: { metric: GoalMetric; target: number | null }): GoalSaveState {
  if (!saved) return null
  const same = editor.metric === saved.metric && editor.target === saved.target
  return same
    ? { kind: 'saved', line: `Goal saved · ${formatGoal(saved)} · shows on Live and in your match review` }
    : { kind: 'dirty', line: `Saved goal: ${formatGoal(saved)} · save again to replace it` }
}
