/**
 * What to compare a goal against, so the player never picks a number blind:
 * their own average, the lane opponents they actually faced, their best game,
 * the role target, and an APPROXIMATE ladder of typical values by rank.
 *
 * The rank ladder is a community estimate for Summoner's Rift (it is not Riot
 * data and LanePulse has no tier dataset of its own); it is labelled as such in
 * the UI and documented in docs/ANALYSIS.md. Own numbers always come first.
 */
import type { MatchSummary, Role } from '../match-v5'
import { metricsOf } from '../analysis/metrics'
import { ROLE_TARGETS } from '../analysis/targets'
import { buildBaseline, BASELINE_MIN_GAMES } from '../analysis/baseline'
import { championGames, FEW_GAMES } from './history'
import { metricInfo, type GoalMetric } from './goal'
import { ANALYZABLE_QUEUES } from '../analysis/targets'

export const RANK_TIERS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master+'] as const
export type RankTier = (typeof RANK_TIERS)[number]

/**
 * Typical values per tier, Iron → Master+. Recalibrated 2026-10-27 on per-rank
 * community datasets (CS/min and KP by rank, vision by role) after the owner
 * saw a 5.5 CS goal land in a tier above his: mid CS/min runs 5.4 (Iron) to
 * 7.6 (Master+), jungle has its own CS ladder (camps count, so it is NOT the
 * laner one scaled down), KP climbs only 41 → 49 for laners (support 50 → 59),
 * and vision is a role thing far more than a rank thing. Still estimates, not
 * Riot data; labelled as such in the UI and documented in docs/ANALYSIS.md.
 */
const LADDER: Record<GoalMetric, number[]> = {
  csPerMin: [5.4, 5.7, 6.0, 6.3, 6.6, 6.9, 7.2, 7.6],
  visionPerMin: [0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.2],
  deathsPer10: [2.2, 2.0, 1.9, 1.8, 1.7, 1.6, 1.5, 1.3],
  kpPct: [41, 43, 44, 45, 46, 47, 48, 49],
}
const JUNGLE_CS = [5.7, 5.9, 6.1, 6.4, 6.6, 6.9, 7.1, 7.3]
const JUNGLE_VISION = [1.2, 1.25, 1.3, 1.4, 1.45, 1.5, 1.6, 1.8]
const SUPPORT_VISION = [1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 3.0]
const SUPPORT_KP = [50, 52, 53, 54, 55, 56, 57, 59]
const JUNGLE_KP_BONUS = 8
/** Mid is the laner reference; top and bot scale by their CS target (bot ×7.5/7). */
const LANER_CS_TARGET = 7.0

const roundTo = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d

/** Typical values by rank for this metric and role; empty when the metric is not scored for the role. */
export function rankBenchmarks(metric: GoalMetric, role: Role): Array<{ tier: RankTier; value: number }> {
  const d = metricInfo(metric).decimals
  let values = LADDER[metric]
  if (metric === 'csPerMin') {
    const t = ROLE_TARGETS[role].csPerMin
    if (t === null) return []
    values = role === 'JUNGLE' ? JUNGLE_CS : values.map((v) => v * (t / LANER_CS_TARGET))
  } else if (metric === 'visionPerMin' && role === 'UTILITY') {
    values = SUPPORT_VISION
  } else if (metric === 'visionPerMin' && role === 'JUNGLE') {
    values = JUNGLE_VISION
  } else if (metric === 'kpPct' && role === 'UTILITY') {
    values = SUPPORT_KP
  } else if (metric === 'kpPct' && role === 'JUNGLE') {
    values = values.map((v) => v + JUNGLE_KP_BONUS)
  }
  return RANK_TIERS.map((tier, i) => ({ tier, value: roundTo(values[i]!, d) }))
}

export type GoalReference = {
  /** Your average with this champion (≥ 3 games) or in this role. */
  you: number | null
  youN: number
  /** Average of the lane opponents you faced in this role. */
  opponents: number | null
  opponentsN: number
  /** Your best game with this champion in this role. */
  best: number | null
  target: number | null
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function goalReference(all: MatchSummary[], championId: number, role: Role, metric: GoalMetric): GoalReference {
  const d = metricInfo(metric).decimals
  const lower = metricInfo(metric).lowerIsBetter
  const champ = championGames(all, championId, role).slice(0, 20)
  const champValues = champ.map((s) => metricsOf(s.me, s.durationSec, s.teamKills)[metric]).filter((v): v is number => v !== null)

  let you: number | null = null
  let youN = 0
  if (champ.length >= FEW_GAMES && champValues.length >= FEW_GAMES) {
    you = roundTo(mean(champValues)!, d)
    youN = champ.length
  } else {
    const base = buildBaseline(all, role, '')
    if (base.n >= BASELINE_MIN_GAMES && base[metric] !== null) {
      you = roundTo(base[metric]!, d)
      youN = base.n
    }
  }

  // Opponents: only metrics derivable from the opponent's line (no enemy team kills → no KP).
  const oppValues =
    metric === 'kpPct'
      ? []
      : all
          .filter((s) => ANALYZABLE_QUEUES.has(s.queueId) && !s.remake && s.me.role === role && s.opponent && s.opponent.role === role)
          .map((s) => metricsOf(s.opponent!, s.durationSec, 0)[metric])
          .filter((v): v is number => v !== null)
  const opponents = oppValues.length ? roundTo(mean(oppValues)!, d) : null

  const best = champValues.length ? roundTo(lower ? Math.min(...champValues) : Math.max(...champValues), d) : null

  const t = ROLE_TARGETS[role]
  const target = metric === 'csPerMin' ? t.csPerMin : metric === 'visionPerMin' ? t.visionPerMin : metric === 'deathsPer10' ? t.deathsPer10Max : t.kpPct

  return { you, youN, opponents, opponentsN: oppValues.length, best, target }
}
