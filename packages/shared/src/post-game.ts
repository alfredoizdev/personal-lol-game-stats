/**
 * The "Match ended" screen's numbers (owner, 2026-10-31: "no solamente si
 * cumpliste el goal, también los stats que hiciste bien"): the four scored
 * metrics from the final live snapshot, each against the typical value for the
 * player's rank tier, with a verdict. The 1–10 score and the damage total need
 * Riot's match data and come with the review a minute or two later. Pure.
 */
import type { LiveSnapshotV2 } from './live'
import { liveMetrics, metricInfo, type GoalMetric } from './prematch/goal'
import { rankBenchmarks, type RankTier } from './prematch/reference'

export type PostGameVerdict = 'above' | 'even' | 'below'
export type PostGameNumber = { metric: GoalMetric; label: string; value: string; typical: string; verdict: PostGameVerdict }

const show = (metric: GoalMetric, v: number, decimals: number) => `${v.toFixed(decimals)}${metric === 'kpPct' ? '%' : ''}`
const roundTo = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d
/** Reading order: farm, fights, deaths, vision. */
const ORDER: GoalMetric[] = ['csPerMin', 'kpPct', 'deathsPer10', 'visionPerMin']

export function postGameNumbers(snapshot: LiveSnapshotV2, tier: RankTier): PostGameNumber[] {
  const role = snapshot.me.position
  if (!role) return []
  const values = liveMetrics(snapshot)
  const rows: PostGameNumber[] = []
  for (const metric of ORDER) {
    const value = values[metric]
    if (value === null) continue
    const typical = rankBenchmarks(metric, role).find((b) => b.tier === tier)?.value
    if (typical === undefined) continue
    const { decimals, lowerIsBetter } = metricInfo(metric)
    const v = roundTo(value, decimals)
    const verdict: PostGameVerdict = v === typical ? 'even' : (v > typical) !== lowerIsBetter ? 'above' : 'below'
    rows.push({ metric, label: metricInfo(metric).label, value: show(metric, v, decimals), typical: show(metric, typical, decimals), verdict })
  }
  return rows
}
