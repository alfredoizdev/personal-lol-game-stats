import { describe, it, expect } from 'vitest'
import { scoreRatio, scoreDiff, rating, weightedMean } from '../src/analysis/score'
import { ROLE_TARGETS, AREA_WEIGHTS, ANALYZABLE_QUEUES, DIFF_CURVES, SUBROW_WEIGHTS, PHASES } from '../src/analysis/targets'

describe('scoreRatio', () => {
  it('maps 0.5 → 0, 1.0 → 70, 1.3 → 100 and clamps', () => {
    expect(scoreRatio(3.5, 7, 'higher')).toBe(0)
    expect(scoreRatio(7, 7, 'higher')).toBe(70)
    expect(scoreRatio(9.1, 7, 'higher')).toBe(100)
    expect(scoreRatio(12, 7, 'higher')).toBe(100)
    expect(scoreRatio(5.25, 7, 'higher')).toBe(35)
  })
  it('inverts lower-is-better metrics and treats 0 as perfect', () => {
    expect(scoreRatio(1.5, 1.5, 'lower')).toBe(70)
    expect(scoreRatio(3, 1.5, 'lower')).toBe(0)
    expect(scoreRatio(0, 1.5, 'lower')).toBe(100)
  })
  it('returns null without a value or a target', () => {
    expect(scoreRatio(null, 7, 'higher')).toBeNull()
    expect(scoreRatio(5, null, 'higher')).toBeNull()
  })
})

describe('scoreDiff', () => {
  it('maps the CS curve −40 → 0, 0 → 60, +25 → 100', () => {
    expect(scoreDiff(-40, DIFF_CURVES.cs)).toBe(0)
    expect(scoreDiff(-60, DIFF_CURVES.cs)).toBe(0)
    expect(scoreDiff(0, DIFF_CURVES.cs)).toBe(60)
    expect(scoreDiff(-20, DIFF_CURVES.cs)).toBe(30)
    expect(scoreDiff(25, DIFF_CURVES.cs)).toBe(100)
    expect(scoreDiff(40, DIFF_CURVES.cs)).toBe(100)
    expect(scoreDiff(null, DIFF_CURVES.cs)).toBeNull()
  })
  it('gold and xp curves are symmetric per the spec', () => {
    expect(scoreDiff(-1500, DIFF_CURVES.gold)).toBe(0)
    expect(scoreDiff(750, DIFF_CURVES.gold)).toBe(80)
    expect(scoreDiff(1000, DIFF_CURVES.xp)).toBe(100)
  })
})

describe('rating', () => {
  it('uses the spec thresholds', () => {
    expect(rating(0)).toBe('Poor')
    expect(rating(39)).toBe('Poor')
    expect(rating(40)).toBe('Fair')
    expect(rating(59)).toBe('Fair')
    expect(rating(60)).toBe('Good')
    expect(rating(79)).toBe('Good')
    expect(rating(80)).toBe('Great')
    expect(rating(100)).toBe('Great')
  })
})

describe('weightedMean', () => {
  it('renormalizes around null scores and returns null when all are null', () => {
    expect(weightedMean([{ score: 80, weight: 40 }, { score: null, weight: 60 }])).toBe(80)
    expect(weightedMean([{ score: 80, weight: 50 }, { score: 40, weight: 50 }])).toBe(60)
    expect(weightedMean([{ score: 100, weight: 35 }, { score: 0, weight: 30 }, { score: 50, weight: 35 }])).toBe(53)
    expect(weightedMean([{ score: null, weight: 1 }])).toBeNull()
    expect(weightedMean([])).toBeNull()
  })
})

describe('targets table', () => {
  it('holds the spec values', () => {
    expect(ROLE_TARGETS.TOP.csPerMin).toBe(7.0)
    expect(ROLE_TARGETS.JUNGLE.csPerMin).toBe(5.5)
    expect(ROLE_TARGETS.MIDDLE.csPerMin).toBe(7.0)
    expect(ROLE_TARGETS.BOTTOM.csPerMin).toBe(7.5)
    expect(ROLE_TARGETS.UTILITY.csPerMin).toBeNull()
    expect(ROLE_TARGETS.UTILITY.visionPerMin).toBe(2.0)
    expect(ROLE_TARGETS.JUNGLE.visionPerMin).toBe(1.0)
    expect(ROLE_TARGETS.UTILITY.wardsPerMin).toBe(0.9)
    expect(ROLE_TARGETS.UTILITY.deathsPer10Max).toBe(1.8)
    expect(ROLE_TARGETS.MIDDLE.deathsPer10Max).toBe(1.5)
    expect(ROLE_TARGETS.JUNGLE.kpPct).toBe(60)
    expect(ROLE_TARGETS.TOP.kpPct).toBe(45)
    expect(AREA_WEIGHTS.UTILITY).toEqual({ vision: 40, combat: 30, lane: 30 })
    expect(AREA_WEIGHTS.MIDDLE).toEqual({ farming: 35, combat: 30, lane: 20, vision: 15 })
    expect(SUBROW_WEIGHTS.combat).toEqual({ kp: 50, deaths: 50 })
    expect(SUBROW_WEIGHTS.vision).toEqual({ visionPerMin: 60, wardsPerMin: 40 })
    expect(SUBROW_WEIGHTS.farming).toEqual({ total: 40, lane: 20, mid: 20, late: 20 })
    expect([...ANALYZABLE_QUEUES].sort((a, b) => a - b)).toEqual([400, 420, 430, 440, 480, 490, 700])
    expect(PHASES.map((p) => [p.key, p.startSec, p.endSec])).toEqual([['lane', 0, 840], ['mid', 840, 1500], ['late', 1500, null]])
  })
})
