/**
 * "Your goal, week by week" (owner, 2026-10-29): the Performance tab follows the
 * one metric the player set as a goal across the last weeks, so a goal is
 * something measured over time, not only judged game by game. The metric and
 * target are the goal in force today for the player's main role; every week is
 * judged against that same target so the weeks compare.
 */
import type { MatchSummary, Role } from '../match-v5'
import { metricsOf } from '../analysis/metrics'
import { ANALYZABLE_QUEUES } from '../analysis/targets'
import { defaultGoal, goalFor, goalMet, metricInfo, type GoalMetric, type StoredGoal } from '../prematch/goal'

export const GOAL_PROGRESS_WEEKS = 8
const WEEK_MS = 7 * 86_400_000

export type GoalWeek = { weeksAgo: number; games: number; avg: number | null; met: number }
export type GoalProgress = {
  metric: GoalMetric
  label: string
  target: number
  targetSource: 'set' | 'recommended'
  role: Role
  decimals: number
  lowerIsBetter: boolean
  /** Oldest to newest is weeks[WEEKS-1] … weeks[0]; weeks without a game carry avg null. */
  weeks: GoalWeek[]
  /** The oldest and the newest week that have games. */
  first: { weeksAgo: number; avg: number }
  last: { weeksAgo: number; avg: number }
  /** 'up' is better (for a lower-is-better goal that means the number went down). */
  trend: 'up' | 'down' | 'flat'
}

const roundTo = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d

const ROLE_ORDER: Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

/** The role played most inside the window (not over all 100 games: a player who switched lanes this month is judged on this month's lane). */
function windowRole(games: MatchSummary[]): Role | null {
  const count = new Map<Role, number>()
  for (const s of games) if (s.me.role) count.set(s.me.role, (count.get(s.me.role) ?? 0) + 1)
  let best: Role | null = null
  for (const role of ROLE_ORDER) {
    const c = count.get(role) ?? 0
    if (c > 0 && (best === null || c > count.get(best)!)) best = role
  }
  return best
}

export function goalProgress(all: MatchSummary[], goals: StoredGoal[], puuid: string, nowMs: number): GoalProgress | null {
  const inWindow = all.filter((s) => {
    if (!ANALYZABLE_QUEUES.has(s.queueId) || s.remake) return false
    const age = nowMs - Date.parse(s.startedAt)
    return age >= 0 && age < GOAL_PROGRESS_WEEKS * WEEK_MS
  })
  const role = windowRole(inWindow)
  if (role === null) return null
  // No saved goal: the role's recommended metric and target, exactly what the goal editor shows before anything is saved.
  const saved = goalFor(goals, puuid, null, role, nowMs)
  const recommended = saved ? null : defaultGoal(all, 0, role)
  if (!saved && recommended?.target === null) return null
  const goal: { metric: GoalMetric; target: number } = saved ?? { metric: recommended!.metric, target: recommended!.target! }
  const info = metricInfo(goal.metric)
  const stored = saved ? goals.find((g) => g.puuid === puuid && g.setAt === saved.setAt) : null
  const targetSource: GoalProgress['targetSource'] = !saved || stored?.target === null ? 'recommended' : 'set'
  const buckets: Array<number[]> = Array.from({ length: GOAL_PROGRESS_WEEKS }, () => [])
  const metCount = new Array<number>(GOAL_PROGRESS_WEEKS).fill(0)
  for (const s of inWindow) {
    if (s.me.role !== role) continue
    const w = Math.floor((nowMs - Date.parse(s.startedAt)) / WEEK_MS)
    const value = metricsOf(s.me, s.durationSec, s.teamKills)[goal.metric]
    if (value === null) continue
    buckets[w]!.push(value)
    if (goalMet(goal, value)) metCount[w]! += 1
  }
  const weeks: GoalWeek[] = buckets.map((values, weeksAgo) => ({
    weeksAgo,
    games: values.length,
    avg: values.length ? roundTo(values.reduce((a, b) => a + b, 0) / values.length, info.decimals) : null,
    met: metCount[weeksAgo]!,
  }))
  const withGames = weeks.filter((w) => w.avg !== null)
  if (withGames.length < 2) return null
  const last = withGames[0]!
  const first = withGames[withGames.length - 1]!
  const diff = last.avg! - first.avg!
  const trend = diff === 0 ? 'flat' : (diff > 0) !== info.lowerIsBetter ? 'up' : 'down'
  return {
    metric: goal.metric,
    label: info.label,
    target: goal.target,
    targetSource,
    role,
    decimals: info.decimals,
    lowerIsBetter: info.lowerIsBetter,
    weeks,
    first: { weeksAgo: first.weeksAgo, avg: first.avg! },
    last: { weeksAgo: last.weeksAgo, avg: last.avg! },
    trend,
  }
}
