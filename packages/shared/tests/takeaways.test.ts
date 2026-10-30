import { describe, it, expect } from 'vitest'
import { analyzeMatch } from '../src/analysis/areas'
import { takeaways } from '../src/analysis/takeaways'
import { game, line } from './analysis-fixtures'

// 30-minute ADC game: huge farm, far too many deaths — the two ends are unambiguous.
const OPP = line({ puuid: 'opp', participantId: 9, role: 'BOTTOM', csPerMin: 6.5, deaths: 3, visionScore: 18, wardsPlaced: 6 })
const ME = { role: 'BOTTOM' as const, kills: 6, deaths: 15, assists: 8, csPerMin: 10.0, visionScore: 27, wardsPlaced: 9 }
const baseline = { n: 14, csPerMin: 6.5, kpPct: 60, deathsPer10: 1.4, visionPerMin: 0.7, wardsPerMin: 0.28 }

describe('takeaways (owner, 2026-10-30: one question per screen — "¿qué tal lo hice?")', () => {
  it('best and worst scored rows, each with your value and the rival as the comparison when the rival has one', () => {
    const a = analyzeMatch({ summary: game(ME, { opponent: OPP }), series: null, baseline: null })
    const t = takeaways(a, null)
    expect(t.map((x) => x.kind)).toEqual(['best', 'worst'])
    expect(t[0]).toEqual({ kind: 'best', label: 'CS / min', value: '10.0', compare: 'vs rival 6.5', tone: 'good' })
    expect(t[1]).toEqual({ kind: 'worst', label: 'Deaths per 10 min', value: '5.0', compare: 'vs rival 1.0', tone: 'bad' })
  })
  it('without a rival value it compares with your own average, and without that with the role target', () => {
    const withYou = takeaways(analyzeMatch({ summary: game(ME), series: null, baseline }), null)
    expect(withYou[0]).toMatchObject({ label: 'CS / min', compare: 'vs you 6.5' })
    const bare = takeaways(analyzeMatch({ summary: game(ME), series: null, baseline: null }), null)
    expect(bare[0]!.compare).toMatch(/^target \d/)
  })
  it('the goal verdict is the third row, coloured by the verdict', () => {
    const a = analyzeMatch({ summary: game(ME, { opponent: OPP }), series: null, baseline: null })
    const t = takeaways(a, { text: 'Your goal: 7.0 CS/min → you did 10.0 (met)', met: true })
    expect(t[2]).toEqual({ kind: 'goal', label: 'Your goal', value: 'Your goal: 7.0 CS/min → you did 10.0 (met)', compare: null, tone: 'good' })
    expect(takeaways(a, { text: 'x', met: false })[2]!.tone).toBe('bad')
    expect(takeaways(a, { text: 'x', met: null })[2]!.tone).toBe('plain')
  })
  it('a support has no farming row; with a single scored row only Best is shown; nothing for an unanalyzable game', () => {
    const t = takeaways(analyzeMatch({ summary: game({ ...ME, role: 'UTILITY' }), series: null, baseline: null }), null)
    expect(t.find((x) => x.label === 'CS / min')).toBeUndefined()
    expect(takeaways({ analyzable: false, reason: 'ARAM' }, null)).toEqual([])
    const one = takeaways({ analyzable: true, overall: 50, overallRating: 'Fair', headline: '', weakest: null, baselineN: 0, timelineMissing: true, areas: [{ key: 'combat', label: 'Combat', score: 50, rating: 'Fair', weight: 100, sentence: '', hiddenReason: null, subrows: [{ key: 'kp', label: 'Kill participation', value: 50, display: '50%', target: 55, score: 50, weight: 100, delta: { vsOpponent: null, vsYou: null }, context: false, opponentDisplay: null, youDisplay: null, targetDisplay: '55%' }] }] }, null)
    expect(one.map((x) => x.kind)).toEqual(['best'])
  })
})
