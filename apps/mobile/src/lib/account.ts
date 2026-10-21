import type { SupabaseClient } from '@supabase/supabase-js'
import type { LinkedAccount } from './linked-account'

/** Pure: which linked account is active. `currentPuuid` comes from `profiles.current_puuid`. */
export function resolveActiveAccount(accounts: LinkedAccount[], currentPuuid: string | null): LinkedAccount | null {
  if (accounts.length === 0) return null
  const chosen = currentPuuid ? accounts.find((a) => a.puuid === currentPuuid) : undefined
  return chosen ?? accounts[0] ?? null
}

/**
 * Make `puuid` the active account: bump its `last_seen_at` (so the ordering
 * agrees) and point `profiles.current_puuid` at it (what RiftLens desktop reads).
 */
export async function setActiveAccount(client: SupabaseClient, userId: string, puuid: string): Promise<void> {
  const now = new Date().toISOString()
  const linked = await client
    .from('linked_riot_accounts')
    .update({ last_seen_at: now })
    .eq('user_id', userId)
    .eq('puuid', puuid)
  if (linked.error) throw new Error(linked.error.message)
  const profile = await client.from('profiles').update({ current_puuid: puuid }).eq('user_id', userId)
  if (profile.error) throw new Error(profile.error.message)
}

export type DeleteResult = { ok: true } | { ok: false; message: string }

/** Hard-deletes the user and all data via the existing `delete-account` Edge Function. */
export async function deleteAccount(client: SupabaseClient): Promise<DeleteResult> {
  const { data, error } = await client.functions.invoke('delete-account', { method: 'POST' })
  if (error) return { ok: false, message: error.message ?? 'delete_failed' }
  const body = data as { ok?: unknown; error?: unknown } | null
  if (body?.ok === true) return { ok: true }
  return { ok: false, message: typeof body?.error === 'string' ? body.error : 'delete_failed' }
}
