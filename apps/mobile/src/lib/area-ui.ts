import { BASELINE_MIN_GAMES, type AreaKey, type MatchAnalysis, type Rating, type Subrow } from '@lpp/shared'
import { colors } from '@/theme/tokens'

export function ratingColor(r: Rating | null): string {
  switch (r) {
    case 'Poor':
      return colors.loss
    case 'Fair':
      return colors.warn
    case 'Good':
      return colors.accent
    case 'Great':
      return colors.win
    default:
      return colors.muted
  }
}

/** Fill fraction of a sub-row bar: score/100; context rows and unscored rows have no bar. */
export function barFraction(subrow: Subrow): number {
  if (subrow.context || subrow.score === null) return 0
  return subrow.score / 100
}

const trim = (s: string) => s.replace(/\.?0+$/, '')

/**
 * "+0.5 CS/min vs opponent", "−12 vs you (14 games)". Null when there is no delta;
 * "few games" when the own-average sample is too small.
 */
export function deltaLabel(d: number | null, unit: string, who: 'opponent' | 'you', n?: number): string | null {
  if (who === 'you' && n !== undefined && n < BASELINE_MIN_GAMES) return 'few games'
  if (d === null) return null
  const abs = Math.abs(d)
  const num = Number.isInteger(abs) ? String(abs) : trim(abs.toFixed(2))
  const sign = d > 0 ? '+' : d < 0 ? '−' : '±'
  const tail = who === 'you' && n !== undefined ? ` (${n} games)` : ''
  return `${sign}${num}${unit} vs ${who}${tail}`
}

/** Which area card opens first: the weakest, else the first scored one. */
export function defaultArea(a: MatchAnalysis): AreaKey | null {
  if (!a.analyzable) return null
  if (a.weakest) return a.weakest
  return a.areas.find((x) => x.score !== null)?.key ?? null
}

/** Unit suffix for a sub-row's delta labels. */
export function unitFor(key: string): string {
  switch (key) {
    case 'total':
    case 'lane':
    case 'mid':
    case 'late':
      return ' CS/min'
    case 'kp':
      return '%'
    case 'cs':
      return ' CS'
    case 'gold':
      return ' gold'
    case 'xp':
      return ' XP'
    default:
      return ''
  }
}
