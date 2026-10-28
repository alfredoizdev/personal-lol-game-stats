/**
 * "You vs <tier>" (owner, 2026-10-27: "tampoco hay comparativas"): the player's
 * averages in one role next to the typical value for their Solo/Duo tier from
 * the per-rank ladder in prematch/reference (community estimates, labelled so).
 * Pure; the UI picks the role (the most played one) and the tier (league-v4).
 */
import type { MatchSummary, Role } from '../match-v5'
import { metricsOf } from '../analysis/metrics'
import { ANALYZABLE_QUEUES } from '../analysis/targets'
import { metricInfo, type GoalMetric } from '../prematch/goal'
import { rankBenchmarks, type RankTier } from '../prematch/reference'

export type CompareRow = {
  metric: GoalMetric
  label: string
  /** Your average in the role over the window; null without a game. */
  you: number | null
  /** The ladder's typical value for the tier. */
  bench: number
  /** you − bench, in the metric's decimals; null without data. */
  delta: number | null
  /** true when you are ahead of the tier, false behind, null without data or when level. */
  better: boolean | null
  n: number
  decimals: number
  suffix: string
  lowerIsBetter: boolean
}

const ROLE_ORDER: Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
/** Card order: farm, fights, deaths, vision. */
const METRICS: GoalMetric[] = ['csPerMin', 'kpPct', 'deathsPer10', 'visionPerMin']
const FALLBACK_TIER: RankTier = 'Gold'
const roundTo = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

const analyzable = (s: MatchSummary) => ANALYZABLE_QUEUES.has(s.queueId) && !s.remake

/** The role with the most analyzable games (ties → lane order). */
export function mainRole(all: MatchSummary[]): Role | null {
  const count = new Map<Role, number>()
  for (const s of all) if (analyzable(s) && s.me.role) count.set(s.me.role, (count.get(s.me.role) ?? 0) + 1)
  let best: Role | null = null
  for (const role of ROLE_ORDER) {
    const c = count.get(role) ?? 0
    if (c > 0 && (best === null || c > count.get(best)!)) best = role
  }
  return best
}

export function tierComparison(all: MatchSummary[], tier: RankTier | null, role: Role): CompareRow[] {
  const games = all.filter((s) => analyzable(s) && s.me.role === role)
  const t = tier ?? FALLBACK_TIER
  const rows: CompareRow[] = []
  for (const key of METRICS) {
    const m = metricInfo(key)
    const ladder = rankBenchmarks(m.key, role)
    const bench = ladder.find((b) => b.tier === t)?.value
    if (bench === undefined) continue // not scored for the role (support CS)
    const values = games.map((s) => metricsOf(s.me, s.durationSec, s.teamKills)[m.key]).filter((v): v is number => v !== null)
    const avg = mean(values)
    const you = avg === null ? null : roundTo(avg, m.decimals)
    const delta = you === null ? null : roundTo(you - bench, m.decimals)
    const better = delta === null || delta === 0 ? null : m.lowerIsBetter ? delta < 0 : delta > 0
    rows.push({ metric: m.key, label: m.label, you, bench, delta, better, n: values.length, decimals: m.decimals, suffix: m.key === 'kpPct' ? '%' : '', lowerIsBetter: m.lowerIsBetter })
  }
  return rows
}

/** The metric where the tier is furthest ahead of you, relative to the bench; null when you trail nowhere. */
export function weakestRow(rows: CompareRow[]): GoalMetric | null {
  let worst: { metric: GoalMetric; gap: number } | null = null
  for (const r of rows) {
    if (r.better !== false || r.delta === null || r.bench === 0) continue
    const gap = Math.abs(r.delta) / r.bench
    if (!worst || gap > worst.gap) worst = { metric: r.metric, gap }
  }
  return worst?.metric ?? null
}
