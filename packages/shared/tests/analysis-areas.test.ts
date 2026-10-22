import { describe, it, expect } from 'vitest'
import { analyzeMatch, type MatchAnalysis, type AreaResult } from '../src/analysis/areas'
import type { Baseline } from '../src/analysis/baseline'
import { ADC_GAME, ADC_ME, ADC_OPP, adcSeries, game, line } from './analysis-fixtures'

const ok = (a: MatchAnalysis) => {
  if (!a.analyzable) throw new Error(`not analyzable: ${a.reason}`)
  return a
}
const area = (a: MatchAnalysis, key: AreaResult['key']) => ok(a).areas.find((x) => x.key === key)!
const baseline: Baseline = { n: 14, csPerMin: 6.5, kpPct: 60, deathsPer10: 1.4, visionPerMin: 0.7, wardsPerMin: 0.28 }

describe('analyzeMatch — eligibility', () => {
  it('not analyzable for ARAM, bots and remakes, with a reason', () => {
    expect(analyzeMatch({ summary: game({}, { queueId: 450 }), series: null, baseline: null })).toEqual({ analyzable: false, reason: 'Analysis is only available for Summoner\'s Rift games.' })
    expect(analyzeMatch({ summary: game({}, { queueId: 830 }), series: null, baseline: null }).analyzable).toBe(false)
    expect(analyzeMatch({ summary: game({}, { remake: true }), series: null, baseline: null })).toEqual({ analyzable: false, reason: 'Remakes are not analyzed.' })
  })
})

describe('analyzeMatch — the worked ADC example (docs/ANALYSIS.md)', () => {
  const a = ok(analyzeMatch({ summary: ADC_GAME, series: adcSeries(), baseline }))

  it('scores the four areas as computed by hand', () => {
    expect(area(a, 'farming').score).toBe(62)
    expect(area(a, 'combat').score).toBe(99)
    expect(area(a, 'vision').score).toBe(96)
    expect(area(a, 'lane').score).toBe(69)
    expect(area(a, 'farming').rating).toBe('Good')
    expect(area(a, 'combat').rating).toBe('Great')
  })
  it('overall is the role-weighted mean (BOTTOM 35/30/20/15) → 80 Great', () => {
    expect(a.overall).toBe(80)
    expect(a.overallRating).toBe('Great')
    expect(a.areas.map((x) => [x.key, x.weight])).toEqual([['farming', 35], ['combat', 30], ['lane', 20], ['vision', 15]])
  })
  it('farming subrows carry the phase CS/min, their scores and both deltas', () => {
    const rows = area(a, 'farming').subrows
    expect(rows.map((r) => [r.key, r.score])).toEqual([['total', 61], ['lane', 70], ['mid', 40], ['late', 77]])
    const total = rows[0]!
    expect(total.value).toBe(7)
    expect(total.target).toBe(7.5)
    expect(total.delta).toEqual({ vsOpponent: 0.5, vsYou: 0.5 })
    expect(rows[2]!.display).toBe('5.9')
    expect(rows[2]!.delta.vsOpponent).toBeCloseTo(5.9 - 5.9, 0)
  })
  it('context subrows never carry a score and never drive the sentence', () => {
    const combat = area(a, 'combat')
    const ctx = combat.subrows.filter((r) => r.context)
    expect(ctx.map((r) => r.key)).toEqual(['kda', 'damagePerMin'])
    expect(ctx.every((r) => r.score === null)).toBe(true)
    expect(combat.sentence).not.toMatch(/KDA|damage/i)
  })
  it('lane subrows are cs, gold and xp with @10/@15 displays', () => {
    const rows = area(a, 'lane').subrows
    expect(rows.map((r) => [r.key, r.score])).toEqual([['cs', 71], ['gold', 67], ['xp', 70]])
    expect(rows[0]!.display).toBe('+5 @10 · +8 @15')
    expect(rows[0]!.value).toBe(8)
  })
  it('the weakest area drives the headline and the farming sentence names the mid game with its numbers', () => {
    expect(a.weakest).toBe('farming')
    expect(a.headline).toBe('Solid all around')
    expect(area(a, 'farming').sentence).toBe('Slow mid game: 5.9 CS/min vs 5.9 for your opponent (14–25 min).')
    expect(a.baselineN).toBe(14)
    expect(a.timelineMissing).toBe(false)
  })
})

