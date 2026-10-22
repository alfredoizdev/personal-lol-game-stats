import { describe, it, expect } from 'vitest'
import type { MatchAnalysis, Subrow } from '@lpp/shared'
import { ratingColor, barFraction, deltaLabel, defaultArea } from '../src/lib/area-ui'
import { colors } from '../src/theme/tokens'

const subrow = (p: Partial<Subrow>): Subrow => ({
  key: 'total', label: 'CS / min', value: 7, display: '7.0', target: 7.5, score: 61, weight: 40, delta: { vsOpponent: null, vsYou: null }, context: false, ...p,
})

describe('area ui helpers', () => {
  it('ratingColor per rating', () => {
    expect(ratingColor('Poor')).toBe(colors.loss)
    expect(ratingColor('Fair')).toBe(colors.warn)
    expect(ratingColor('Good')).toBe(colors.accent)
    expect(ratingColor('Great')).toBe(colors.win)
    expect(ratingColor(null)).toBe(colors.muted)
  })
  it('barFraction is score/100 for scored rows and 0 for context rows', () => {
    expect(barFraction(subrow({ score: 61 }))).toBe(0.61)
    expect(barFraction(subrow({ score: null }))).toBe(0)
    expect(barFraction(subrow({ score: 90, context: true }))).toBe(0)
  })
  it('deltaLabel formats sign, unit, who and few games', () => {
    expect(deltaLabel(0.5, ' CS/min', 'opponent')).toBe('+0.5 CS/min vs opponent')
    expect(deltaLabel(-12, '', 'you', 14)).toBe('−12 vs you (14 games)')
    expect(deltaLabel(0, '%', 'opponent')).toBe('±0% vs opponent')
    expect(deltaLabel(null, '', 'opponent')).toBeNull()
    expect(deltaLabel(null, '', 'you', 2)).toBe('few games')
    expect(deltaLabel(1, '', 'you', 2)).toBe('few games')
  })
  it('defaultArea returns the weakest visible area, else the first visible, else null', () => {
    const analysis = { analyzable: true, weakest: 'vision', areas: [{ key: 'farming', score: 62 }, { key: 'vision', score: 10 }] } as unknown as MatchAnalysis
    expect(defaultArea(analysis)).toBe('vision')
    const noWeakest = { analyzable: true, weakest: null, areas: [{ key: 'farming', score: null, hiddenReason: 'x' }, { key: 'combat', score: 50 }] } as unknown as MatchAnalysis
    expect(defaultArea(noWeakest)).toBe('combat')
    expect(defaultArea({ analyzable: false, reason: 'r' })).toBeNull()
  })
})
