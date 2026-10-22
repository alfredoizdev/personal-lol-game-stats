/**
 * The Performance page (Phase 6 spec 2.2–2.8): the player's own cached games
 * turned into one honest profile — overview, roles, areas, champions, lane
 * matchups and a descriptive headline. Scores are the same explainable match
 * score the Matches rows show (`analyzeMatch` without timeline or baseline),
 * so nothing here needs a Riot call. Pure: no I/O. Documented in
 * docs/ANALYSIS.md section 8.
 */
import type { MatchSummary, Role } from '../match-v5'
import { analyzeMatch, type AreaResult } from '../analysis/areas'
import { performanceTier, type PerformanceTier } from '../analysis/performance-tier'
import { rating, type Rating } from '../analysis/score'
import { ANALYZABLE_QUEUES, type AreaKey } from '../analysis/targets'
import { FEW_GAMES } from '../prematch/history'

export const PERIODS = [20, 50, 100] as const
export type Period = (typeof PERIODS)[number]

export const ROLE_LABEL: Record<Role, string> = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support' }
const ROLE_ORDER: Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

export const RECENT_N = 10
/** Lane needs the timeline of every game; the page never downloads it. */
const AGGREGATED_AREAS: AreaKey[] = ['farming', 'combat', 'vision']
const MATCHUP_MIN_GAMES = 2
const TOUGHEST_LIMIT = 5
const BEST_LIMIT = 3
const CHAMPIONS_LIMIT = 8

export type RoleStat = { role: Role; games: number; wins: number; winRate: number; avgScore: number | null; fewGames: boolean }
export type AreaSubrowStat = { key: string; label: string; avg: number | null; target: number | null; decimals: number; suffix: string; n: number }
export type AreaStat = { key: AreaKey; label: string; avgScore: number | null; rating: Rating | null; n: number; subrows: AreaSubrowStat[] }
export type ChampionStat = { championId: number; championName: string; role: Role | null; games: number; wins: number; winRate: number; avgScore: number | null; tier: PerformanceTier | null; fewGames: boolean }
export type MatchupStat = { championId: number; championName: string; role: Role; games: number; wins: number; winRate: number; fewGames: boolean }
export type RecentGame = { matchId: string; win: boolean; score: number | null; championName: string }
export type Streak = { kind: 'win' | 'loss'; n: number } | null

export type PerformanceProfile = {
  period: Period
  games: number
  wins: number
  winRate: number | null
  avgScore: number | null
  tier: PerformanceTier | null
  /** Oldest → newest, at most RECENT_N. */
  recent: RecentGame[]
  /** Current run of the same result from the newest game; n ≥ 2 only. */
  streak: Streak
  /** Games desc, then role order TOP…UTILITY. */
  roles: RoleStat[]
  strongestRole: Role | null
  weakestRole: Role | null
  /** farming (when scored in ≥ 1 game), combat, vision. */
  areas: AreaStat[]
  weakestArea: AreaKey | null
  /** Games desc, win rate desc, name; at most 8. */
  champions: ChampionStat[]
  /** Lane matchups use every loaded analyzable game (a repeat opponent is rare inside 20 games). */
  toughest: MatchupStat[]
  best: MatchupStat[]
  matchupGames: number
  headline: string
}

type Scored = { s: MatchSummary; score: number | null; areas: AreaResult[] }

const pct = (wins: number, games: number) => Math.round((wins / games) * 100)
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const roundTo = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d
const meanInt = (xs: number[]) => {
  const m = mean(xs)
  return m === null ? null : Math.round(m)
}

