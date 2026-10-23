import { rating, ROLE_TARGETS, scoreRatio, type MatchSummary, type Rating } from '@lpp/shared'
import { aggregateMatches } from './match-aggregates'

/** Average KDA at which the Matches header arc reads 70 ("Good"); same ratio curve as every area score. */
export const KDA_TARGET = 3.0

export type HeaderDonut = {
  key: 'kda' | 'cs' | 'winRate'
  label: string
  /** Centre text of the arc ("3.0", "5.7", "30%"); "—" when there is nothing to show. */
  display: string
  /** Arc fill 0–100; null draws an empty track. */
  score: number | null
  rating: Rating | null
}

/** Win rate has its own thresholds: a 50 % rate is already Good. */
export function winRateRating(winRate: number): Rating {
  if (winRate < 40) return 'Poor'
  if (winRate < 50) return 'Fair'
  if (winRate < 60) return 'Good'
  return 'Great'
}

/**
 * Mean of the per-game CS/min scores against each game's role target. Support
 * games (no CS target), games with an unknown role and games without CS/min
 * drop out; null when none remain.
 */
function csScore(games: MatchSummary[]): number | null {
  const scores = games
    .map((g) => scoreRatio(g.me.csPerMin, g.me.role === null ? null : ROLE_TARGETS[g.me.role].csPerMin, 'higher'))
    .filter((s): s is number => s !== null)
  if (scores.length === 0) return null
  return Math.round(scores.reduce((acc, s) => acc + s, 0) / scores.length)
}

/**
 * The three header arcs over the same window as `aggregateMatches` (first
 * `limit` non-remake games). Every arc has a score behind it: KDA against
 * `KDA_TARGET`, CS/min against the role targets, win rate as itself.
 */
export function headerDonuts(summaries: MatchSummary[], limit = 10): HeaderDonut[] {
  const games = summaries.filter((s) => !s.remake).slice(0, limit)
  const agg = aggregateMatches(summaries, limit)

  const kdaScore = scoreRatio(agg.avgKda, KDA_TARGET, 'higher')
  const cs = csScore(games)
  const winRate = agg.winRate

  return [
    {
      key: 'kda',
      label: 'Avg KDA',
      display: agg.avgKda === null ? '—' : agg.avgKda.toFixed(1),
      score: kdaScore,
      rating: kdaScore === null ? null : rating(kdaScore),
    },
    {
      key: 'cs',
      label: 'CS / min',
      display: agg.avgCsPerMin === null ? '—' : agg.avgCsPerMin.toFixed(1),
      score: cs,
      rating: cs === null ? null : rating(cs),
    },
    {
      key: 'winRate',
      label: 'Win Rate',
      display: winRate === null ? '—' : `${winRate}%`,
      score: winRate,
      rating: winRate === null ? null : winRateRating(winRate),
    },
  ]
}
