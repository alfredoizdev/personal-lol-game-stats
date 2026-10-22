/**
 * The player's own history, grouped for the pre-match block (Phase 5 spec
 * 2.3, 5.2). Only analyzable, non-remake games. Pure: no I/O.
 */
import type { MatchSummary, Role } from '../match-v5'
import { ANALYZABLE_QUEUES } from '../analysis/targets'
import { kdaRatio } from '../format'

export const FEW_GAMES = 3

export type ChampionSummary = {
  games: number
  wins: number
  winRate: number | null
  avgKda: number | null
  avgCsPerMin: number | null
  fewGames: boolean
}

export type MatchupRow = { championId: number; championName: string; games: number; wins: number; winRate: number; fewGames: boolean }

const analyzable = (s: MatchSummary) => ANALYZABLE_QUEUES.has(s.queueId) && !s.remake
const newestFirst = (a: MatchSummary, b: MatchSummary) => Date.parse(b.startedAt) - Date.parse(a.startedAt)
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const pct = (wins: number, games: number) => Math.round((wins / games) * 100)

/** Games with that champion in that role, newest first. */
export function championGames(all: MatchSummary[], championId: number, role: Role): MatchSummary[] {
  return all.filter((s) => analyzable(s) && s.me.championId === championId && s.me.role === role).sort(newestFirst)
}

export function championSummary(all: MatchSummary[], championId: number, role: Role): ChampionSummary {
  const games = championGames(all, championId, role)
  const wins = games.filter((s) => s.me.win).length
  const kda = mean(games.map((s) => kdaRatio(s.me.kills, s.me.deaths, s.me.assists)))
  const cs = mean(games.map((s) => s.me.csPerMin).filter((v): v is number => v !== null))
  return {
    games: games.length,
    wins,
    winRate: games.length ? pct(wins, games.length) : null,
    avgKda: kda === null ? null : Math.round(kda * 100) / 100,
    avgCsPerMin: cs === null ? null : Math.round(cs * 10) / 10,
    fewGames: games.length < FEW_GAMES,
  }
}

/** Lane opponents (same role) you lost to most, whatever champion you played. */
export function toughestMatchups(all: MatchSummary[], role: Role, limit = 5): MatchupRow[] {
  const byEnemy = new Map<number, { name: string; games: number; wins: number }>()
  for (const s of all) {
    if (!analyzable(s) || s.me.role !== role || !s.opponent || s.opponent.role !== role) continue
    const e = byEnemy.get(s.opponent.championId) ?? { name: s.opponent.championName, games: 0, wins: 0 }
    e.games += 1
    if (s.me.win) e.wins += 1
    byEnemy.set(s.opponent.championId, e)
  }
  return [...byEnemy.entries()]
    .filter(([, e]) => e.games >= 2)
    .map(([championId, e]) => ({ championId, championName: e.name, games: e.games, wins: e.wins, winRate: pct(e.wins, e.games), fewGames: e.games < FEW_GAMES }))
    .sort((a, b) => a.winRate - b.winRate || b.games - a.games || a.championName.localeCompare(b.championName))
    .slice(0, limit)
}

export const BAN_MIN_GAMES = 3
export const BAN_MAX_WIN_RATE = 40

/** A sentence, never an order; only with enough evidence from your own games. */
export function banSuggestion(rows: MatchupRow[], roleLabel: string): string {
  const pick = rows.find((r) => r.games >= BAN_MIN_GAMES && r.winRate < BAN_MAX_WIN_RATE)
  if (!pick) return 'Not enough games against a single champion to suggest a ban.'
  return `You lost ${pick.games - pick.wins} of ${pick.games} games against ${pick.championName} as ${roleLabel}. Consider banning it.`
}

export function playedChampions(all: MatchSummary[], role: Role): Array<{ championId: number; championName: string; games: number }> {
  const byChamp = new Map<number, { championName: string; games: number }>()
  for (const s of all) {
    if (!analyzable(s) || s.me.role !== role) continue
    const c = byChamp.get(s.me.championId) ?? { championName: s.me.championName, games: 0 }
    c.games += 1
    byChamp.set(s.me.championId, c)
  }
  return [...byChamp.entries()]
    .map(([championId, c]) => ({ championId, ...c }))
    .sort((a, b) => b.games - a.games || a.championName.localeCompare(b.championName))
}

export function lastRole(all: MatchSummary[]): Role | null {
  const newest = all.filter((s) => analyzable(s) && s.me.role !== null).sort(newestFirst)[0]
  return newest?.me.role ?? null
}
