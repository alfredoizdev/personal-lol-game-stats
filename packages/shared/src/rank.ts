/**
 * The account's ranked standing (owner, 2026-10-27: "no sale el MMR por ningún
 * lado"). Riot does not expose MMR; league-v4 gives tier, division, LP and the
 * season record per queue, which is what every tracker shows. Own data only.
 */
import type { RankTier } from './prematch/reference'

export type RankQueue = 'solo' | 'flex'
export type RankEntry = { queue: RankQueue; tier: string; division: string; leaguePoints: number; wins: number; losses: number }
export type RankedEntries = { solo: RankEntry | null; flex: RankEntry | null }

const QUEUE: Record<string, RankQueue> = { RANKED_SOLO_5x5: 'solo', RANKED_FLEX_SR: 'flex' }
const APEX: ReadonlySet<string> = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER'])

/** Riot league-v4 `entries/by-puuid` payload → solo and flex; anything else (TFT, unknown) is ignored. */
export function parseRankedEntries(raw: unknown): RankedEntries {
  const out: RankedEntries = { solo: null, flex: null }
  if (!Array.isArray(raw)) return out
  for (const e of raw as Array<Record<string, unknown>>) {
    const queue = QUEUE[String(e?.queueType ?? '')]
    if (!queue || typeof e.tier !== 'string') continue
    out[queue] = {
      queue,
      tier: e.tier,
      division: typeof e.rank === 'string' ? e.rank : '',
      leaguePoints: typeof e.leaguePoints === 'number' ? e.leaguePoints : 0,
      wins: typeof e.wins === 'number' ? e.wins : 0,
      losses: typeof e.losses === 'number' ? e.losses : 0,
    }
  }
  return out
}

const word = (tier: string) => tier.charAt(0) + tier.slice(1).toLowerCase()

/** "Gold II · 45 LP · 12W 8L"; apex tiers have no division; "Unranked" without an entry. */
export function formatRank(entry: RankEntry | null): string {
  if (!entry) return 'Unranked'
  const name = APEX.has(entry.tier) || !entry.division ? word(entry.tier) : `${word(entry.tier)} ${entry.division}`
  return `${name} · ${entry.leaguePoints} LP · ${entry.wins}W ${entry.losses}L`
}

/** The ladder tier on the goal ruler that matches a Riot tier. */
export function rankTier(tier: string | null): RankTier | null {
  if (!tier) return null
  if (APEX.has(tier)) return 'Master+'
  const w = word(tier)
  return (['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond'] as const).find((t) => t === w) ?? null
}
