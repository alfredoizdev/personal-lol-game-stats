/**
 * Bans for the champion select screen (owner, 2026-10-23): six in all, three
 * from your own games and three from the curated meta list. Pure: no I/O.
 */
import type { MatchupRow } from './history'
import type { MetaBan } from './meta-bans'

export const CHAMP_SELECT_BANS = 3

export type ChampSelectBans = { history: MatchupRow[]; meta: MetaBan[] }

/**
 * `history`: lane opponents in this role you lose to (win rate under 50 %), worst
 * first as `toughestMatchups` orders them, at most three. `meta`: the first three
 * meta champions not already among those.
 */
export function champSelectBans(matchups: MatchupRow[], meta: MetaBan[], limit = CHAMP_SELECT_BANS): ChampSelectBans {
  const history = matchups.filter((r) => r.winRate < 50).slice(0, limit)
  const taken = new Set(history.map((r) => r.championId))
  return { history, meta: meta.filter((m) => !taken.has(m.championId)).slice(0, limit) }
}
