import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '../src/match-v5'
import type { LiveSnapshotV2 } from '../src/live'
import { GOAL_METRICS, defaultGoal, formatGoal, goalFor, goalMet, goalStatus, liveMetrics, type Goal } from '../src/prematch/goal'
import { game } from './analysis-fixtures'

const at = (i: number) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString()
let n = 0
function g(me: Partial<PlayerLine>, extra: Partial<MatchSummary> = {}): MatchSummary {
  n += 1
  return game({ championId: 222, championName: 'Jinx', role: 'BOTTOM', ...me }, { matchId: `g${n}`, startedAt: at(n), ...extra })
}

describe('GOAL_METRICS', () => {
  it('lists the four metrics with their steps', () => {
    expect(GOAL_METRICS.map((m) => m.key)).toEqual(['csPerMin', 'visionPerMin', 'deathsPer10', 'kpPct'])
    expect(GOAL_METRICS.find((m) => m.key === 'deathsPer10')!.lowerIsBetter).toBe(true)
    expect(GOAL_METRICS.find((m) => m.key === 'kpPct')!.unit).toBe('%')
  })
})

describe('defaultGoal (owner 2026-10-22: the editor starts at the recommended role target; your average is shown beside it)', () => {
  it('recommends the role target and reports the champion+role average with at least 3 games', () => {
    const all = [g({ csPerMin: 7 }), g({ csPerMin: 8 }), g({ csPerMin: 6 }), g({ csPerMin: 9, championId: 51 })]
    expect(defaultGoal(all, 222, 'BOTTOM')).toEqual({ metric: 'csPerMin', target: 7.5, source: 'target', n: 0, average: { value: 7, source: 'champion', n: 3 } })
  })
  it('average falls back to the role average, then to none', () => {
    const all = [g({ csPerMin: 7 }), g({ csPerMin: 8, championId: 51 }), g({ csPerMin: 6, championId: 81 })]
    expect(defaultGoal(all, 222, 'BOTTOM').average).toEqual({ value: 7, source: 'role', n: 3 })
    expect(defaultGoal([], 222, 'BOTTOM')).toEqual({ metric: 'csPerMin', target: 7.5, source: 'target', n: 0, average: null })
  })
  it('defaults to vision for support and has no CS/min target for a support', () => {
    expect(defaultGoal([], 412, 'UTILITY')).toEqual({ metric: 'visionPerMin', target: 2, source: 'target', n: 0, average: null })
    expect(defaultGoal([], 412, 'UTILITY', 'csPerMin')).toEqual({ metric: 'csPerMin', target: null, source: 'none', n: 0, average: null })
  })
  it('only the newest 20 games with that champion count towards the average', () => {
    const all = [...Array.from({ length: 20 }, () => g({ csPerMin: 8 })), ...Array.from({ length: 5 }, () => g({ csPerMin: 2 }))].reverse() // newest first = csPerMin 2 ×5 then 8 ×20
    // (2×5 + 8×15) / 20 = 6.5
    expect(defaultGoal(all, 222, 'BOTTOM').average?.value).toBe(6.5)
  })
})

const goal = (p: Partial<Goal>): Goal => ({ puuid: 'me', championId: 222, role: 'BOTTOM', metric: 'csPerMin', target: 7, setAt: '2026-10-20T10:00:00.000Z', ...p })

