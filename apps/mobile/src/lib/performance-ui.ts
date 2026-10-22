import { colors } from '@/theme/tokens'
import { ROLE_LABEL, type AreaSubrowStat, type PerformanceProfile, type Streak } from '@lpp/shared'

/** Copy and geometry for the Performance tab; pure so it is testable. */

export function recordLabel(p: PerformanceProfile): string {
  if (p.games === 0) return 'No games yet'
  return `${p.wins}W – ${p.games - p.wins}L · ${p.winRate}% win rate`
}

export function streakLabel(s: Streak): string | null {
  return s ? `${s.n}-game ${s.kind} streak` : null
}

/** "Last 20 games" — or the honest count when fewer are loaded than the period asks for. */
export function gamesNote(p: PerformanceProfile): string {
  return p.games < p.period ? `Your ${p.games} loaded game${p.games === 1 ? '' : 's'}` : `Last ${p.games} games`
}

/** Bar height for a 0–100 score: 0 when unscored, otherwise at least 2 px so a bad game is still visible. */
export function barHeight(score: number | null, max: number): number {
  if (score === null) return 0
  return Math.max(2, Math.round((max * score) / 100))
}

/** Footer of the Roles card: only what the engine ranked (≥ 3 games per role). */
export function roleRankNote(p: PerformanceProfile): string {
  if (!p.strongestRole) return 'Play 3 games in a role to rank it.'
  const parts = [`Strongest: ${ROLE_LABEL[p.strongestRole]}`]
  if (p.weakestRole) parts.push(`Weakest: ${ROLE_LABEL[p.weakestRole]}`)
  return parts.join(' · ')
}

/** "CS / min 6.4 · target 7.0" — the average of a scored sub-row next to the (mean) role target. */
export function subrowLine(s: AreaSubrowStat): string {
  if (s.avg === null) return `${s.label} —`
  const fmt = (n: number) => `${n.toFixed(s.decimals)}${s.suffix}`
  return s.target === null ? `${s.label} ${fmt(s.avg)}` : `${s.label} ${fmt(s.avg)} · target ${fmt(s.target)}`
}

export function winRateColor(winRate: number): string {
  return winRate >= 50 ? colors.win : colors.loss
}