export function performanceProfile(all: MatchSummary[], period: Period): PerformanceProfile {
  const analyzable = all.filter((s) => ANALYZABLE_QUEUES.has(s.queueId) && !s.remake).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
  const games = analyzable.slice(0, period).map(scoreGame)

  const wins = games.filter((g) => g.s.me.win).length
  const scores = games.map((g) => g.score).filter((v): v is number => v !== null)
  const avgScore = meanInt(scores)
  const roles = roleStats(games)
  const { strongest, weakest } = rankRoles(roles)
  const areas = areaStats(games)
  const rankable = areas.filter((a) => a.avgScore !== null && a.n >= FEW_GAMES)
  const weakestArea = rankable.length ? rankable.reduce((m, a) => (a.avgScore! < m.avgScore! ? a : m)).key : null

  const profile: PerformanceProfile = {
    period,
    games: games.length,
    wins,
    winRate: games.length ? pct(wins, games.length) : null,
    avgScore,
    tier: avgScore === null ? null : performanceTier(avgScore),
    recent: games
      .slice(0, RECENT_N)
      .reverse()
      .map((g) => ({ matchId: g.s.matchId, win: g.s.me.win, score: g.score, championName: g.s.me.championName })),
    streak: streakOf(games),
    roles,
    strongestRole: strongest,
    weakestRole: weakest,
    areas,
    weakestArea,
    champions: championStats(games),
    ...matchupStats(analyzable),
    matchupGames: analyzable.length,
    headline: '',
  }
  profile.headline = headline(profile)
  return profile
}

function scoreGame(s: MatchSummary): Scored {
  const a = analyzeMatch({ summary: s, series: null, baseline: null })
  return a.analyzable ? { s, score: a.overall, areas: a.areas } : { s, score: null, areas: [] }
}

function streakOf(games: Scored[]): Streak {
  if (games.length === 0) return null
  const kind = games[0]!.s.me.win ? 'win' : 'loss'
  let n = 0
  for (const g of games) {
    if ((g.s.me.win ? 'win' : 'loss') !== kind) break
    n += 1
  }
  return n >= 2 ? { kind, n } : null
}

function roleStats(games: Scored[]): RoleStat[] {
  const byRole = new Map<Role, Scored[]>()
  for (const g of games) {
    const role = g.s.me.role
    if (!role) continue
    byRole.set(role, [...(byRole.get(role) ?? []), g])
  }
  return [...byRole.entries()]
    .map(([role, gs]) => {
      const wins = gs.filter((g) => g.s.me.win).length
      return { role, games: gs.length, wins, winRate: pct(wins, gs.length), avgScore: meanInt(gs.map((g) => g.score).filter((v): v is number => v !== null)), fewGames: gs.length < FEW_GAMES }
    })
    .sort((a, b) => b.games - a.games || ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
}

/** Strongest / weakest among roles with enough games: avg score, then win rate, then games. */
function rankRoles(roles: RoleStat[]): { strongest: Role | null; weakest: Role | null } {
  const eligible = roles.filter((r) => !r.fewGames && r.avgScore !== null)
  if (eligible.length === 0) return { strongest: null, weakest: null }
  const better = (a: RoleStat, b: RoleStat) => a.avgScore! - b.avgScore! || a.winRate - b.winRate || a.games - b.games
  const sorted = [...eligible].sort(better)
  const strongest = sorted[sorted.length - 1]!.role
  const weakest = sorted.length > 1 ? sorted[0]!.role : null
  return { strongest, weakest }
}

function areaStats(games: Scored[]): AreaStat[] {
  const out: AreaStat[] = []
  for (const key of AGGREGATED_AREAS) {
    const results = games.map((g) => g.areas.find((a) => a.key === key)).filter((a): a is AreaResult => !!a && a.score !== null)
    if (results.length === 0) continue
    const avgScore = meanInt(results.map((a) => a.score!))
    const subrows = new Map<string, { label: string; values: number[]; targets: number[]; display: string }>()
    for (const a of results) {
      for (const r of a.subrows) {
        if (r.context || r.score === null || r.value === null) continue
        const e = subrows.get(r.key) ?? { label: r.label, values: [], targets: [], display: r.display }
        e.values.push(r.value)
        if (r.target !== null) e.targets.push(r.target)
        subrows.set(r.key, e)
      }
    }
    out.push({
      key,
      label: results[0]!.label,
      avgScore,
      rating: avgScore === null ? null : rating(avgScore),
      n: results.length,
      subrows: [...subrows.entries()].map(([k, e]) => {
        const { decimals, suffix } = formatOf(e.display)
        const t = mean(e.targets)
        return { key: k, label: e.label, avg: roundTo(mean(e.values)!, decimals), target: t === null ? null : roundTo(t, decimals), decimals, suffix, n: e.values.length }
      }),
    })
  }
  return out
}

/** Decimals and suffix of a sub-row, read from how the engine displays it ("6.5", "70%"). */
function formatOf(display: string): { decimals: number; suffix: string } {
  const m = /^-?\d+(?:\.(\d+))?(.*)$/.exec(display)
  return { decimals: m?.[1]?.length ?? 0, suffix: m?.[2] ?? '' }
}

function championStats(games: Scored[]): ChampionStat[] {
  const byChamp = new Map<number, { name: string; gs: Scored[] }>()
  for (const g of games) {
    const e = byChamp.get(g.s.me.championId) ?? { name: g.s.me.championName, gs: [] }
    e.gs.push(g)
    byChamp.set(g.s.me.championId, e)
  }
  return [...byChamp.entries()]
    .map(([championId, e]) => {
      const wins = e.gs.filter((g) => g.s.me.win).length
      const avgScore = meanInt(e.gs.map((g) => g.score).filter((v): v is number => v !== null))
      return { championId, championName: e.name, role: mostPlayedRole(e.gs), games: e.gs.length, wins, winRate: pct(wins, e.gs.length), avgScore, tier: avgScore === null ? null : performanceTier(avgScore), fewGames: e.gs.length < FEW_GAMES }
    })
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate || a.championName.localeCompare(b.championName))
    .slice(0, CHAMPIONS_LIMIT)
}

