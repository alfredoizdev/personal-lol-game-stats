/**
 * The reduced Riot timeline the `match-timeline` Edge Function returns to the
 * phone (~10 KB instead of the 0.5–2 MB raw blob), plus the per-phase and
 * lane-diff math built on it (spec 2.1, 2.4, 2.6).
 */
import { PHASES, PHASE_MIN_SEC, type PhaseKey } from './targets'

/** Arrays indexed by participantId − 1; null = that participant's frame was missing or corrupt. */
export type TimelineFrame = { t: number; cs: Array<number | null>; gold: Array<number | null>; xp: Array<number | null> }

export type TimelineSeries = {
  v: 1
  matchId: string
  /** participantId (1–10) → puuid */
  participants: Array<{ participantId: number; puuid: string }>
  /** One entry per Riot frame, in order. Arrays are indexed by participantId − 1. cs = minions + jungle monsters. */
  frames: TimelineFrame[]
}

export type { PhaseKey }

export type PhaseStat = { key: PhaseKey; label: string; startSec: number; endSec: number; csPerMin: number | null }

type Metric = 'cs' | 'gold' | 'xp'

/** Frame nearest to (and not after) a time, or null. */
export function frameAt(series: TimelineSeries, tSec: number): TimelineFrame | null {
  let found: TimelineFrame | null = null
  for (const f of series.frames) {
    if (f.t <= tSec) found = f
    else break
  }
  return found
}

function valueAt(frame: TimelineFrame | null, participantId: number, metric: Metric): number | null {
  if (!frame) return null
  const v = frame[metric][participantId - 1]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function phaseWindow(phase: PhaseKey, durationSec: number): { startSec: number; endSec: number } | null {
  const def = PHASES.find((p) => p.key === phase)
  if (!def || durationSec < def.startSec + PHASE_MIN_SEC) return null
  return { startSec: def.startSec, endSec: Math.min(def.endSec ?? durationSec, durationSec) }
}

/** CS/min of one participant inside a phase; null when the phase did not happen or frames are missing. */
export function phaseCs(series: TimelineSeries, participantId: number, phase: PhaseKey, durationSec: number): number | null {
  const w = phaseWindow(phase, durationSec)
  if (!w) return null
  const startFrame = frameAt(series, w.startSec)
  const endFrame = frameAt(series, w.endSec)
  const start = valueAt(startFrame, participantId, 'cs')
  const end = valueAt(endFrame, participantId, 'cs')
  if (start === null || end === null || !startFrame || !endFrame) return null
  // Divide by the span the frames actually cover: Riot's last frame may land just past gameDuration.
  const minutes = (endFrame.t - startFrame.t) / 60
  return minutes > 0 ? (end - start) / minutes : null
}

export function phaseStats(series: TimelineSeries, participantId: number, durationSec: number): PhaseStat[] {
  return PHASES.map((p) => ({
    key: p.key,
    label: p.label,
    startSec: p.startSec,
    endSec: Math.min(p.endSec ?? durationSec, durationSec),
    csPerMin: phaseCs(series, participantId, p.key, durationSec),
  }))
}

/** me − opponent at a given minute; null if either frame/participant is missing or the game is shorter. */
export function laneDiffAt(series: TimelineSeries, me: number, opponent: number, minute: 10 | 15, metric: Metric): number | null {
  const t = minute * 60
  const last = series.frames[series.frames.length - 1]
  if (!last || last.t < t) return null
  const frame = frameAt(series, t)
  const a = valueAt(frame, me, metric)
  const b = valueAt(frame, opponent, metric)
  return a === null || b === null ? null : a - b
}

/** Cumulative CS per frame for the chart. */
export function csCurve(series: TimelineSeries, me: number, opponent: number | null): Array<{ t: number; me: number | null; enemy: number | null }> {
  return series.frames.map((f) => ({
    t: f.t,
    me: valueAt(f, me, 'cs'),
    enemy: opponent === null ? null : valueAt(f, opponent, 'cs'),
  }))
}

export function goldDiffCurve(series: TimelineSeries, me: number, opponent: number): Array<{ t: number; diff: number | null }> {
  return series.frames.map((f) => {
    const a = valueAt(f, me, 'gold')
    const b = valueAt(f, opponent, 'gold')
    return { t: f.t, diff: a === null || b === null ? null : a - b }
  })
}
