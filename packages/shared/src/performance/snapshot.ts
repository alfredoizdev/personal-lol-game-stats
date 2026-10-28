/**
 * The "Recent 20 games" block of the Performance tab (owner, 2026-10-27, after
 * op.gg mobile): record, average K/D/A per game, KDA ratio, the three most
 * played champions (the pool) and the main role's share. Newest analyzable games only.
 */
import type { MatchSummary, Role } from '../match-v5'
import { ANALYZABLE_QUEUES } from '../analysis/targets'

export type SnapshotChampion = { championId: number; championName: string; games: number; wins: number; winRate: number }
export type RecentSnapshot = {
  games: number
  wins: number
  losses: number
  winRate: number | null
  /** Average kills, deaths and assists per game, one decimal. */
  kills: number
  deaths: number
  assists: number
  /** (kills + assists) / deaths over the games; null without a death. */
  kda: number | null
  champions: SnapshotChampion[]
  mainRole: { role: Role; pct: number } | null
}

const CHAMPIONS = 4
const pct = (part: number, whole: number) => Math.round((part / whole) * 100)
const round1 = (n: number) => Math.round(n * 10) / 10

export function recentSnapshot(all: MatchSummary[], n: number): RecentSnapshot {
  const games = all
    .filter((s) => ANALYZABLE_QUEUES.has(s.queueId) && !s.remake)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, n)
  const count = games.length
  const wins = games.filter((s) => s.me.win).length
  const k = games.reduce((sum, s) => sum + s.me.kills, 0)
  const d = games.reduce((sum, s) => sum + s.me.deaths, 0)
  const a = games.reduce((sum, s) => sum + s.me.assists, 0)

  const byChamp = new Map<number, { name: string; games: number; wins: number }>()
  const byRole = new Map<Role, number>()
  for (const s of games) {
    const c = byChamp.get(s.me.championId) ?? { name: s.me.championName, games: 0, wins: 0 }
    c.games += 1
    if (s.me.win) c.wins += 1
    byChamp.set(s.me.championId, c)
    if (s.me.role) byRole.set(s.me.role, (byRole.get(s.me.role) ?? 0) + 1)
  }
  const champions = [...byChamp.entries()]
    .map(([championId, c]) => ({ championId, championName: c.name, games: c.games, wins: c.wins, winRate: pct(c.wins, c.games) }))
    .sort((x, y) => y.games - x.games || y.winRate - x.winRate || x.championName.localeCompare(y.championName))
    .slice(0, CHAMPIONS)
  const main = [...byRole.entries()].sort((x, y) => y[1] - x[1])[0]

  return {
    games: count,
    wins,
    losses: count - wins,
    winRate: count ? pct(wins, count) : null,
    kills: count ? round1(k / count) : 0,
    deaths: count ? round1(d / count) : 0,
    assists: count ? round1(a / count) : 0,
    kda: d > 0 ? round1((k + a) / d) : null,
    champions,
    mainRole: main ? { role: main[0], pct: pct(main[1], count) } : null,
  }
}
