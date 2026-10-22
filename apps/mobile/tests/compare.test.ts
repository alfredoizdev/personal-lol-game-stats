import { describe, it, expect } from 'vitest'
import { shareOf, cmp, signed } from '../src/lib/compare'

describe('compare helpers', () => {
  it('shareOf gives the better side the bigger share, inverts for lower-is-better, splits 0 vs 0 evenly, null on missing', () => {
    const s = shareOf(8, 14)!
    expect(s.me).toBeCloseTo(8 / 22, 3)
    expect(s.enemy).toBeCloseTo(14 / 22, 3)
    const d = shareOf(2, 6, true)!
    expect(d.me).toBeCloseTo(0.75, 3)
    expect(d.enemy).toBeCloseTo(0.25, 3)
    expect(shareOf(0, 0)).toEqual({ me: 0.5, enemy: 0.5 })
    expect(shareOf(0, 0, true)).toEqual({ me: 0.5, enemy: 0.5 })
    expect(shareOf(null, 3)).toBeNull()
    expect(shareOf(0, 5, true)).toEqual({ me: 1, enemy: 0 }) // zero deaths vs five: you take the whole bar
  })
  it('cmp and signed keep the Live tab behaviour', () => {
    expect(cmp(3, 1)).toBe('me')
    expect(cmp(1, 3)).toBe('enemy')
    expect(cmp(2, 2)).toBe('tie')
    expect(cmp(null, 2)).toBe('tie')
    expect(cmp(1, 3, true)).toBe('me')
    expect(signed(5, 3)).toBe('+2')
    expect(signed(4.7, 5.8, 1)).toBe('-1.1')
    expect(signed(3, 3)).toBe('+0')
    expect(signed(null, 3)).toBeUndefined()
  })
})
