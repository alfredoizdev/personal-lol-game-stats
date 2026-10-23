import { GOAL_METRICS, type GoalMetric, type StoredGoal } from './goal'
import type { Role } from '../match-v5'

const ROLES: readonly string[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
const METRICS: readonly string[] = GOAL_METRICS.map((m) => m.key)

/** A `pre_match_focus` row as Supabase returns it (phone and desktop read the same table). */
export type GoalRow = { puuid: string; champion_id: number; role: string; metric: string; target: number | string | null; set_at: string }

export function rowToGoal(row: GoalRow): StoredGoal | null {
  const standing = row.role === 'ANY'
  if ((!standing && !ROLES.includes(row.role)) || !METRICS.includes(row.metric)) return null
  let target: number | null = null
  if (row.target !== null && row.target !== undefined) {
    target = Number(row.target)
    if (!Number.isFinite(target)) return null
  } else if (!standing) return null
  return { puuid: row.puuid, championId: Number(row.champion_id), role: row.role as Role | 'ANY', metric: row.metric as GoalMetric, target, setAt: row.set_at }
}
