/** Score curves (spec 2.2). Every function returns an integer 0–100 or null when the input is missing. */
import type { DiffCurve } from './targets'

export type Rating = 'Poor' | 'Fair' | 'Good' | 'Great'

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/**
 * ratio = value / target (or target / value for lower-is-better):
 * 0.5 → 0, 1.0 → 70, 1.3 → 100, linear between, clamped.
 */
export function scoreRatio(value: number | null, target: number | null, mode: 'higher' | 'lower'): number | null {
  if (value === null || target === null || target <= 0 || value < 0) return null
  let ratio: number
  if (mode === 'higher') ratio = value / target
  else ratio = value === 0 ? Infinity : target / value
  return clamp(curve(ratio))
}

function curve(ratio: number): number {
  if (ratio <= 0.5) return 0
  if (ratio <= 1) return ((ratio - 0.5) / 0.5) * 70
  if (ratio >= 1.3) return 100
  return 70 + ((ratio - 1) / 0.3) * 30
}

/** me − opponent difference: floor → 0, mid → 60, ceil → 100, linear between, clamped. */
export function scoreDiff(diff: number | null, c: DiffCurve): number | null {
  if (diff === null || !Number.isFinite(diff)) return null
  if (diff <= c.floor) return 0
  if (diff >= c.ceil) return 100
  if (diff <= c.mid) return clamp(((diff - c.floor) / (c.mid - c.floor)) * 60)
  return clamp(60 + ((diff - c.mid) / (c.ceil - c.mid)) * 40)
}

export function rating(score: number): Rating {
  if (score < 40) return 'Poor'
  if (score < 60) return 'Fair'
  if (score < 80) return 'Good'
  return 'Great'
}

/** Weighted mean of the non-null scores (weights renormalize); null when nothing is scored. */
export function weightedMean(entries: Array<{ score: number | null; weight: number }>): number | null {
  let sum = 0
  let total = 0
  for (const e of entries) {
    if (e.score === null || e.weight <= 0) continue
    sum += e.score * e.weight
    total += e.weight
  }
  return total === 0 ? null : Math.round(sum / total)
}
