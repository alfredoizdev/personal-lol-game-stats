import { kdaRatio, type MatchSummary } from '@lpp/shared'

export type MatchAggregates = {
  games: number
  avgKda: number | null
  avgCsPerMin: number | null
  winRate: number | null
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Header numbers over the first `limit` non-remake games. Nulls when there is nothing to average. */
export function aggregateMatches(summaries: MatchSummary[], limit = 10): MatchAggregates {
  const games = summaries.filter((s) => !s.remake).slice(0, limit)
  if (games.length === 0) return { games: 0, avgKda: null, avgCsPerMin: null, winRate: null }
  const kda = games.reduce((acc, g) => acc + kdaRatio(g.me.kills, g.me.deaths, g.me.assists), 0) / games.length
  const withCs = games.filter((g) => g.me.csPerMin !== null)
  const cs = withCs.length ? withCs.reduce((acc, g) => acc + (g.me.csPerMin ?? 0), 0) / withCs.length : null
  const wins = games.filter((g) => g.me.win).length
  return {
    games: games.length,
    avgKda: round1(kda),
    avgCsPerMin: cs === null ? null : round1(cs),
    winRate: Math.round((wins / games.length) * 100),
  }
}
