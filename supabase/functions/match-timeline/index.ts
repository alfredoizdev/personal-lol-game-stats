// match-timeline Edge Function. Proxy for the Riot MATCH-V5 timeline
// endpoint, cached forever in match_timeline_cache (timelines are
// immutable), answering with the REDUCED per-minute series the phone
// needs instead of the 0.5–2 MB raw blob (see reduce.ts).
//
// Request:  POST { matchId: 'NA1_7393730303' | '7393730303', region: 'NA' }
// Response: TimelineSeries { v: 1, matchId, participants, frames }
//           or { error: 'KEY_INVALID'|'RATE_LIMITED'|'NOT_FOUND'|'UNKNOWN' }
//
// Same skeleton as match-detail: API key from the RIOT_API_KEY env (prod)
// or the caller's per-user riot_api_credentials row (dev fallback).
// Source of truth: lol-app-v-2/supabase/functions/match-timeline; copied
// verbatim into the RiftLens repo, which is the one linked to the project.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { reduceTimeline, type RiotTimeline } from './reduce.ts'

type Region = 'NA' | 'EUW' | 'EUNE' | 'KR' | 'LAN' | 'BR' | 'JP' | 'OCE' | 'TR' | 'RU'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

function clusterFor(region: Region): string {
  return REGION_TO_CLUSTER[region] ?? REGION_TO_CLUSTER.NA
}

function platformPrefix(region: Region): string {
  switch (region) {
    case 'NA': return 'NA1'
    case 'EUW': return 'EUW1'
    case 'EUNE': return 'EUN1'
    case 'KR': return 'KR'
    case 'LAN': return 'LA1'
    case 'BR': return 'BR1'
    case 'JP': return 'JP1'
    case 'OCE': return 'OC1'
    case 'TR': return 'TR1'
    case 'RU': return 'RU'
    default: return 'NA1'
  }
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', ...extra },
  })
}

async function resolveApiKey(
  supabase: any,
  authHeader: string | null,
): Promise<{ apiKey: string | null; error: string | null }> {
  const envKey = Deno.env.get('RIOT_API_KEY')
  if (envKey) return { apiKey: envKey, error: null }

  if (!authHeader) return { apiKey: null, error: 'AUTH_MISSING' }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) return { apiKey: null, error: 'AUTH_INVALID' }
  const { data, error } = await supabase
    .from('riot_api_credentials')
    .select('api_key, expires_at')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (error) return { apiKey: null, error: `CREDS_LOOKUP: ${error.message}` }
  if (!data) return { apiKey: null, error: 'RIOT_KEY_MISSING' }
  if (new Date(data.expires_at as string).getTime() < Date.now()) {
    return { apiKey: null, error: 'RIOT_KEY_EXPIRED' }
  }
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

  let body: { matchId?: string; region?: Region }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'UNKNOWN', detail: 'Invalid JSON body' }, 400)
  }
  const region: Region = body.region ?? 'NA'
  const rawId = String(body.matchId ?? '').trim()
  if (!rawId) return json({ error: 'UNKNOWN', detail: 'matchId required' }, 400)
  const matchId = rawId.includes('_') ? rawId : `${platformPrefix(region)}_${rawId}`

  // Cache hit: timelines are immutable, so a hit is valid forever and costs no Riot call.
  {
    const { data: cached, error: cacheErr } = await supabase
      .from('match_timeline_cache')
      .select('data')
      .eq('match_id', matchId)
      .maybeSingle()
    if (!cacheErr && cached?.data) {
      return json(reduceTimeline(cached.data as RiotTimeline), 200, { 'X-Cache': 'HIT' })
    }
  }

  const url = `https://${clusterFor(region)}/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`
  const res = await fetch(url, { headers: { 'X-Riot-Token': apiKey } })
  if (res.status === 401 || res.status === 403) return json({ error: 'KEY_INVALID' }, 401)
  if (res.status === 429) return json({ error: 'RATE_LIMITED' }, 429)
  if (res.status === 404) return json({ error: 'NOT_FOUND' }, 404)
  if (!res.ok) return json({ error: 'UNKNOWN', status: res.status }, 502)

  const raw = (await res.json()) as RiotTimeline

  // Persist the FULL blob without awaiting: the caller shouldn't pay for the
  // write, and a failed insert only means the next open re-fetches.
  supabase
    .from('match_timeline_cache')
    .upsert({ match_id: matchId, region, data: raw }, { onConflict: 'match_id' })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.error('match_timeline_cache upsert failed', error)
    })

  return json(reduceTimeline(raw), 200, { 'X-Cache': 'MISS' })
})
