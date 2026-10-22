import type { SupabaseClient } from '@supabase/supabase-js'
import type { GoalPushMode } from '@lpp/shared'

export type NotificationPrefs = { goalPush: boolean; mode: GoalPushMode }

/** Off until the player turns it on (spec 2.4): the desktop sends nothing otherwise. */
export const DEFAULT_PREFS: NotificationPrefs = { goalPush: false, mode: 'change' }

export type PrefsRow = { goal_push?: unknown; goal_push_mode?: unknown }

export function prefsFromRow(row: PrefsRow | null | undefined): NotificationPrefs {
  if (!row) return DEFAULT_PREFS
  return {
    goalPush: row.goal_push === true,
    mode: row.goal_push_mode === 'interval' ? 'interval' : 'change',
  }
}

export function prefsToRow(userId: string, p: NotificationPrefs): { user_id: string; goal_push: boolean; goal_push_mode: GoalPushMode } {
  return { user_id: userId, goal_push: p.goalPush, goal_push_mode: p.mode }
}

export async function fetchPrefs(client: SupabaseClient, userId: string): Promise<NotificationPrefs> {
  const { data, error } = await client.from('notification_prefs').select('goal_push, goal_push_mode').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return prefsFromRow(data as PrefsRow | null)
}

export async function savePrefs(client: SupabaseClient, userId: string, p: NotificationPrefs): Promise<void> {
  const { error } = await client.from('notification_prefs').upsert({ ...prefsToRow(userId, p), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}
