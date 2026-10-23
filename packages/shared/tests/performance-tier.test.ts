import { describe, it, expect } from 'vitest'
import { performanceTier, TIER_LABELS, tierBucket } from '../src/analysis/performance-tier'

describe('performanceTier', () => {
  it('maps the 0–100 match score onto the ten-step ladder', () => {
    expect(performanceTier(100)).toBe('10+')
    expect(performanceTier(95)).toBe('10+')
    expect(performanceTier(94)).toBe('9+')
    expect(performanceTier(85)).toBe('9+')
    expect(performanceTier(80)).toBe('8+')
    expect(performanceTier(65)).toBe('7+')
    expect(performanceTier(55)).toBe('6+')
    expect(performanceTier(45)).toBe('5+')
    expect(performanceTier(35)).toBe('4+')
    expect(performanceTier(25)).toBe('3+')
    expect(performanceTier(15)).toBe('2+')
    expect(performanceTier(0)).toBe('1+')
  })
  it('has a label for every step and a colour bucket', () => {
    expect(TIER_LABELS['9+']).toBe('Dominant')
    expect(TIER_LABELS['7+']).toBe('Reliable')
    expect(TIER_LABELS['5+']).toBe('Needs Work')
    expect(TIER_LABELS['1+']).toBe('Disaster')
    expect(tierBucket('10+')).toBe('legendary')
    expect(tierBucket('8+')).toBe('great')
    expect(tierBucket('6+')).toBe('solid')
    expect(tierBucket('4+')).toBe('stable')
    expect(tierBucket('2+')).toBe('rough')
  })
})
