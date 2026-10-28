import type { SupabaseClient } from '@supabase/supabase-js'
import { snapshotChanged, snapshotOf, type RankedEntries, type RankSnapshot } from '@lpp/shared'

const MAX_ROWS = 400

type Row = { queue: string; tier: string; division: string; league_points: number; wins: number; losses: number; taken_at: string }

export function rowToSnapshot(r: Row): RankSnapshot | null {
  if (r.queue !== 'solo' && r.queue !== 'flex') return null
  return { queue: r.queue, tier: r.tier, division: r.division, leaguePoints: r.league_points, wins: r.wins, losses: r.losses, takenAt: r.taken_at }
}

/** The account's stored standings, oldest first (the newest MAX_ROWS). RLS limits rows to the signed-in user. */
export async function fetchRankSnapshots(client: SupabaseClient, userId: string, puuid: string): Promise<RankSnapshot[]> {
  const { data, error } = await client
    .from('rank_snapshots')
    .select('queue, tier, division, league_points, wins, losses, taken_at')
    .eq('user_id', userId)
    .eq('puuid', puuid)
    .order('taken_at', { ascending: false })
    .limit(MAX_ROWS)
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map(rowToSnapshot).filter((s): s is RankSnapshot => s !== null).reverse()
}

/** Stores one row per queue whose standing moved since the newest stored snapshot of that queue; returns how many were written. */
export async function recordRankSnapshots(client: SupabaseClient, userId: string, puuid: string, rank: RankedEntries, stored: RankSnapshot[], takenAt: string): Promise<number> {
  const rows: Array<Record<string, unknown>> = []
  for (const entry of [rank.solo, rank.flex]) {
    if (!entry) continue
    const next = snapshotOf(entry, takenAt)
    const prev = [...stored].reverse().find((s) => s.queue === entry.queue) ?? null
    if (!snapshotChanged(prev, next)) continue
    rows.push({ user_id: userId, puuid, queue: next.queue, tier: next.tier, division: next.division, league_points: next.leaguePoints, wins: next.wins, losses: next.losses, taken_at: takenAt })
  }
  if (rows.length === 0) return 0
  const { error } = await client.from('rank_snapshots').insert(rows)
  if (error) throw new Error(error.message)
  return rows.length
}
