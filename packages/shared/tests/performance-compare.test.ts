import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '../src/match-v5'
import { mainRole, tierComparison, weakestRow } from '../src/performance/compare'
import { game } from './analysis-fixtures'

let n = 0
function g(me: Partial<PlayerLine>, extra: Partial<MatchSummary> = {}): MatchSummary {
  n += 1
  return game({ role: 'MIDDLE', ...me }, { matchId: `c${n}`, startedAt: new Date(Date.UTC(2026, 9, 1, n)).toISOString(), ...extra })
}

// 30-minute games, team kills 20: csPerMin 6.0, KP (k+a)/20, deaths/10 = deaths/3, vision/min = visionScore/30
const mid = (p: Partial<PlayerLine> = {}) => g({ csPerMin: 6.0, kills: 5, deaths: 6, assists: 5, visionScore: 30, ...p })

describe('tierComparison (owner, 2026-10-27: "tampoco hay comparativas")', () => {
  it('your role averages next to the typical value of your tier, with the signed gap and who is ahead', () => {
    const rows = tierComparison([mid(), mid(), mid()], 'Gold', 'MIDDLE')
    expect(rows.map((r) => r.metric)).toEqual(['csPerMin', 'kpPct', 'deathsPer10', 'visionPerMin'])
    const cs = rows.find((r) => r.metric === 'csPerMin')!
    expect(cs).toMatchObject({ label: 'CS / min', you: 6.0, bench: 6.3, delta: -0.3, better: false, decimals: 1, suffix: '' })
    const kp = rows.find((r) => r.metric === 'kpPct')!
    expect(kp).toMatchObject({ you: 50, bench: 45, delta: 5, better: true, suffix: '%' })
    const deaths = rows.find((r) => r.metric === 'deathsPer10')!
    expect(deaths).toMatchObject({ you: 2.0, bench: 1.8, delta: 0.2, better: false }) // fewer is better
    const vision = rows.find((r) => r.metric === 'visionPerMin')!
    expect(vision).toMatchObject({ you: 1.0, bench: 0.95, better: true })
    expect(weakestRow(rows)).toBe('deathsPer10') // the largest relative gap where the tier is ahead
  })
  it('support has no CS row; a tier without a rank compares with Gold', () => {
    const rows = tierComparison([mid({ role: 'UTILITY' })], null, 'UTILITY')
    expect(rows.map((r) => r.metric)).toEqual(['kpPct', 'deathsPer10', 'visionPerMin'])
    expect(rows[0]!.bench).toBe(54) // support KP ladder at Gold
  })
  it('only games in that role count; no games → rows with you = null and no verdict', () => {
    const rows = tierComparison([mid({ role: 'TOP', csPerMin: 9 })], 'Gold', 'MIDDLE')
    expect(rows[0]).toMatchObject({ you: null, delta: null, better: null, bench: 6.3 })
  })
  it('mainRole is the most played role in the window', () => {
    expect(mainRole([mid(), mid({ role: 'TOP' }), mid()])).toBe('MIDDLE')
    expect(mainRole([])).toBeNull()
  })
})
