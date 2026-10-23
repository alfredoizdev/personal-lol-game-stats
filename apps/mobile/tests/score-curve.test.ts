import { describe, it, expect } from 'vitest'
import { ratioCurvePoints, diffCurvePoints, ratingBands } from '../src/lib/score-curve'

describe('score curve data', () => {
  it('ratio curve samples the spec breakpoints exactly', () => {
    const pts = ratioCurvePoints()
    const at = (x: number) => pts.find((p) => Math.abs(p.x - x) < 1e-9)!.y
    expect(at(0.5)).toBe(0)
    expect(at(1.0)).toBe(70)
    expect(at(1.3)).toBe(100)
    expect(pts[0]!.x).toBe(0.3)
    expect(pts[pts.length - 1]!.x).toBe(1.5)
  })
  it('CS lane-diff curve samples −40 → 0, 0 → 60, +25 → 100', () => {
    const pts = diffCurvePoints('cs')
    const at = (x: number) => pts.find((p) => p.x === x)!.y
    expect(at(-40)).toBe(0)
    expect(at(0)).toBe(60)
    expect(at(25)).toBe(100)
  })
  it('rating bands cover 0–100 with the spec thresholds', () => {
    expect(ratingBands().map((b) => [b.rating, b.from, b.to])).toEqual([
      ['Poor', 0, 40],
      ['Fair', 40, 60],
      ['Good', 60, 80],
      ['Great', 80, 100],
    ])
  })
})
