// ranked-entries Edge Function. Proxy for Riot LEAGUE-V4 `entries/by-puuid`:
// the signed-in player's own ranked standing (tier, division, LP, season W/L)
// for Solo/Duo and Flex. No server cache: the phone keeps it for an hour.
//
// Request:  POST { puuid: '...', region: 'NA' }
// Response: { entries: LeagueEntry[] }   (Riot's array, passed through)
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

  let body: { puuid?: string; region?: Region }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'UNKNOWN', detail: 'Invalid JSON body' }, 400)
  }
  const puuid = String(body.puuid ?? '').trim()
  if (!puuid) return json({ error: 'UNKNOWN', detail: 'puuid required' }, 400)
  const platform = REGION_TO_PLATFORM[body.region ?? 'NA'] ?? REGION_TO_PLATFORM.NA

  const res = await fetch(`https://${platform}/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`, { headers: { 'X-Riot-Token': apiKey } })
  if (res.status === 401 || res.status === 403) return json({ error: 'KEY_INVALID' }, 401)
  if (res.status === 429) return json({ error: 'RATE_LIMITED' }, 429)
  if (res.status === 404) return json({ entries: [] }) // no ranked games this season reads as unranked, not as an error
  if (!res.ok) return json({ error: 'UNKNOWN', status: res.status }, 502)

  const entries = await res.json()
  return json({ entries: Array.isArray(entries) ? entries : [] })
})
