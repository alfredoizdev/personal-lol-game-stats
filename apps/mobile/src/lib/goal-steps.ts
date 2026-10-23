import { metricInfo, type GoalMetric } from '@lpp/shared'

/** One stepper tap: ± the metric's own increment, rounded to its decimals, clamped to [0, 100 for %]. */
export function stepTarget(metric: GoalMetric, target: number, dir: 1 | -1): number {
  const m = metricInfo(metric)
  const next = Math.round((target + dir * m.step) * 10 ** m.decimals) / 10 ** m.decimals
  const max = metric === 'kpPct' ? 100 : Number.POSITIVE_INFINITY
  return Math.min(max, Math.max(0, next))
}
