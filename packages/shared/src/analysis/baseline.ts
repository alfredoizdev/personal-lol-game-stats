/**
 * "vs you": the player's own average over their last 20 analyzable games in
 * the same role (spec 2.7, 6.2). Context only — never moves a score.
 */
import type { MatchSummary, Role } from '../match-v5'
import { metricsOf } from './areas'
import { ANALYZABLE_QUEUES } from './targets'

export type Baseline = {
  n: number
  csPerMin: number | null
  kpPct: number | null
  deathsPer10: number | null
  visionPerMin: number | null
  wardsPerMin: number | null
}

/** Below this many games the UI labels the average "few games" and hides "vs you" deltas. */
export const BASELINE_MIN_GAMES = 3
const BASELINE_MAX_GAMES = 20

const mean = (xs: Array<number | null>): number | null => {
  const v = xs.filter((x): x is number => x !== null && Number.isFinite(x))
  return v.length === 0 ? null : Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100
}

export function buildBaseline(summaries: MatchSummary[], role: Role, excludeMatchId: string): Baseline {
  const games = summaries
    .filter((s) => s.matchId !== excludeMatchId && !s.remake && ANALYZABLE_QUEUES.has(s.queueId) && s.me.role === role)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, BASELINE_MAX_GAMES)
  const m = games.map((s) => metricsOf(s.me, s.durationSec, s.teamKills))
  return {
    n: games.length,
    csPerMin: mean(m.map((x) => x.csPerMin)),
    kpPct: mean(m.map((x) => x.kpPct)),
    deathsPer10: mean(m.map((x) => x.deathsPer10)),
    visionPerMin: mean(m.map((x) => x.visionPerMin)),
    wardsPerMin: mean(m.map((x) => x.wardsPerMin)),
  }
}
