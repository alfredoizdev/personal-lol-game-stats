/**
 * Goal push timing and copy (Phase 7 spec 2.4). Pure: the desktop feeds it
 * one live snapshot at a time and sends whatever comes back as `due`.
 * Every string here is status only — the player's own numbers against the
 * goal they set — never an instruction.
 */
import { formatGoal, goalMet, goalStatus, liveMetrics, metricInfo, type Goal } from '../prematch/goal'
import type { LiveSnapshotV2 } from '../live'

export type GoalPushMode = 'change' | 'interval'
export type GoalStatus = ReturnType<typeof goalStatus>

/** No status message before this much game time (rates are noise earlier). */
export const PUSH_MIN_GAME_SEC = 60
/** Minimum game time between two status messages. */
export const PUSH_MIN_GAP_SEC = 60
/** `interval` mode: a message at every multiple of this game time. */
export const PUSH_INTERVAL_SEC = 300

export type NotifierState = {
  lastStatus: GoalStatus | null
  lastSentGameSec: number | null
  lastIntervalMark: number | null
  finalSent: boolean
}

export const initialNotifierState: NotifierState = { lastStatus: null, lastSentGameSec: null, lastIntervalMark: null, finalSent: false }

export type Due = { title: 'LanePulse'; body: string; kind: 'status' | 'final' } | null

const STATUS_WORD: Record<Exclude<GoalStatus, 'unknown'>, string> = { on_track: 'On track', below: 'Below goal' }

function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** The value as the player reads it: metric precision, "%" for kill participation. */
function shortValue(goal: Pick<Goal, 'metric'>, value: number): string {
  const m = metricInfo(goal.metric)
  return `${value.toFixed(m.decimals)}${goal.metric === 'kpPct' ? '%' : ''}`
}

export function statusBody(gameSec: number, goal: Pick<Goal, 'metric' | 'target'>, status: Exclude<GoalStatus, 'unknown'>, value: number): string {
  return `${clock(gameSec)} · Goal ${formatGoal(goal)} · ${STATUS_WORD[status]}, now ${shortValue(goal, value)}`
}

export function finalBody(goal: Pick<Goal, 'metric' | 'target'>, met: boolean, value: number): string {
  const m = metricInfo(goal.metric)
  return `Game over · Goal ${met ? 'met' : 'missed'} · ${value.toFixed(m.decimals)}${m.unit}`
}

/**
 * Decides whether a notification is due for this snapshot. `ended` = the game
 * is over: one final message, exempt from the gap, then silence.
 */
export function nextNotification(
  state: NotifierState,
  input: { goal: Goal; snapshot: LiveSnapshotV2; mode: GoalPushMode; ended: boolean },
): { state: NotifierState; due: Due } {
  const { goal, snapshot, mode, ended } = input
  const value = liveMetrics(snapshot)[goal.metric]

  if (ended) {
    if (state.finalSent) return { state, due: null }
    const met = goalMet(goal, value)
    const next = { ...state, finalSent: true }
    if (met === null || value === null) return { state: next, due: null }
    return { state: next, due: { title: 'LanePulse', body: finalBody(goal, met, value), kind: 'final' } }
  }

  const sec = snapshot.gameTimeSeconds
  if (sec === null || sec < PUSH_MIN_GAME_SEC || value === null) return { state, due: null }
  const status = goalStatus(goal, value)
  if (status === 'unknown') return { state, due: null }

  const changed = state.lastStatus === null || status !== state.lastStatus
  const mark = Math.floor(sec / PUSH_INTERVAL_SEC)
  const intervalDue = mode === 'interval' && mark > 0 && mark !== (state.lastIntervalMark ?? 0)
  if (!changed && !intervalDue) return { state, due: null }

  // Hold (not drop) a due message inside the gap: state is left as is, so it fires once the gap passes.
  if (state.lastSentGameSec !== null && sec - state.lastSentGameSec < PUSH_MIN_GAP_SEC) return { state, due: null }

  return {
    state: { ...state, lastStatus: status, lastSentGameSec: sec, lastIntervalMark: mark },
    due: { title: 'LanePulse', body: statusBody(sec, goal, status, value), kind: 'status' },
  }
}
