import { colors } from '@/theme/tokens'
import { FEW_GAMES, ROLE_LABEL, scoreOn10, type AreaSubrowStat, type PerformanceProfile, type Streak } from '@lpp/shared'

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
  if (!p.strongestRole) return 'Roles are ranked from 3 games each.'
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

/** Under 3 games the engine's headline is the "load more" sentence (spec 2.8); otherwise nothing. */
export function fewGamesNote(p: PerformanceProfile): string | null {
  return p.games > 0 && p.games < FEW_GAMES ? p.headline : null
}

/** A 0–100 score on the 10 ladder ("4.7"); "—" when missing. */
export function on10(score: number | null): string {
  return score === null ? '—' : scoreOn10(score).toFixed(1)
}

/** "−0.4": the average against the previous window of the same size, on the 10 ladder. */
export function previousDelta(p: PerformanceProfile): string | null {
  if (p.avgScore === null || p.previousAvgScore === null) return null
  const d = Math.round(p.avgScore - p.previousAvgScore) / 10
  return `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toFixed(1)}`
}

/** "3 / 20": games in the window that reached the on-target score. */
export function onTargetLabel(p: PerformanceProfile): string {
  return p.games === 0 ? '—' : `${p.onTargetGames} / ${p.games}`
}

/** The window the tab is built on (owner: the last 20 games). The auto-load fetches twice that for "vs previous". */
export const WINDOW = 20

export type LoadState = 'loading' | 'empty' | 'ready' | 'short'

/**
 * What the screen shows: nothing but a loading line until the window is
 * cached (or the auto-load gave up), the cards when it is, and the cards
 * with a warning when a run ended before completing the window.
 */
export function loadState(s: { idsPending: boolean; total: number; loadedInWindow: number; running: boolean; attempted: boolean }): LoadState {
  if (s.idsPending) return 'loading'
  if (s.total === 0) return 'empty'
  if (s.loadedInWindow >= Math.min(WINDOW, s.total)) return 'ready'
  if (s.running || !s.attempted) return 'loading'
  return 'short'
}