describe('goalFor', () => {
  it('prefers the newest exact champion goal, then any champion in that role; filters by puuid', () => {
    const goals = [goal({ target: 7, setAt: '2026-10-20T10:00:00.000Z' }), goal({ target: 7.5, setAt: '2026-10-21T10:00:00.000Z' }), goal({ championId: 51, target: 6, setAt: '2026-10-22T10:00:00.000Z' }), goal({ puuid: 'smurf', target: 9, setAt: '2026-10-23T10:00:00.000Z' })]
    expect(goalFor(goals, 'me', 222, 'BOTTOM')!.target).toBe(7.5)
    expect(goalFor(goals, 'me', 81, 'BOTTOM')!.target).toBe(6) // no Ezreal goal → newest in role
    expect(goalFor(goals, 'me', null, 'BOTTOM')!.target).toBe(6)
    expect(goalFor(goals, 'smurf', 222, 'BOTTOM')!.target).toBe(9)
  })
  it('falls back to the newest goal for that champion in any role (autofill, or a mode that reports no position)', () => {
    const goals = [goal({ target: 7, setAt: '2026-10-20T10:00:00.000Z' }), goal({ target: 7.5, setAt: '2026-10-21T10:00:00.000Z' }), goal({ championId: 51, target: 6, setAt: '2026-10-22T10:00:00.000Z' })]
    expect(goalFor(goals, 'me', 222, 'MIDDLE')!.target).toBe(7.5) // Jinx goal set as bot, playing Jinx mid
    expect(goalFor(goals, 'me', 222, null)!.target).toBe(7.5) // position unknown (ARAM/Swiftplay)
    expect(goalFor(goals, 'me', 81, null)).toBeNull() // no goal for this champion and no role to fall back on
    expect(goalFor(goals, 'me', null, null)).toBeNull()
  })
  it('honours a cutoff: a goal saved during champ select still counts for that game', () => {
    const goals = [goal({ target: 7, setAt: '2026-10-20T10:00:00.000Z' }), goal({ target: 8, setAt: '2026-10-20T10:31:00.000Z' })]
    const gameStart = Date.parse('2026-10-20T10:30:00.000Z')
    const gameEnd = gameStart + 30 * 60_000
    expect(goalFor(goals, 'me', 222, 'BOTTOM', gameEnd)!.target).toBe(8)
    expect(goalFor(goals, 'me', 222, 'BOTTOM', gameStart - 1)!.target).toBe(7)
    expect(goalFor(goals, 'me', 222, 'BOTTOM', Date.parse('2026-10-20T09:00:00.000Z'))).toBeNull()
  })
})

function snap(p: Partial<LiveSnapshotV2['me']>, extra: Partial<LiveSnapshotV2> = {}): LiveSnapshotV2 {
  return {
    v: 2, ts: 0, isFinal: false, gameTimeSeconds: 1200, gameMode: 'CLASSIC', queueId: 420, teamKills: 10,
    me: { championName: 'Jinx', position: 'BOTTOM', level: 10, kills: 3, deaths: 2, assists: 4, cs: 140, csPerMin: 7, wardScore: 12, items: [], isDead: null, respawnSec: null, ...p },
    opponent: null, focus: null, events: [], ...extra,
  }
}

describe('liveMetrics / goalStatus / goalMet', () => {
  it('derives the four metrics from a snapshot', () => {
    expect(liveMetrics(snap({}))).toEqual({ csPerMin: 7, kpPct: 70, deathsPer10: 1, visionPerMin: 0.6 })
  })
  it('is unknown under 60 s, with 0 team kills, or with null inputs', () => {
    expect(liveMetrics(snap({}, { gameTimeSeconds: 30 }))).toEqual({ csPerMin: null, kpPct: null, deathsPer10: null, visionPerMin: null })
    expect(liveMetrics(snap({}, { teamKills: 0 })).kpPct).toBeNull()
    expect(liveMetrics(snap({ wardScore: null })).visionPerMin).toBeNull()
    expect(goalStatus({ metric: 'kpPct', target: 55 }, null)).toBe('unknown')
  })
  it('on track means ≥ target, or ≤ target for deaths', () => {
    expect(goalStatus({ metric: 'csPerMin', target: 7 }, 7)).toBe('on_track')
    expect(goalStatus({ metric: 'csPerMin', target: 7 }, 6.9)).toBe('below')
    expect(goalStatus({ metric: 'deathsPer10', target: 1.5 }, 1.5)).toBe('on_track')
    expect(goalStatus({ metric: 'deathsPer10', target: 1.5 }, 2)).toBe('below')
    expect(goalMet({ metric: 'deathsPer10', target: 1.5 }, 2)).toBe(false)
    expect(goalMet({ metric: 'kpPct', target: 55 }, 60)).toBe(true)
    expect(goalMet({ metric: 'kpPct', target: 55 }, null)).toBeNull()
    // compared at the metric's own precision, so what the player reads is what is judged
    expect(goalMet({ metric: 'deathsPer10', target: 1.5 }, 1.53)).toBe(true)
    expect(goalMet({ metric: 'csPerMin', target: 7 }, 6.96)).toBe(true)
  })
})

describe('formatGoal', () => {
  it('formats each metric with its unit', () => {
    expect(formatGoal({ metric: 'csPerMin', target: 7 })).toBe('7.0 CS/min')
    expect(formatGoal({ metric: 'visionPerMin', target: 0.6 })).toBe('0.60 vision score/min')
    expect(formatGoal({ metric: 'deathsPer10', target: 1.5 })).toBe('≤ 1.5 deaths per 10 min')
    expect(formatGoal({ metric: 'kpPct', target: 55 })).toBe('55% kill participation')
  })
})
