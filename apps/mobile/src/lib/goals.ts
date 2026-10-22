import type { SupabaseClient } from '@supabase/supabase-js'
import { GOAL_METRICS, type Goal, type GoalMetric, type Role } from '@lpp/shared'

const ROLES: readonly string[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
const METRICS: readonly string[] = GOAL_METRICS.map((m) => m.key)
const MAX_ROWS = 200

export type GoalRow = { puuid: string; champion_id: number; role: string; metric: string; target: number | string; set_at: string }

export function rowToGoal(row: GoalRow): Goal | null {
  if (!ROLES.includes(row.role) || !METRICS.includes(row.metric)) return null
  const target = Number(row.target)
  if (!Number.isFinite(target)) return null
  return { puuid: row.puuid, championId: Number(row.champion_id), role: row.role as Role, metric: row.metric as GoalMetric, target, setAt: row.set_at }
}

/** Newest first, for one Riot account. RLS limits rows to the signed-in user. */
export async function fetchGoals(client: SupabaseClient, userId: string, puuid: string): Promise<Goal[]> {
  const { data, error } = await client
    .from('pre_match_focus')
    .select('puuid, champion_id, role, metric, target, set_at')
    .eq('user_id', userId)
    .eq('puuid', puuid)
    .order('set_at', { ascending: false })
    .limit(MAX_ROWS)
  if (error) throw new Error(error.message)
  return ((data ?? []) as GoalRow[]).map(rowToGoal).filter((g): g is Goal => g !== null)
}

/** Append-only: every save is a new row (the newest one is the goal in force). */
export async function saveGoal(client: SupabaseClient, userId: string, goal: Omit<Goal, 'setAt'>): Promise<void> {
  const { error } = await client.from('pre_match_focus').insert({
    user_id: userId,
    puuid: goal.puuid,
    champion_id: goal.championId,
    role: goal.role,
    metric: goal.metric,
    target: goal.target,
  })
  if (error) throw new Error(error.message)
}
