import { colors } from '@/theme/tokens'
import { ROLE_LABEL, type CompareRow, type GoalMetric, type GoalProgress, type GoalWeek, type PerformanceProfile, type RecentSnapshot, type Role } from '@lpp/shared'

/** Copy and state for the Performance tab (op.gg-style since 2026-10-27); pure so it is testable. */

/** "Last 98 games": the analyzable games behind the numbers (ARAM and remakes drop out; an incomplete load is flagged by the screen, not here). */
export function gamesNote(p: PerformanceProfile): string {
  return p.games === 1 ? 'Last game' : `Last ${p.games} games`
}

export function winRateColor(winRate: number): string {
  return winRate >= 50 ? colors.win : colors.loss
}

/** "12 wins · 8 losses": the plain record under the win-rate arc (owner, 2026-10-27: every number says what it is, once). */
export function recordLine(s: Pick<RecentSnapshot, 'games' | 'wins' | 'losses' | 'winRate'>): string {
  if (s.games === 0 || s.winRate === null) return 'No games yet'
  return `${s.wins} win${s.wins === 1 ? '' : 's'} · ${s.losses} loss${s.losses === 1 ? '' : 'es'}`
}

/** "Mostly Jungle · 10 of 20 games"; the role alone when it is every game. */
export function mainRoleLine(main: { role: Role; pct: number } | null, games: number): string | null {
  if (!main || games === 0) return null
  const n = Math.round((main.pct / 100) * games)
  const name = ROLE_LABEL[main.role]
  return `${main.pct >= 100 ? name : `Mostly ${name}`} · ${n} of ${games} game${games === 1 ? '' : 's'}`
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

const GOAL_UNIT: Record<GoalMetric, string> = { csPerMin: ' CS/min', visionPerMin: ' vision score/min', deathsPer10: ' deaths per 10 min', kpPct: '% kill participation' }
const fmtGoal = (p: Pick<GoalProgress, 'metric' | 'decimals'>, v: number) => (p.metric === 'kpPct' ? `${v.toFixed(0)}%` : v.toFixed(p.decimals))

/** "5.1 → 6.1 CS/min over 3 weeks" and the trend word in its colour (up is always the good direction). */
export function goalTrendLine(p: Pick<GoalProgress, 'metric' | 'decimals' | 'first' | 'last' | 'trend'> & Partial<GoalProgress>): { text: string; word: string; color: string } {
  const weeks = p.first.weeksAgo - p.last.weeksAgo + 1
  const unit = p.metric === 'kpPct' ? ' kill participation' : GOAL_UNIT[p.metric]
  const text = `${fmtGoal(p, p.first.avg)} → ${fmtGoal(p, p.last.avg)}${unit} over ${weeks} weeks`
  const word = p.trend === 'up' ? 'improving' : p.trend === 'down' ? 'slipping' : 'steady'
  const color = p.trend === 'up' ? colors.win : p.trend === 'down' ? colors.loss : colors.muted
  return { text, word, color }
}

/** How the current week stands against the target. */
export function goalMetLine(week: GoalWeek): string {
  if (week.games === 0) return 'No games yet this week'
  return `Met in ${week.met} of ${week.games} game${week.games === 1 ? '' : 's'} this week`
}

/** "Target 6.0 CS/min · as Mid", or "recommended for Mid" when the player left the number to the role. */
export function goalTargetLine(p: Pick<GoalProgress, 'metric' | 'decimals' | 'target' | 'targetSource' | 'role'>): string {
  const target = p.metric === 'kpPct' ? `${p.target.toFixed(0)}%` : `${p.target.toFixed(p.decimals)}${GOAL_UNIT[p.metric]}`
  return `Target ${target} · ${p.targetSource === 'recommended' ? 'recommended for' : 'as'} ${ROLE_LABEL[p.role]}`
}