describe('analyzeMatch — degraded inputs', () => {
  it('UTILITY: Farming hidden, Lane has gold+xp only, weights 40/30/30', () => {
    const sup = game({ ...ADC_ME, role: 'UTILITY', visionScore: 60, wardsPlaced: 30 }, { opponent: line({ ...ADC_OPP, role: 'UTILITY' }) })
    const a = ok(analyzeMatch({ summary: sup, series: adcSeries(), baseline: null }))
    expect(area(a, 'farming').score).toBeNull()
    expect(area(a, 'farming').hiddenReason).toBe('Farming is not scored for supports.')
    expect(area(a, 'lane').subrows.map((r) => r.key)).toEqual(['gold', 'xp'])
    expect(a.areas.filter((x) => x.score !== null).map((x) => [x.key, x.weight])).toEqual([['vision', 40], ['combat', 30], ['lane', 30]])
  })
  it('no timeline: Farming = total only, Lane hidden with reason, timelineMissing true', () => {
    const a = ok(analyzeMatch({ summary: ADC_GAME, series: null, baseline }))
    expect(area(a, 'farming').subrows.map((r) => r.key)).toEqual(['total'])
    expect(area(a, 'farming').score).toBe(61)
    expect(area(a, 'lane').score).toBeNull()
    expect(area(a, 'lane').hiddenReason).toBe('Timeline not available yet.')
    expect(a.timelineMissing).toBe(true)
    expect(a.overall).toBe(82) // (61·35 + 99·30 + 96·15) / 80 = 81.8
  })
  it('no lane opponent: Lane hidden, vsOpponent deltas null', () => {
    const a = ok(analyzeMatch({ summary: game(ADC_ME), series: adcSeries(), baseline: null }))
    expect(area(a, 'lane').hiddenReason).toBe('No lane opponent in this game.')
    expect(area(a, 'farming').subrows[0]!.delta.vsOpponent).toBeNull()
    expect(area(a, 'farming').sentence).toBe('Slow mid game: 5.9 CS/min vs the 7.5 target for your role (14–25 min).')
  })
  it('teamKills 0: KP subrow null, Combat scores on deaths only, sentence never mentions KP', () => {
    const a = ok(analyzeMatch({ summary: game({ ...ADC_ME, deaths: 6 }, { teamKills: 0 }), series: null, baseline: null }))
    const combat = area(a, 'combat')
    expect(combat.subrows.find((r) => r.key === 'kp')!.score).toBeNull()
    expect(combat.score).toBe(scoreOfDeathsOnly())
    expect(combat.sentence).toMatch(/deaths/)
    expect(combat.sentence).not.toMatch(/kill participation/)
  })
  it('9-minute game: mid/late null, Lane @15 null, nothing is NaN', () => {
    const short = adcSeries()
    short.frames = short.frames.filter((f) => f.t <= 540).concat([{ t: 540, cs: short.frames[1]!.cs, gold: short.frames[1]!.gold, xp: short.frames[1]!.xp }])
    const a = ok(analyzeMatch({ summary: game(ADC_ME, { durationSec: 540, opponent: ADC_OPP }), series: short, baseline: null }))
    expect(area(a, 'farming').subrows.map((r) => r.score)).toEqual([expect.any(Number), expect.any(Number), null, null])
    expect(area(a, 'lane').hiddenReason).toBe('Game too short for lane comparisons.')
    const all = ok(a).areas.flatMap((x) => [x.score, ...x.subrows.map((r) => r.score)])
    expect(all.some((s) => typeof s === 'number' && Number.isNaN(s))).toBe(false)
  })
  it('baseline with 0, 1 or 2 games: vsYou null and baselineN reported', () => {
    for (const n of [0, 1, 2]) {
      const a = ok(analyzeMatch({ summary: ADC_GAME, series: null, baseline: { ...baseline, n } }))
      expect(a.baselineN).toBe(n)
      expect(area(a, 'farming').subrows[0]!.delta.vsYou).toBeNull()
    }
  })
  it('the headline names the weakest area when it is below 60', () => {
    const a = ok(analyzeMatch({ summary: game({ ...ADC_ME, visionScore: 5, wardsPlaced: 1 }), series: null, baseline: null }))
    expect(a.weakest).toBe('vision')
    expect(a.headline).toBe('What holds you back most: Vision')
    expect(area(a, 'vision').sentence).toBe('Low vision: 0.17 vision score/min vs the 0.60 target for your role.')
  })
})

/** deaths 6 in 30 min = 2.0 per 10 min vs 1.5 max → ratio 0.75 → 35; KP null → Combat = 35. */
function scoreOfDeathsOnly(): number {
  return 35
}
