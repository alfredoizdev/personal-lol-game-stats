import type { SupabaseClient } from '@supabase/supabase-js'
import { platformToRegion, type Region } from '@lpp/shared'

export type LinkedAccount = {
  puuid: string
  gameName: string
  tagLine: string
  region: Region
}

type LinkedRow = {
  puuid: string
  riot_id_game_name: string
  riot_id_tag_line: string
  platform: string | null
  last_seen_at: string
}

/** Most recently used linked Riot account for the user, or null when none. */
export async function fetchLinkedAccount(client: SupabaseClient, userId: string): Promise<LinkedAccount | null> {
  const { data, error } = await client
    .from('linked_riot_accounts')
    .select('puuid, riot_id_game_name, riot_id_tag_line, platform, last_seen_at')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  const row = (data as LinkedRow[] | null)?.[0]
  if (!row) return null
  return {
    puuid: row.puuid,
    gameName: row.riot_id_game_name,
    tagLine: row.riot_id_tag_line,
    region: platformToRegion(row.platform),
  }
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
