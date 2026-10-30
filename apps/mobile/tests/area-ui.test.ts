import { describe, it, expect } from 'vitest'
import { ratingColor } from '../src/lib/area-ui'
import { colors } from '../src/theme/tokens'

describe('area ui helpers', () => {
  it('ratingColor per rating', () => {
    expect(ratingColor('Poor')).toBe(colors.loss)
    expect(ratingColor('Fair')).toBe(colors.warn)
    expect(ratingColor('Good')).toBe(colors.accent)
    expect(ratingColor('Great')).toBe(colors.win)
    expect(ratingColor(null)).toBe(colors.muted)
  })
})
