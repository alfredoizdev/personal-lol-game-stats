import { describe, it, expect } from 'vitest'
import { phaseCs, phaseStats, laneDiffAt, csCurve, goldDiffCurve, frameAt, type TimelineSeries } from '../src/analysis/timeline-series'

/** Ten participants; me = 1, opponent = 6. gold = cs * 20, xp = cs * 30. */
function series(frames: Array<[t: number, csMe: number, csOpp: number]>): TimelineSeries {
  return {
    v: 1,
    matchId: 'NA1_1',
    participants: Array.from({ length: 10 }, (_, i) => ({ participantId: i + 1, puuid: `p${i + 1}` })),
    frames: frames.map(([t, me, opp]) => {
      const cs = Array.from({ length: 10 }, (_, i) => (i === 0 ? me : i === 5 ? opp : 0))
      return { t, cs, gold: cs.map((c) => c * 20), xp: cs.map((c) => c * 30) }
    }),
  }
}

describe('frameAt', () => {
  it('returns the last frame at or before a time, null before the first frame', () => {
    const s = series([[0, 0, 0], [60, 8, 7], [120, 16, 15]])
    expect(frameAt(s, 90)!.t).toBe(60)
    expect(frameAt(s, 120)!.t).toBe(120)
    expect(frameAt(s, -1)).toBeNull()
    expect(frameAt({ ...s, frames: [] }, 10)).toBeNull()
  })
})

describe('phaseCs', () => {
  it('lane phase CS/min from the frame at 14 min minus the frame at 0', () => {
    const s = series([[0, 0, 0], [600, 80, 70], [840, 115, 100], [1500, 190, 180], [1800, 230, 210]])
    expect(phaseCs(s, 1, 'lane', 1800)).toBeCloseTo(115 / 14, 2)
    expect(phaseCs(s, 1, 'mid', 1800)).toBeCloseTo((190 - 115) / 11, 2)
    expect(phaseCs(s, 1, 'late', 1800)).toBeCloseTo((230 - 190) / 5, 2)
    expect(phaseCs(s, 6, 'late', 1800)).toBeCloseTo((210 - 180) / 5, 2)
  })
  it('a 9-minute game has only the lane phase', () => {
    const s = series([[0, 0, 0], [540, 60, 55]])
    expect(phaseCs(s, 1, 'lane', 540)).toBeCloseTo(60 / 9, 2)
    expect(phaseCs(s, 1, 'mid', 540)).toBeNull()
    expect(phaseCs(s, 1, 'late', 540)).toBeNull()
    expect(phaseStats(s, 1, 540).map((p) => p.csPerMin)).toEqual([expect.any(Number), null, null])
    expect(phaseStats(s, 1, 540).map((p) => p.key)).toEqual(['lane', 'mid', 'late'])
  })
  it('late phase needs at least 2 minutes', () => {
    const s = series([[0, 0, 0], [1500, 190, 180], [1560, 195, 185]])
    expect(phaseCs(s, 1, 'late', 1560)).toBeNull()
    const longer = series([[0, 0, 0], [1500, 190, 180], [1620, 200, 190]])
    expect(phaseCs(longer, 1, 'late', 1620)).toBeCloseTo(10 / 2, 2)
  })
  it('null for a participant outside the arrays', () => {
    const s = series([[0, 0, 0], [840, 100, 90]])
    expect(phaseCs(s, 11, 'lane', 840)).toBeNull()
  })
})

describe('laneDiffAt', () => {
  it('me − opponent at 10 and 15 minutes', () => {
    const s = series([[0, 0, 0], [600, 80, 70], [900, 120, 125]])
    expect(laneDiffAt(s, 1, 6, 10, 'cs')).toBe(10)
    expect(laneDiffAt(s, 1, 6, 15, 'cs')).toBe(-5)
    expect(laneDiffAt(s, 1, 6, 15, 'gold')).toBe(-100)
    expect(laneDiffAt(s, 1, 6, 10, 'xp')).toBe(300)
  })
  it('null when the game is shorter than the minute or a participant is missing', () => {
    const s = series([[0, 0, 0], [600, 80, 70]])
    expect(laneDiffAt(s, 1, 6, 15, 'cs')).toBeNull()
    expect(laneDiffAt(s, 1, 11, 10, 'cs')).toBeNull()
    const corrupt = { ...s, frames: s.frames.map((f) => ({ ...f, cs: f.cs.slice(0, 3) })) }
    expect(laneDiffAt(corrupt, 1, 6, 10, 'cs')).toBeNull()
  })
})

describe('csCurve / goldDiffCurve', () => {
  it('one point per frame, enemy null without an opponent', () => {
    const s = series([[0, 0, 0], [60, 8, 7]])
    expect(csCurve(s, 1, 6)).toEqual([{ t: 0, me: 0, enemy: 0 }, { t: 60, me: 8, enemy: 7 }])
    expect(csCurve(s, 1, null)[1]).toEqual({ t: 60, me: 8, enemy: null })
    expect(goldDiffCurve(s, 1, 6)[1]).toEqual({ t: 60, diff: 20 })
  })
})
