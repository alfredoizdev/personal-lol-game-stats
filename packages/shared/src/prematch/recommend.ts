/**
 * Role-aware goal recommendation (owner, 2026-10-26: "los goals deberían cambiar
 * según el rol"). "Recommended" is the metric where the player is furthest
 * below the role target over their last games in that role; with too few games,
 * or nothing below target, the role's own first metric. Save materialises one
 * row per role so Live, the review and the desktop push resolve the same goal
 * without needing the match history. Pure: no I/O.
 */
import type { MatchSummary, Role } from '../match-v5'
import { buildBaseline, BASELINE_MIN_GAMES } from '../analysis/baseline'
import { ROLE_TARGETS } from '../analysis/targets'
import { defaultMetricFor, GOAL_METRICS, metricInfo, type GoalMetric, type StoredGoal } from './goal'

export const ROLES: readonly Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

export type RecommendedGoal = {
  metric: GoalMetric
  target: number
  /** 'weakest': the metric furthest below target in your games as that role; 'role': the role's first metric. */
  reason: 'weakest' | 'role'
  /** Your average for that metric in the role (newest 20 games), when there are enough games. */
  average: number | null
  n: number
}

export function roleTargetFor(role: Role, metric: GoalMetric): number | null {
  const t = ROLE_TARGETS[role]
  switch (metric) {
    case 'csPerMin':
      return t.csPerMin
    case 'visionPerMin':
      return t.visionPerMin
    case 'deathsPer10':
      return t.deathsPer10Max
    case 'kpPct':
      return t.kpPct
  }
}

const roundTo = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d

/** How far below target, as a fraction of the target; 0 or negative = on target. */
function shortfall(metric: GoalMetric, average: number, target: number): number {
  return metricInfo(metric).lowerIsBetter ? (average - target) / target : (target - average) / target
}

export function recommendedGoal(all: MatchSummary[], role: Role): RecommendedGoal {
  const base = buildBaseline(all, role, '')
  const fallbackMetric = defaultMetricFor(role)
  const fallback = (): RecommendedGoal => {
    const avg = base[fallbackMetric]
    return { metric: fallbackMetric, target: roleTargetFor(role, fallbackMetric)!, reason: 'role', average: base.n >= BASELINE_MIN_GAMES && avg !== null ? roundTo(avg, metricInfo(fallbackMetric).decimals) : null, n: base.n }
  }
  if (base.n < BASELINE_MIN_GAMES) return fallback()
  let best: { metric: GoalMetric; target: number; average: number; gap: number } | null = null
  for (const m of GOAL_METRICS) {
    const target = roleTargetFor(role, m.key)
    const average = base[m.key]
    if (target === null || average === null) continue
    const gap = shortfall(m.key, average, target)
    if (gap > 0 && (best === null || gap > best.gap)) best = { metric: m.key, target, average, gap }
  }
  if (!best) return fallback()
  return { metric: best.metric, target: best.target, reason: 'weakest', average: roundTo(best.average, metricInfo(best.metric).decimals), n: base.n }
}

export type RoleGoalRow = Pick<StoredGoal, 'championId' | 'role' | 'metric' | 'target'> & { role: Role; target: number }

/**
 * One row per role for what the editor saved (owner, 2026-10-27: the player picks
 * the metric; the number follows the role). `target` null = the metric at each
 * role's own target; a number = that number for every role. Roles where the
 * metric is not scored (CS for support) get their recommended goal instead.
 */
export function roleGoalRows(all: MatchSummary[], standing: { metric: GoalMetric; target: number | null }): RoleGoalRow[] {
  return ROLES.map((role) => {
    const roleTarget = roleTargetFor(role, standing.metric)
    if (roleTarget !== null) return { championId: 0, role, metric: standing.metric, target: standing.target ?? roleTarget }
    const r = recommendedGoal(all, role)
    return { championId: 0, role, metric: r.metric, target: r.target }
  })
}
