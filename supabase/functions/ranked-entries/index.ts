// ranked-entries Edge Function. Proxy for Riot LEAGUE-V4 `entries/by-puuid`:
// the signed-in player's own ranked standing (tier, division, LP, season W/L)
// for Solo/Duo and Flex. No server cache: the phone keeps it for an hour.
//
// Request:  POST { gameName, tagLine, region: 'NA' }   (or an encrypted puuid)
// Response: { entries: LeagueEntry[], summoner: { summonerLevel, profileIconId } | null }
//           (Riot's league array passed through; summoner-v4 for the level, null if it fails)
//
// Identity: LanePulse stores the LCU's 36-char UUID as the account's puuid,
// which the Web API cannot decrypt. Like match-list-ids, the encrypted puuid
// is resolved from the Riot ID through riot_account_cache, then ACCOUNT-V1.
//           or { error: 'KEY_INVALID'|'RATE_LIMITED'|'NOT_FOUND'|'UNKNOWN' }
//
// Same skeleton as match-timeline: API key from the RIOT_API_KEY env (prod)
// or the caller's per-user riot_api_credentials row (dev fallback).
// Source of truth: lol-app-v-2/supabase/functions/ranked-entries; copied
// verbatim into the RiftLens repo, which is the one linked to the project.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

type Region = 'NA' | 'EUW' | 'EUNE' | 'KR' | 'LAN' | 'BR' | 'JP' | 'OCE' | 'TR' | 'RU'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** ACCOUNT-V1 lives on the regional cluster. */
const REGION_TO_CLUSTER: Record<Region, string> = {
  NA: 'americas.api.riotgames.com',
  EUW: 'europe.api.riotgames.com',
  EUNE: 'europe.api.riotgames.com',
  KR: 'asia.api.riotgames.com',
  LAN: 'americas.api.riotgames.com',
  BR: 'americas.api.riotgames.com',
  JP: 'asia.api.riotgames.com',
  OCE: 'sea.api.riotgames.com',
  TR: 'europe.api.riotgames.com',
  RU: 'europe.api.riotgames.com',
}

/** LEAGUE-V4 is a platform endpoint (na1, euw1…), not a regional cluster. */
const REGION_TO_PLATFORM: Record<Region, string> = {
  NA: 'na1.api.riotgames.com',
  EUW: 'euw1.api.riotgames.com',
  EUNE: 'eun1.api.riotgames.com',
  KR: 'kr.api.riotgames.com',
  LAN: 'la1.api.riotgames.com',
  BR: 'br1.api.riotgames.com',
  JP: 'jp1.api.riotgames.com',
  OCE: 'oc1.api.riotgames.com',
  TR: 'tr1.api.riotgames.com',
  RU: 'ru.api.riotgames.com',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}

async function resolveApiKey(supabase: any, authHeader: string | null): Promise<{ apiKey: string | null; error: string | null }> {
  const envKey = Deno.env.get('RIOT_API_KEY')
  if (envKey) return { apiKey: envKey, error: null }
  if (!authHeader) return { apiKey: null, error: 'AUTH_MISSING' }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) return { apiKey: null, error: 'AUTH_INVALID' }
  const { data, error } = await supabase.from('riot_api_credentials').select('api_key, expires_at').eq('user_id', userData.user.id).maybeSingle()
  if (error) return { apiKey: null, error: `CREDS_LOOKUP: ${error.message}` }
  if (!data) return { apiKey: null, error: 'RIOT_KEY_MISSING' }
  if (new Date(data.expires_at as string).getTime() < Date.now()) return { apiKey: null, error: 'RIOT_KEY_EXPIRED' }
  return { apiKey: data.api_key as string, error: null }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'UNKNOWN', detail: 'Supabase env missing on server' }, 500)
  const supabase: any = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { apiKey, error: keyError } = await resolveApiKey(supabase, req.headers.get('Authorization'))
  if (!apiKey) {
    const code = keyError === 'RIOT_KEY_EXPIRED' || keyError === 'RIOT_KEY_MISSING' ? 'KEY_INVALID' : 'UNKNOWN'
    return json({ error: code, detail: keyError }, code === 'KEY_INVALID' ? 401 : 500)
  }

  let body: { puuid?: string; gameName?: string; tagLine?: string; region?: Region }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'UNKNOWN', detail: 'Invalid JSON body' }, 400)
  }
  const region: Region = body.region ?? 'NA'
  const platform = REGION_TO_PLATFORM[region] ?? REGION_TO_PLATFORM.NA
  const cluster = REGION_TO_CLUSTER[region] ?? REGION_TO_CLUSTER.NA

  // The encrypted puuid: passed directly (78 chars), else from the Riot ID via the cache, else ACCOUNT-V1.
  let puuid = String(body.puuid ?? '').trim()
  if (puuid.length < 60) puuid = ''
  if (!puuid) {
    const gameName = String(body.gameName ?? '').trim()
    const tagLine = String(body.tagLine ?? '').trim()
    if (!gameName || !tagLine) return json({ error: 'UNKNOWN', detail: 'send an encrypted puuid OR gameName + tagLine' }, 400)
    const { data: cached } = await supabase.from('riot_account_cache').select('puuid').eq('game_name', gameName).eq('tag_line', tagLine).maybeSingle()
    if (cached?.puuid) {
      puuid = cached.puuid as string
    } else {
      const acc = await fetch(`https://${cluster}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`, { headers: { 'X-Riot-Token': apiKey } })
      if (acc.status === 401 || acc.status === 403) return json({ error: 'KEY_INVALID' }, 401)
      if (acc.status === 429) return json({ error: 'RATE_LIMITED' }, 429)
      if (acc.status === 404) return json({ error: 'NOT_FOUND', detail: 'riot id not found' }, 404)
      if (!acc.ok) return json({ error: 'UNKNOWN', stage: 'account-v1', status: acc.status }, 502)
      const account = (await acc.json()) as { puuid?: string }
      if (!account.puuid) return json({ error: 'UNKNOWN', stage: 'account-v1', detail: 'no puuid in response' }, 502)
      puuid = account.puuid
      await supabase.from('riot_account_cache').upsert({ game_name: gameName, tag_line: tagLine, puuid, fetched_at: new Date().toISOString() }, { onConflict: 'game_name,tag_line' })
    }
  }

  const res = await fetch(`https://${platform}/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`, { headers: { 'X-Riot-Token': apiKey } })
  if (res.status === 401 || res.status === 403) return json({ error: 'KEY_INVALID' }, 401)
  if (res.status === 429) return json({ error: 'RATE_LIMITED' }, 429)
  if (res.status === 404) return json({ entries: [] }) // no ranked games this season reads as unranked, not as an error
  if (!res.ok) return json({ error: 'UNKNOWN', status: res.status }, 502)

  const entries = await res.json()

  // summoner-v4 for the level badge on the header; its failure never hides the rank.
  let summoner: { summonerLevel: number; profileIconId: number } | null = null
  try {
    const sum = await fetch(`https://${platform}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`, { headers: { 'X-Riot-Token': apiKey } })
    if (sum.ok) {
      const s = (await sum.json()) as { summonerLevel?: number; profileIconId?: number }
      if (typeof s.summonerLevel === 'number') summoner = { summonerLevel: s.summonerLevel, profileIconId: typeof s.profileIconId === 'number' ? s.profileIconId : 0 }
    }
  } catch {
    summoner = null
  }
  return json({ entries: Array.isArray(entries) ? entries : [], summoner })
})
