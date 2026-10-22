/**
 * The one editable table behind every score (spec 2.2, 6.1, 6.5). Scores come
 * ONLY from these targets; comparisons against the opponent or your own
 * average are context and never move a score. Documented in docs/ANALYSIS.md.
 */
import type { Role } from '../match-v5'

/** Summoner's Rift PvP queues: Normal Draft, Ranked Solo, Blind, Flex, Swiftplay, Quickplay, Clash. */
export const ANALYZABLE_QUEUES: ReadonlySet<number> = new Set([400, 420, 430, 440, 480, 490, 700])

export type RoleTargets = {
  /** null = farming is not scored for this role (UTILITY). */
  csPerMin: number | null
  visionPerMin: number
  wardsPerMin: number
  /** Deaths per 10 minutes at which the score is 70 ("good"); fewer is better. */
  deathsPer10Max: number
  kpPct: number
}

export const ROLE_TARGETS: Record<Role, RoleTargets> = {
  TOP: { csPerMin: 7.0, visionPerMin: 0.6, wardsPerMin: 0.25, deathsPer10Max: 1.5, kpPct: 45 },
  JUNGLE: { csPerMin: 5.5, visionPerMin: 1.0, wardsPerMin: 0.4, deathsPer10Max: 1.5, kpPct: 60 },
  MIDDLE: { csPerMin: 7.0, visionPerMin: 0.6, wardsPerMin: 0.25, deathsPer10Max: 1.5, kpPct: 55 },
  BOTTOM: { csPerMin: 7.5, visionPerMin: 0.6, wardsPerMin: 0.25, deathsPer10Max: 1.5, kpPct: 55 },
  UTILITY: { csPerMin: null, visionPerMin: 2.0, wardsPerMin: 0.9, deathsPer10Max: 1.8, kpPct: 60 },
}

export type AreaKey = 'farming' | 'combat' | 'vision' | 'lane'

const LANER_AREAS = { farming: 35, combat: 30, lane: 20, vision: 15 } as const

export const AREA_WEIGHTS: Record<Role, Partial<Record<AreaKey, number>>> = {
  TOP: LANER_AREAS,
  JUNGLE: LANER_AREAS,
  MIDDLE: LANER_AREAS,
  BOTTOM: LANER_AREAS,
  UTILITY: { vision: 40, combat: 30, lane: 30 },
}

export const SUBROW_WEIGHTS = {
  farming: { total: 40, lane: 20, mid: 20, late: 20 },
  combat: { kp: 50, deaths: 50 },
  vision: { visionPerMin: 60, wardsPerMin: 40 },
} as const

export type PhaseKey = 'lane' | 'mid' | 'late'

export const PHASES: ReadonlyArray<{ key: PhaseKey; label: string; startSec: number; endSec: number | null }> = [
  { key: 'lane', label: 'Lane phase', startSec: 0, endSec: 14 * 60 },
  { key: 'mid', label: 'Mid game', startSec: 14 * 60, endSec: 25 * 60 },
  { key: 'late', label: 'Late game', startSec: 25 * 60, endSec: null },
]

/** A phase only counts when the game lasted at least this long into it. */
export const PHASE_MIN_SEC = 120

export type DiffCurve = { floor: number; mid: number; ceil: number }

/** Lane differences (me − opponent): floor → 0, mid → 60, ceil → 100. */
export const DIFF_CURVES: { cs: DiffCurve; gold: DiffCurve; xp: DiffCurve } = {
  cs: { floor: -40, mid: 0, ceil: 25 },
  gold: { floor: -1500, mid: 0, ceil: 1500 },
  xp: { floor: -1000, mid: 0, ceil: 1000 },
}
