import { colors } from '@/theme/tokens'
import { ROLE_LABEL, type CompareRow, type GoalMetric, type GoalProgress, type GoalWeek, type PerformanceProfile, type SessionPatterns } from '@lpp/shared'

/** Copy and state for the Performance tab (one question per screen since 2026-10-30); pure so it is testable. */

/** "Last 98 games": the analyzable games behind the numbers (ARAM and remakes drop out; an incomplete load is flagged by the screen, not here). */
export function gamesNote(p: PerformanceProfile): string {
  return p.games === 1 ? 'Last game' : `Last ${p.games} games`
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

/** A side is flagged as worse only when its win rate trails by this many points: smaller gaps are noise over a few dozen games. */
const WORSE_GAP = 5
function worseSide<A extends string, B extends string>(a: number, b: number, aName: A, bName: B): A | B | null {
  if (b - a >= WORSE_GAP) return aName
  if (a - b >= WORSE_GAP) return bName
  return null
}

/** "12 sessions · 3.2 games each on average · longest 7". */
export function sessionSubtitle(p: Pick<SessionPatterns, 'sessions' | 'avgGames' | 'longest'>): string {
  return `${p.sessions} sessions · ${p.avgGames} game${p.avgGames === 1 ? '' : 's'} each on average · longest ${p.longest}`
}

/** The next game after a loss against the next game after a win; `worse` names the side with the lower win rate. */
export function afterLossLine(p: Pick<SessionPatterns, 'afterLoss' | 'afterWin'>): { loss: string; win: string; worse: 'loss' | 'win' | null; text: string } | null {
  if (!p.afterLoss || !p.afterWin) return null
  const worse = worseSide(p.afterLoss.winRate, p.afterWin.winRate, 'loss', 'win')
  return {
    loss: `${p.afterLoss.winRate}%`,
    win: `${p.afterWin.winRate}%`,
    worse,
    text: `You win ${p.afterLoss.winRate}% of the next game after a loss and ${p.afterWin.winRate}% after a win (${p.afterLoss.n} and ${p.afterWin.n} games)`,
  }
}

/** Games 1–2 of a sitting against the 4th onwards; `worse` names the side with the lower win rate. */
export function deepSessionLine(p: Pick<SessionPatterns, 'early' | 'deep'>): { early: string; earlyLabel: string; deep: string; deepLabel: string; worse: 'early' | 'deep' | null; text: string } | null {
  if (!p.early || !p.deep) return null
  const worse = worseSide(p.early.winRate, p.deep.winRate, 'early', 'deep')
  const d1 = p.deep.deaths.toFixed(1)
  const e1 = p.early.deaths.toFixed(1)
  return {
    early: `${p.early.winRate}%`,
    earlyLabel: `${e1} deaths · games 1–2 of a sitting`,
    deep: `${p.deep.winRate}%`,
    deepLabel: `${d1} deaths · 4th game onwards`,
    worse,
    text: `From your 4th game in a sitting you win ${p.deep.winRate}% with ${d1} deaths per game, against ${p.early.winRate}% and ${e1} in games 1–2 (${p.deep.n} and ${p.early.n} games)`,
  }
}
