/**
 * The ten-step rating ladder the owner liked in RiftLens ("9+ Dominant"),
 * laid over LanePulse's explainable 0–100 match score (docs/ANALYSIS.md).
 * The score is the truth; the tier is a readable name for a range of it.
 */
export type PerformanceTier = '10+' | '9+' | '8+' | '7+' | '6+' | '5+' | '4+' | '3+' | '2+' | '1+'

export function performanceTier(score: number): PerformanceTier {
  if (score >= 95) return '10+'
  if (score >= 85) return '9+'
  if (score >= 75) return '8+'
  if (score >= 65) return '7+'
  if (score >= 55) return '6+'
  if (score >= 45) return '5+'
  if (score >= 35) return '4+'
  if (score >= 25) return '3+'
  if (score >= 15) return '2+'
  return '1+'
}

export const TIER_LABELS: Record<PerformanceTier, string> = {
  '10+': 'Legendary Carry',
  '9+': 'Dominant',
  '8+': 'Strong Game',
  '7+': 'Reliable',
  '6+': 'Average',
  '5+': 'Needs Work',
  '4+': 'Weak',
  '3+': 'Struggling',
  '2+': 'Critical',
  '1+': 'Disaster',
}

/** Colour family for a tier (five buckets so the UI never needs ten colours). */
export type TierBucket = 'legendary' | 'great' | 'solid' | 'stable' | 'rough'

const BUCKETS: Record<PerformanceTier, TierBucket> = {
  '10+': 'legendary',
  '9+': 'legendary',
  '8+': 'great',
  '7+': 'great',
  '6+': 'solid',
  '5+': 'stable',
  '4+': 'stable',
  '3+': 'rough',
  '2+': 'rough',
  '1+': 'rough',
}

export function tierBucket(tier: PerformanceTier): TierBucket {
  return BUCKETS[tier]
}
