import type { MatchSummary } from '@lpp/shared'

export type MatchResult = 'win' | 'loss' | 'remake'

/** The letter shown in the result badge on a champion portrait. */
export function resultLetter(result: MatchResult): 'V' | 'D' | 'R' {
  if (result === 'win') return 'V'
  if (result === 'loss') return 'D'
  return 'R'
}

export function resultOf(s: MatchSummary): MatchResult {
  if (s.remake) return 'remake'
  return s.me.win ? 'win' : 'loss'
}
