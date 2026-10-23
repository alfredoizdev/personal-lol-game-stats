import { analyzeMatch, performanceTier, TIER_LABELS, tierBucket, type MatchSummary, type PerformanceTier, type TierBucket } from '@lpp/shared'
import { colors } from '@/theme/tokens'

export type QuickRating = { score: number; tier: PerformanceTier; label: string; bucket: TierBucket }

/**
 * The match rating shown on a list row: the explainable overall score computed
 * from the match data alone (no timeline, no baseline), so it costs nothing and
 * needs no extra Riot call. The review recomputes with the timeline, so its
 * score can differ by a few points; the tier name is the same ladder.
 */
export function quickRating(summary: MatchSummary): QuickRating | null {
  const a = analyzeMatch({ summary, series: null, baseline: null })
  if (!a.analyzable || a.overall === null) return null
  const tier = performanceTier(a.overall)
  return { score: a.overall, tier, label: TIER_LABELS[tier], bucket: tierBucket(tier) }
}

export function tierColor(bucket: TierBucket): string {
  switch (bucket) {
    case 'legendary':
      return colors.win
    case 'great':
      return colors.you
    case 'solid':
      return colors.accent
    case 'stable':
      return colors.warn
    default:
      return colors.loss
  }
}
