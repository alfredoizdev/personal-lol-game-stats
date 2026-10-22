/**
 * Personal goal: one measurable metric for the next game (Phase 5 spec 2.4–2.6, 5.1).
 * Defaults come from the player's own averages; status copy is neutral, never advice.
 */
import type { MatchSummary, Role } from '../match-v5'
import type { LiveSnapshotV2 } from '../live'
import { buildBaseline, BASELINE_MIN_GAMES } from '../analysis/baseline'
import { metricsOf } from '../analysis/metrics'
import { ROLE_TARGETS } from '../analysis/targets'
import { championGames, FEW_GAMES } from './history'

export type GoalMetric = 'csPerMin' | 'visionPerMin' | 'deathsPer10' | 'kpPct'

export const GOAL_METRICS: ReadonlyArray<{ key: GoalMetric; label: string; unit: string; step: number; decimals: number; lowerIsBetter: boolean }> = [
  { key: 'csPerMin', label: 'CS / min', unit: ' CS/min', step: 0.1, decimals: 1, lowerIsBetter: false },
  { key: 'visionPerMin', label: 'Vision score / min', unit: ' vision score/min', step: 0.05, decimals: 2, lowerIsBetter: false },
  { key: 'deathsPer10', label: 'Deaths per 10 min', unit: ' deaths per 10 min', step: 0.1, decimals: 1, lowerIsBetter: true },
  { key: 'kpPct', label: 'Kill participation', unit: '%', step: 1, decimals: 0, lowerIsBetter: false },
]

export const metricInfo = (key: GoalMetric) => GOAL_METRICS.find((m) => m.key === key)!

export type Goal = { puuid: string; championId: number; role: Role; metric: GoalMetric; target: number; setAt: string }

export type DefaultGoal = { metric: GoalMetric; target: number | null; source: 'champion' | 'role' | 'target' | 'none'; n: number }

const WINDOW = 20
const roundTo = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

function roleTarget(role: Role, metric: GoalMetric): number | null {
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

/** Champion+role average over the newest 20 games (≥ 3) → role average (≥ 3) → role target. */
export function defaultGoal(all: MatchSummary[], championId: number, role: Role, metric: GoalMetric = role === 'UTILITY' ? 'visionPerMin' : 'csPerMin'): DefaultGoal {
  const d = metricInfo(metric).decimals
  const games = championGames(all, championId, role).slice(0, WINDOW)
  const values = games.map((s) => metricsOf(s.me, s.durationSec, s.teamKills)[metric]).filter((v): v is number => v !== null)
  if (games.length >= FEW_GAMES && values.length >= FEW_GAMES) {
    return { metric, target: roundTo(mean(values)!, d), source: 'champion', n: games.length }
  }
  const base = buildBaseline(all, role, '')
  const fromRole = base[metric]
  if (base.n >= BASELINE_MIN_GAMES && fromRole !== null) return { metric, target: roundTo(fromRole, d), source: 'role', n: base.n }
  const t = roleTarget(role, metric)
  return t === null ? { metric, target: null, source: 'none', n: 0 } : { metric, target: t, source: 'target', n: 0 }
}

/** The goal in force: newest exact champion row, else newest row for the role; optionally only rows set at or before `beforeMs`. */
export function goalFor(goals: Goal[], puuid: string, championId: number | null, role: Role, beforeMs?: number): Goal | null {
  const eligible = goals
    .filter((g) => g.puuid === puuid && g.role === role && (beforeMs === undefined || Date.parse(g.setAt) <= beforeMs))
    .sort((a, b) => Date.parse(b.setAt) - Date.parse(a.setAt))
  return (championId !== null ? eligible.find((g) => g.championId === championId) : undefined) ?? eligible[0] ?? null
}

const MIN_SEC = 60

/** The four goal metrics from a live snapshot; null when not measurable yet. */
export function liveMetrics(s: LiveSnapshotV2): Record<GoalMetric, number | null> {
  const t = s.gameTimeSeconds
  if (t === null || t < MIN_SEC) return { csPerMin: null, kpPct: null, deathsPer10: null, visionPerMin: null }
  const minutes = t / 60
  const { kills, assists, deaths, wardScore } = s.me
  return {
    csPerMin: s.me.csPerMin,
    kpPct: s.teamKills !== null && s.teamKills > 0 && kills !== null && assists !== null ? Math.round(((kills + assists) / s.teamKills) * 100) : null,
    deathsPer10: deaths === null ? null : roundTo(deaths / (t / 600), 2),
    visionPerMin: wardScore === null ? null : roundTo(wardScore / minutes, 2),
  }
}

export function goalMet(goal: Pick<Goal, 'metric' | 'target'>, value: number | null): boolean | null {
  if (value === null) return null
  return metricInfo(goal.metric).lowerIsBetter ? value <= goal.target : value >= goal.target
}

export function goalStatus(goal: Pick<Goal, 'metric' | 'target'>, value: number | null): 'on_track' | 'below' | 'unknown' {
  const met = goalMet(goal, value)
  return met === null ? 'unknown' : met ? 'on_track' : 'below'
}

export function formatGoal(goal: Pick<Goal, 'metric' | 'target'>): string {
  const m = metricInfo(goal.metric)
  const v = goal.target.toFixed(m.decimals)
  switch (goal.metric) {
    case 'csPerMin':
      return `${v} CS/min`
    case 'visionPerMin':
      return `${v} vision score/min`
    case 'deathsPer10':
      return `≤ ${v} deaths per 10 min`
    case 'kpPct':
      return `${v}% kill participation`
  }
}
