import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '../src/match-v5'
import { formatLpChange, lpChanges, snapshotChanged, snapshotOf, type RankSnapshot } from '../src/lp-changes'
import { game } from './analysis-fixtures'

const T = (min: number) => new Date(Date.UTC(2026, 9, 27, 12, min)).toISOString()
const snap = (p: Partial<RankSnapshot>): RankSnapshot => ({ queue: 'solo', tier: 'GOLD', division: 'III', leaguePoints: 45, wins: 14, losses: 25, takenAt: T(0), ...p })
/** A 30-minute ranked solo game that ENDED at minute `endMin`. */
let n = 0
const played = (endMin: number, me: Partial<PlayerLine>, extra: Partial<MatchSummary> = {}): MatchSummary => {
  n += 1
  return game(me, { matchId: `m${n}`, queueId: 420, durationSec: 1800, startedAt: T(endMin - 30), ...extra })
}

describe('LP per game (owner, 2026-10-27: "sí hay que mostrar el LP")', () => {
  it('one more win between two snapshots → the ranked solo game that ended in between gets the LP gain', () => {
    const a = snap({ takenAt: T(0), leaguePoints: 45, wins: 14 })
    const b = snap({ takenAt: T(60), leaguePoints: 63, wins: 15 })
    const m = played(40, { win: true })
    expect(lpChanges([a, b], [m]).get(m.matchId)).toEqual({ delta: 18, promoted: false, demoted: false, to: 'Gold III' })
  })
  it('a loss gives a negative delta; a game whose result does not match the record change is not attributed', () => {
    const a = snap({ takenAt: T(0), leaguePoints: 45, losses: 25 })
    const b = snap({ takenAt: T(60), leaguePoints: 30, losses: 26 })
    const win = played(20, { win: true })
    const loss = played(50, { win: false })
    const out = lpChanges([a, b], [win, loss])
    expect(out.get(loss.matchId)?.delta).toBe(-15)
    expect(out.has(win.matchId)).toBe(false)
  })
  it('two games between snapshots cannot be split → nothing shown for them', () => {
    const a = snap({ takenAt: T(0), leaguePoints: 45, wins: 14 })
    const b = snap({ takenAt: T(120), leaguePoints: 80, wins: 16 })
    expect(lpChanges([a, b], [played(40, { win: true }), played(100, { win: true })]).size).toBe(0)
  })
  it('promotion and demotion carry the LP across the division boundary', () => {
    const up = lpChanges([snap({ takenAt: T(0), leaguePoints: 85, wins: 14 }), snap({ takenAt: T(60), leaguePoints: 10, division: 'II', wins: 15 })], [played(40, { win: true })])
    expect([...up.values()][0]).toEqual({ delta: 25, promoted: true, demoted: false, to: 'Gold II' })
    const down = lpChanges([snap({ takenAt: T(0), leaguePoints: 0, division: 'II', losses: 25 }), snap({ takenAt: T(60), leaguePoints: 75, division: 'III', losses: 26 })], [played(40, { win: false })])
    expect([...down.values()][0]).toEqual({ delta: -25, promoted: false, demoted: true, to: 'Gold III' })
  })
  it('flex snapshots attach to flex games only; remakes and normals never qualify; league lag of a couple of minutes is tolerated', () => {
    const a = snap({ queue: 'flex', takenAt: T(0), leaguePoints: 10, wins: 3 })
    const b = snap({ queue: 'flex', takenAt: T(60), leaguePoints: 30, wins: 4 })
    const solo = played(20, { win: true })
    const normal = played(30, { win: true }, { queueId: 400 })
    const flex = played(2, { win: true }, { queueId: 440 }) // ended 2 min AFTER snapshot a was taken? no: ended at minute 2, a at 0 → inside the window
    const out = lpChanges([a, b], [solo, normal, flex])
    expect(out.get(flex.matchId)?.delta).toBe(20)
    expect(out.size).toBe(1)
    const lagged = played(-1, { win: true }, { queueId: 440 }) // ended a minute BEFORE a, which did not yet reflect it
    expect(lpChanges([a, b], [lagged]).get(lagged.matchId)?.delta).toBe(20)
  })
  it('snapshotOf and snapshotChanged: a snapshot is worth storing only when the standing moved', () => {
    const entry = { queue: 'solo' as const, tier: 'GOLD', division: 'III', leaguePoints: 45, wins: 14, losses: 25 }
    const s = snapshotOf(entry, T(0))
    expect(s).toEqual(snap({ takenAt: T(0) }))
    expect(snapshotChanged(null, s)).toBe(true)
    expect(snapshotChanged(s, snapshotOf(entry, T(5)))).toBe(false)
    expect(snapshotChanged(s, snapshotOf({ ...entry, leaguePoints: 46 }, T(5)))).toBe(true)
  })
  it('formats the change for a match row', () => {
    expect(formatLpChange({ delta: 18, promoted: false, demoted: false, to: 'Gold III' })).toBe('+18 LP')
    expect(formatLpChange({ delta: -15, promoted: false, demoted: false, to: 'Gold III' })).toBe('−15 LP')
    expect(formatLpChange({ delta: 25, promoted: true, demoted: false, to: 'Gold II' })).toBe('+25 LP · ↑ Gold II')
    expect(formatLpChange({ delta: -25, promoted: false, demoted: true, to: 'Gold III' })).toBe('−25 LP · ↓ Gold III')
  })
})
