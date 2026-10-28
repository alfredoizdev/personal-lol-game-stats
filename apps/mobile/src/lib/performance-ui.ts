import { colors } from '@/theme/tokens'
import type { CompareRow, PerformanceProfile, RecentSnapshot } from '@lpp/shared'

/** Copy and state for the Performance tab (op.gg-style since 2026-10-27); pure so it is testable. */

/** "Last 98 games": the analyzable games behind the numbers (ARAM and remakes drop out; an incomplete load is flagged by the screen, not here). */
export function gamesNote(p: PerformanceProfile): string {
  return p.games === 1 ? 'Last game' : `Last ${p.games} games`
}

export function winRateColor(winRate: number): string {
  return winRate >= 50 ? colors.win : colors.loss
}

/** "12W 8L · 60%" for the recent block. */
export function recordLine(s: Pick<RecentSnapshot, 'games' | 'wins' | 'losses' | 'winRate'>): string {
  if (s.games === 0 || s.winRate === null) return 'No games yet'
  return `${s.wins}W ${s.losses}L · ${s.winRate}%`
}

/** "6.8 / 6.2 / 5.1" and "1.9:1 KDA" (op.gg's two lines); "Perfect KDA" without a death. */
export function kdaLine(s: Pick<RecentSnapshot, 'kills' | 'deaths' | 'assists' | 'kda'>): { kda: string; ratio: string } {
  return { kda: `${s.kills.toFixed(1)} / ${s.deaths.toFixed(1)} / ${s.assists.toFixed(1)}`, ratio: s.kda === null ? 'Perfect KDA' : `${s.kda.toFixed(1)}:1 KDA` }
}

const fmt = (n: number, r: Pick<CompareRow, 'decimals' | 'suffix'>) => `${n.toFixed(r.decimals)}${r.suffix}`

/** Your value and the tier's, in the metric's format; "—" when you have no game in the role. */
export function compareValues(r: CompareRow): { you: string; bench: string } {
  return { you: r.you === null ? '—' : fmt(r.you, r), bench: fmt(r.bench, r) }
}

/** The signed gap to the tier, green when you are ahead (fewer deaths counts as ahead), red behind, grey when level; null without data. */
export function deltaChip(r: CompareRow): { text: string; color: string } | null {
  if (r.delta === null) return null
  const sign = r.delta > 0 ? '+' : r.delta < 0 ? '−' : '±'
  const text = `${sign}${fmt(Math.abs(r.delta), r)}`
  return { text, color: r.better === null ? colors.muted : r.better ? colors.win : colors.loss }
}

/** The window every card is built on (owner, 2026-10-22: the last 100 games, one rule for the whole tab). */
export const WINDOW = 100

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
