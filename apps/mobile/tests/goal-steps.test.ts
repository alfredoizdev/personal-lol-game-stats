import { describe, it, expect } from 'vitest'
import { stepTarget } from '../src/lib/goal-steps'

describe('stepTarget', () => {
  it('steps each metric by its own increment and rounds to its decimals', () => {
    expect(stepTarget('csPerMin', 7, 1)).toBe(7.1)
    expect(stepTarget('csPerMin', 7, -1)).toBe(6.9)
    expect(stepTarget('kpPct', 55, -1)).toBe(54)
    expect(stepTarget('visionPerMin', 0.6, 1)).toBe(0.65)
    expect(stepTarget('deathsPer10', 1.5, 1)).toBe(1.6)
  })
  it('never goes below 0 and caps kill participation at 100', () => {
    expect(stepTarget('csPerMin', 0, -1)).toBe(0)
    expect(stepTarget('kpPct', 100, 1)).toBe(100)
  })
})
