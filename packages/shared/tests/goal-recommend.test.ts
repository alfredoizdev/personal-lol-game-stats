import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '../src/match-v5'
import { defaultMetricFor, goalFor, type StoredGoal } from '../src/prematch/goal'
import { recommendedGoal, roleGoalRows } from '../src/prematch/recommend'
import { game } from './analysis-fixtures'

const at = (i: number) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString()
let n = 0
/** A 30-minute jungle game: durationSec 1800, teamKills 20 unless overridden. */
function jg(me: Partial<PlayerLine>, extra: Partial<MatchSummary> = {}): MatchSummary {
  n += 1
  return game({ championId: 64, championName: 'Lee Sin', role: 'JUNGLE', ...me }, { matchId: `r${n}`, startedAt: at(n), durationSec: 1800, teamKills: 20, ...extra })
}

describe('defaultMetricFor (the metric a role is measured on first)', () => {
  it('is kill participation for jungle, vision for support, CS for the lanes', () => {
    expect(defaultMetricFor('JUNGLE')).toBe('kpPct')
    expect(defaultMetricFor('UTILITY')).toBe('visionPerMin')
    expect(defaultMetricFor('TOP')).toBe('csPerMin')
    expect(defaultMetricFor('MIDDLE')).toBe('csPerMin')
    expect(defaultMetricFor('BOTTOM')).toBe('csPerMin')
  })
})

describe('recommendedGoal (owner, 2026-10-26: the goal should follow the role; recommended = your weakest metric in that role)', () => {
  it('picks the metric furthest below the role target over your last games in the role', () => {
    // Jungle targets: CS 5.5, vision 1.0, deaths ≤ 1.5 per 10, KP 60. KP is fine (65 %), vision is half the target.
    const all = Array.from({ length: 5 }, () => jg({ kills: 5, assists: 8, deaths: 2, csPerMin: 5.6, visionScore: 15 })) // 15/30 = 0.5 vision/min, 13/20 = 65 % KP, 2/3 = 0.67 deaths per 10
    expect(recommendedGoal(all, 'JUNGLE')).toEqual({ metric: 'visionPerMin', target: 1.0, reason: 'weakest', average: 0.5, n: 5 })
  })
  it('a jungler with the vision but a low kill participation gets KP', () => {
    const all = Array.from({ length: 4 }, () => jg({ kills: 2, assists: 4, deaths: 2, csPerMin: 5.6, visionScore: 36 })) // 1.2 vision/min, 30 % KP
    expect(recommendedGoal(all, 'JUNGLE')).toMatchObject({ metric: 'kpPct', target: 60, reason: 'weakest', average: 30 })
  })
  it('deaths count as a weakness when they exceed the limit', () => {
    const all = Array.from({ length: 3 }, () => jg({ kills: 6, assists: 10, deaths: 9, csPerMin: 6, visionScore: 40 })) // 3 deaths per 10 min vs ≤ 1.5: 100 % over
    expect(recommendedGoal(all, 'JUNGLE')).toMatchObject({ metric: 'deathsPer10', target: 1.5, reason: 'weakest', average: 3 })
  })
  it("falls back to the role's own metric with fewer than 3 games in the role, or when every metric meets its target", () => {
    expect(recommendedGoal([], 'JUNGLE')).toEqual({ metric: 'kpPct', target: 60, reason: 'role', average: null, n: 0 })
    expect(recommendedGoal([jg({})], 'JUNGLE')).toMatchObject({ metric: 'kpPct', reason: 'role', n: 1 })
    const strong = Array.from({ length: 3 }, () => jg({ kills: 6, assists: 10, deaths: 1, csPerMin: 6, visionScore: 40 }))
    expect(recommendedGoal(strong, 'JUNGLE')).toMatchObject({ metric: 'kpPct', target: 60, reason: 'role', n: 3 })
  })
  it('never recommends CS for support (not scored there)', () => {
    const all = Array.from({ length: 3 }, () => jg({ role: 'UTILITY', championId: 412, championName: 'Thresh', kills: 1, assists: 12, deaths: 2, csPerMin: 1, visionScore: 75 })) // 2.5 vision/min, 65 % KP
    expect(recommendedGoal(all, 'UTILITY').metric).not.toBe('csPerMin')
  })
})

describe('roleGoalRows (what Save goal materialises: one row per role, so Live, the review and the desktop push agree)', () => {
  const all = Array.from({ length: 5 }, () => jg({ kills: 5, assists: 8, deaths: 2, csPerMin: 5.6, visionScore: 15 }))
  it('a metric left at the recommended value gets each role its own target for that metric', () => {
    const rows = roleGoalRows(all, { metric: 'csPerMin', target: null })
    expect(rows.map((r) => [r.role, r.metric, r.target])).toEqual([
      ['TOP', 'csPerMin', 7.0],
      ['JUNGLE', 'csPerMin', 5.5],
      ['MIDDLE', 'csPerMin', 7.0],
      ['BOTTOM', 'csPerMin', 7.5],
      ['UTILITY', 'visionPerMin', 2.0], // CS is not scored for support: its recommended goal instead
    ])
    expect(rows.every((r) => r.championId === 0)).toBe(true)
  })
  it('a fixed number applies to every role where the metric is scored', () => {
    const rows = roleGoalRows(all, { metric: 'kpPct', target: 55 })
    expect(rows.map((r) => r.target)).toEqual([55, 55, 55, 55, 55])
    expect(roleGoalRows(all, { metric: 'csPerMin', target: 6.5 }).find((r) => r.role === 'UTILITY')).toMatchObject({ metric: 'visionPerMin', target: 2.0 })
  })
})

describe('goalFor: the newest row for the role wins, champion-specific or not (one editor writes them now)', () => {
  const goal = (p: Partial<StoredGoal>): StoredGoal => ({ puuid: 'me', championId: 222, role: 'BOTTOM', metric: 'csPerMin', target: 7, setAt: '2026-10-20T10:00:00.000Z', ...p })
  it('a newer role row (champion 0) beats an older champion-specific row for the same role', () => {
    const old = goal({ championId: 222, target: 6, setAt: '2026-10-20T10:00:00.000Z' })
    const roleRow = goal({ championId: 0, target: 7.5, setAt: '2026-10-26T10:00:00.000Z' })
    expect(goalFor([old, roleRow], 'me', 222, 'BOTTOM')).toMatchObject({ target: 7.5, source: 'role' })
  })
  it('a newer champion-specific row still beats an older role row', () => {
    const roleRow = goal({ championId: 0, target: 7.5, setAt: '2026-10-20T10:00:00.000Z' })
    const exact = goal({ championId: 222, target: 6, setAt: '2026-10-26T10:00:00.000Z' })
    expect(goalFor([roleRow, exact], 'me', 222, 'BOTTOM')).toMatchObject({ target: 6, source: 'exact' })
  })
})
