import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '../src/match-v5'
import { goalReference, rankBenchmarks, RANK_TIERS } from '../src/prematch/reference'
import { game, line } from './analysis-fixtures'

let n = 0
function g(me: Partial<PlayerLine>, opp: Partial<PlayerLine> | null = null, extra: Partial<MatchSummary> = {}): MatchSummary {
  n += 1
  return game({ championId: 222, championName: 'Jinx', role: 'BOTTOM', ...me }, { matchId: `g${n}`, startedAt: new Date(Date.UTC(2026, 9, 1 + n)).toISOString(), opponent: opp ? line({ puuid: 'opp', participantId: 6, role: 'BOTTOM', ...opp }) : null, ...extra })
}

describe('rankBenchmarks', () => {
  it('gives one approximate value per tier, rising with rank, scaled to the role', () => {
    const bot = rankBenchmarks('csPerMin', 'BOTTOM')
    expect(bot.map((b) => b.tier)).toEqual(RANK_TIERS)
    expect(bot.every((b, i) => i === 0 || b.value >= bot[i - 1]!.value)).toBe(true)
    const jungle = rankBenchmarks('csPerMin', 'JUNGLE')
    expect(jungle.find((b) => b.tier === 'Gold')!.value).toBeLessThan(bot.find((b) => b.tier === 'Gold')!.value)
    expect(rankBenchmarks('csPerMin', 'UTILITY')).toEqual([])
    expect(rankBenchmarks('visionPerMin', 'UTILITY').find((b) => b.tier === 'Gold')!.value).toBeGreaterThan(rankBenchmarks('visionPerMin', 'MIDDLE').find((b) => b.tier === 'Gold')!.value)
  })
  it('is calibrated on per-rank data (2026-10-27): mid CS Iron 5.4 → Gold 6.3 → Master+ 7.6, jungle on its own ladder, support KP and vision higher', () => {
    const at = (rows: Array<{ tier: string; value: number }>, tier: string) => rows.find((b) => b.tier === tier)!.value
    expect(at(rankBenchmarks('csPerMin', 'MIDDLE'), 'Iron')).toBe(5.4)
    expect(at(rankBenchmarks('csPerMin', 'MIDDLE'), 'Gold')).toBe(6.3)
    expect(at(rankBenchmarks('csPerMin', 'MIDDLE'), 'Master+')).toBe(7.6)
    expect(at(rankBenchmarks('csPerMin', 'JUNGLE'), 'Gold')).toBe(6.4)
    expect(at(rankBenchmarks('kpPct', 'MIDDLE'), 'Gold')).toBe(45)
    expect(at(rankBenchmarks('kpPct', 'UTILITY'), 'Gold')).toBe(54)
    expect(at(rankBenchmarks('visionPerMin', 'UTILITY'), 'Gold')).toBe(2.1)
    expect(at(rankBenchmarks('visionPerMin', 'JUNGLE'), 'Gold')).toBe(1.4)
    expect(at(rankBenchmarks('visionPerMin', 'MIDDLE'), 'Gold')).toBe(0.95)
  })
  it('deaths fall with rank (fewer is better)', () => {
    const d = rankBenchmarks('deathsPer10', 'MIDDLE')
    expect(d.every((b, i) => i === 0 || b.value <= d[i - 1]!.value)).toBe(true)
  })
})

describe('goalReference', () => {
  it('collects your average, your opponents average, your best and the role target', () => {
    const all = [g({ csPerMin: 7 }, { csPerMin: 6 }), g({ csPerMin: 8 }, { csPerMin: 7 }), g({ csPerMin: 6 }, { csPerMin: 5.3 }), g({ csPerMin: 9, role: 'MIDDLE' }, { csPerMin: 9, role: 'MIDDLE' })]
    const r = goalReference(all, 222, 'BOTTOM', 'csPerMin')
    expect(r).toEqual({ you: 7, youN: 3, opponents: 6.1, opponentsN: 3, best: 8, target: 7.5 })
  })
  it('falls back to the role average for "you" and nulls what it cannot know', () => {
    const all = [g({ csPerMin: 7, championId: 51 }), g({ csPerMin: 5, championId: 51 }), g({ csPerMin: 6, championId: 81 })]
    expect(goalReference(all, 222, 'BOTTOM', 'csPerMin')).toEqual({ you: 6, youN: 3, opponents: null, opponentsN: 0, best: null, target: 7.5 })
    expect(goalReference([], 222, 'BOTTOM', 'csPerMin')).toEqual({ you: null, youN: 0, opponents: null, opponentsN: 0, best: null, target: 7.5 })
  })
  it('kill participation of opponents is unknown (no enemy team kills in the summary)', () => {
    const all = [g({ kills: 5, assists: 5 }, { kills: 3 })]
    expect(goalReference(all, 222, 'BOTTOM', 'kpPct').opponents).toBeNull()
  })
})
