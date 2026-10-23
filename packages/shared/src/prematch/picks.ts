/**
 * Your picks for a role, from your own games only (champion select screen,
 * 2026-10-23). `best`: champions with 3+ games by win rate, then games;
 * `mostPlayed`: the rest by games. Pure: no I/O.
 */
import type { MatchSummary, Role } from '../match-v5'
import { ANALYZABLE_QUEUES } from '../analysis/targets'
import { kdaRatio } from '../format'
import { FEW_GAMES } from './history'

export type PickRow = { championId: number; championName: string; games: number; wins: number; winRate: number; avgKda: number | null; avgCsPerMin: number | null; fewGames: boolean }

const LIMIT = 5
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function recommendedPicks(all: MatchSummary[], role: Role): { best: PickRow[]; mostPlayed: PickRow[] } {
  const byChamp = new Map<number, { name: string; games: MatchSummary[] }>()
  for (const s of all) {
    if (!ANALYZABLE_QUEUES.has(s.queueId) || s.remake || s.me.role !== role) continue
    const c = byChamp.get(s.me.championId) ?? { name: s.me.championName, games: [] }
    c.games.push(s)
    byChamp.set(s.me.championId, c)
  }
  const rows: PickRow[] = [...byChamp.entries()].map(([championId, c]) => {
    const wins = c.games.filter((s) => s.me.win).length
    const kda = mean(c.games.map((s) => kdaRatio(s.me.kills, s.me.deaths, s.me.assists)))
    const cs = mean(c.games.map((s) => s.me.csPerMin).filter((v): v is number => v !== null))
    return {
      championId,
      championName: c.name,
      games: c.games.length,
      wins,
      winRate: Math.round((wins / c.games.length) * 100),
      avgKda: kda === null ? null : Math.round(kda * 100) / 100,
      avgCsPerMin: cs === null ? null : Math.round(cs * 10) / 10,
      fewGames: c.games.length < FEW_GAMES,
    }
  })
  const best = rows
    .filter((r) => !r.fewGames)
    .sort((a, b) => b.winRate - a.winRate || b.games - a.games || a.championName.localeCompare(b.championName))
    .slice(0, LIMIT)
  const chosen = new Set(best.map((r) => r.championId))
  const mostPlayed = rows
    .filter((r) => !chosen.has(r.championId))
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate || a.championName.localeCompare(b.championName))
    .slice(0, LIMIT)
  return { best, mostPlayed }
}

export const CHAMP_SELECT_PICKS = 3

export type PickCard = PickRow & { reason: 'best' | 'mostPlayed' }

/** The champion select carousel: best win rate (3+ games) first, filled with the most played, three in all. */
export function champSelectPicks(all: MatchSummary[], role: Role, limit = CHAMP_SELECT_PICKS): PickCard[] {
  const { best, mostPlayed } = recommendedPicks(all, role)
  const rows: PickCard[] = [...best.map((r) => ({ ...r, reason: 'best' as const })), ...mostPlayed.map((r) => ({ ...r, reason: 'mostPlayed' as const }))]
  return rows.slice(0, limit)
}