function mostPlayedRole(gs: Scored[]): Role | null {
  const count = new Map<Role, number>()
  for (const g of gs) if (g.s.me.role) count.set(g.s.me.role, (count.get(g.s.me.role) ?? 0) + 1)
  let best: Role | null = null
  for (const role of ROLE_ORDER) {
    const c = count.get(role) ?? 0
    if (c > 0 && (best === null || c > count.get(best)!)) best = role
  }
  return best
}

function matchupStats(games: MatchSummary[]): { toughest: MatchupStat[]; best: MatchupStat[] } {
  const byKey = new Map<string, { championId: number; name: string; role: Role; games: number; wins: number }>()
  for (const s of games) {
    const role = s.me.role
    if (!role || !s.opponent || s.opponent.role !== role) continue
    const key = `${s.opponent.championId}:${role}`
    const e = byKey.get(key) ?? { championId: s.opponent.championId, name: s.opponent.championName, role, games: 0, wins: 0 }
    e.games += 1
    if (s.me.win) e.wins += 1
    byKey.set(key, e)
  }
  const rows: MatchupStat[] = [...byKey.values()]
    .filter((e) => e.games >= MATCHUP_MIN_GAMES)
    .map((e) => ({ championId: e.championId, championName: e.name, role: e.role, games: e.games, wins: e.wins, winRate: pct(e.wins, e.games), fewGames: e.games < FEW_GAMES }))
  const byName = (a: MatchupStat, b: MatchupStat) => b.games - a.games || a.championName.localeCompare(b.championName) || ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
  // Losing and winning matchups are disjoint: an even record (50 %) is in neither list.
  return {
    toughest: rows.filter((r) => r.winRate < 50).sort((a, b) => a.winRate - b.winRate || byName(a, b)).slice(0, TOUGHEST_LIMIT),
    best: rows.filter((r) => r.winRate > 50).sort((a, b) => b.winRate - a.winRate || byName(a, b)).slice(0, BEST_LIMIT),
  }
}

/** Descriptive, never advice. */
function headline(p: PerformanceProfile): string {
  if (p.games === 0) return "No Summoner's Rift games loaded yet."
  if (p.games < FEW_GAMES) return `Only ${p.games} game${p.games === 1 ? '' : 's'} loaded — load more for a clearer picture.`
  const parts = [`${p.winRate}% win rate over ${p.games} games`]
  if (p.strongestRole) parts.push(`strongest as ${ROLE_LABEL[p.strongestRole]}`)
  if (p.weakestArea) parts.push(`${p.areas.find((a) => a.key === p.weakestArea)!.label} is your weakest area`)
  return parts.join(' · ')
}
