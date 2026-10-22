import { formatGoal, goalMet, metricInfo, type Goal } from '@lpp/shared'

/** The review's verdict on a goal: the goal, what you did, met / missed / not measurable. Never changes a score. */
export function goalLine(goal: Pick<Goal, 'metric' | 'target'>, value: number | null): { text: string; met: boolean | null } {
  const met = goalMet(goal, value)
  const head = `Your goal: ${formatGoal(goal)} → `
  if (value === null || met === null) return { text: `${head}not measurable this game`, met: null }
  const m = metricInfo(goal.metric)
  const did = `${value.toFixed(m.decimals)}${goal.metric === 'kpPct' ? '%' : ''}`
  return { text: `${head}you did ${did} (${met ? 'met' : 'missed'})`, met }
}
