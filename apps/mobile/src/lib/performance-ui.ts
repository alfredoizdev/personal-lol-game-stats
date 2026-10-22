import type { Period, PerformanceProfile, Streak } from '@lpp/shared'

/** Copy and geometry for the Performance tab; pure so it is testable. */

export function periodLabel(p: Period): string {
  return p === 100 ? 'All loaded' : `Last ${p}`
}

export function recordLabel(p: PerformanceProfile): string {
  if (p.games === 0) return 'No games yet'
  return `${p.wins}W – ${p.games - p.wins}L · ${p.winRate}% win rate`
}

export function streakLabel(s: Streak): string | null {
  return s ? `${s.n}-game ${s.kind} streak` : null
}

/** "Over your last 20 games" — or the honest count when fewer are loaded than the period asks for. */
export function gamesNote(p: PerformanceProfile): string {
  return p.games < p.period ? `Over your ${p.games} loaded games` : `Over your last ${p.games} games`
}

/** Bar height for a 0–100 score: 0 when unscored, otherwise at least 2 px so a bad game is still visible. */
export function barHeight(score: number | null, max: number): number {
  if (score === null) return 0
  return Math.max(2, Math.round((max * score) / 100))
}
