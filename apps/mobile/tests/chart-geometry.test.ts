import { describe, it, expect } from 'vitest'
import { linearScale, linePath, niceMax, phaseBands } from '../src/lib/chart-geometry'

describe('chart geometry', () => {
  it('linearScale maps domain to range', () => {
    const x = linearScale([0, 10], [100, 200])
    expect(x(0)).toBe(100)
    expect(x(5)).toBe(150)
    expect(x(10)).toBe(200)
    expect(linearScale([5, 5], [0, 100])(5)).toBe(0) // degenerate domain never divides by zero
  })
  it('linePath breaks on nulls', () => {
    expect(linePath([{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: null }, { x: 30, y: 8 }])).toBe('M0 0 L10 5 M30 8')
    expect(linePath([])).toBe('')
  })
  it('niceMax rounds up to a clean tick and never drops below the floor', () => {
    expect(niceMax([3, 187], 50)).toBe(200)
    expect(niceMax([3, 7.2], 4)).toBe(8)
    expect(niceMax([], 4)).toBe(4)
  })
  it('phaseBands for a 9-minute game is just lane; for 42 minutes all three', () => {
    expect(phaseBands(540)).toEqual([{ key: 'lane', startSec: 0, endSec: 540 }])
    expect(phaseBands(2520)).toEqual([
      { key: 'lane', startSec: 0, endSec: 840 },
      { key: 'mid', startSec: 840, endSec: 1500 },
      { key: 'late', startSec: 1500, endSec: 2520 },
    ])
    expect(phaseBands(1560).map((b) => b.key)).toEqual(['lane', 'mid']) // late needs 2 minutes
  })
})
