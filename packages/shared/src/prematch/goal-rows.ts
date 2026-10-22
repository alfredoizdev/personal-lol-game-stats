import { GOAL_METRICS, type Goal, type GoalMetric } from './goal'
import type { Role } from '../match-v5'

const ROLES: readonly string[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
const METRICS: readonly string[] = GOAL_METRICS.map((m) => m.key)

/** A `pre_match_focus` row as Supabase returns it (phone and desktop read the same table). */
export type GoalRow = { puuid: string; champion_id: number; role: string; metric: string; target: number | string; set_at: string }

export function rowToGoal(row: GoalRow): Goal | null {
  if (!ROLES.includes(row.role) || !METRICS.includes(row.metric)) return null
  const target = Number(row.target)
  if (!Number.isFinite(target)) return null
  return { puuid: row.puuid, championId: Number(row.champion_id), role: row.role as Role, metric: row.metric as GoalMetric, target, setAt: row.set_at }
}
