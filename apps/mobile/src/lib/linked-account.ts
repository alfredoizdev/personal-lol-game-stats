import type { SupabaseClient } from '@supabase/supabase-js'
import { platformToRegion, type Region } from '@lpp/shared'
import { resolveActiveAccount } from './account'

export type LinkedAccount = {
  puuid: string
  gameName: string
  tagLine: string
  region: Region
  profileIconId: number | null
}

type LinkedRow = {
  puuid: string
  riot_id_game_name: string
  riot_id_tag_line: string
  platform: string | null
  profile_icon_id: number | null
  last_seen_at: string
}

function mapRow(row: LinkedRow): LinkedAccount {
  return {
    puuid: row.puuid,
    gameName: row.riot_id_game_name,
    tagLine: row.riot_id_tag_line,
    region: platformToRegion(row.platform),
    profileIconId: row.profile_icon_id ?? null,
  }
}

/** Every Riot account linked to the user, most recently used first. */
export async function fetchLinkedAccounts(client: SupabaseClient, userId: string): Promise<LinkedAccount[]> {
  const { data, error } = await client
    .from('linked_riot_accounts')
    .select('puuid, riot_id_game_name, riot_id_tag_line, platform, profile_icon_id, last_seen_at')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data as LinkedRow[] | null) ?? []).map(mapRow)
}

/** `profiles.current_puuid` for the user (RiftLens's "active account" pointer), or null. */
export async function fetchCurrentPuuid(client: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await client.from('profiles').select('current_puuid').eq('user_id', userId).maybeSingle()
  if (error) return null
  return (data as { current_puuid?: string | null } | null)?.current_puuid ?? null
}

/** The active linked account: `profiles.current_puuid` if it matches, else the most recently used. */
export async function fetchLinkedAccount(client: SupabaseClient, userId: string): Promise<LinkedAccount | null> {
  const [accounts, currentPuuid] = await Promise.all([
    fetchLinkedAccounts(client, userId),
    fetchCurrentPuuid(client, userId),
  ])
  return resolveActiveAccount(accounts, currentPuuid)
}

export type LinkErrorCode = 'NOT_FOUND' | 'RATE_LIMITED' | 'IDENTITY_MISSING' | 'UNKNOWN'

export type LinkResult = { ok: true; puuid: string } | { ok: false; code: LinkErrorCode }

/** Calls the existing `link-riot-account` Edge Function (Riot key stays server-side). */
export async function linkRiotAccount(
  client: SupabaseClient,
  input: { gameName: string; tagLine: string; region: Region },
): Promise<LinkResult> {
  const { data, error } = await client.functions.invoke('link-riot-account', { body: input })
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status
    if (status === 404) return { ok: false, code: 'NOT_FOUND' }
    if (status === 429) return { ok: false, code: 'RATE_LIMITED' }
    if (status === 400) return { ok: false, code: 'IDENTITY_MISSING' }
    return { ok: false, code: 'UNKNOWN' }
  }
  const puuid = (data as { puuid?: unknown } | null)?.puuid
  if (typeof puuid !== 'string' || !puuid) return { ok: false, code: 'UNKNOWN' }
  return { ok: true, puuid }
}
