import type { SupabaseClient } from '@supabase/supabase-js'
import { rowToGoal, type GoalRow, type StoredGoal } from '@lpp/shared'

const MAX_ROWS = 200

export { rowToGoal, type GoalRow }

/** Newest first, for one Riot account. RLS limits rows to the signed-in user. */
export async function fetchGoals(client: SupabaseClient, userId: string, puuid: string): Promise<StoredGoal[]> {
  const { data, error } = await client
    .from('pre_match_focus')
    .select('puuid, champion_id, role, metric, target, set_at')
    .eq('user_id', userId)
    .eq('puuid', puuid)
    .order('set_at', { ascending: false })
    .limit(MAX_ROWS)
  if (error) throw new Error(error.message)
  return ((data ?? []) as GoalRow[]).map(rowToGoal).filter((g): g is StoredGoal => g !== null)
}

/** Append-only: every save is a new row (the newest one is the goal in force). */
export async function saveGoal(client: SupabaseClient, userId: string, goal: Omit<StoredGoal, 'setAt'>): Promise<void> {
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
