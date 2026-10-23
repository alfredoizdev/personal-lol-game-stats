import { describe, it, expect } from 'vitest'
import { buildBaseline, BASELINE_MIN_GAMES } from '../src/analysis/baseline'
import { metricsOf } from '../src/analysis/areas'
import { game, line } from './analysis-fixtures'

const at = (i: number) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString()

describe('metricsOf', () => {
  it('derives per-minute and per-10-minute rates and KP from the team total', () => {
    const m = metricsOf(line({ kills: 6, deaths: 3, assists: 8, csPerMin: 7, visionScore: 27, wardsPlaced: 9, damageToChampions: 24000 }), 1800, 20)
    expect(m).toEqual({ csPerMin: 7, kpPct: 70, deathsPer10: 1, visionPerMin: 0.9, wardsPerMin: 0.3, damagePerMin: 800 })
  })
  it('KP is null when the team has no kills; rates null for games under a minute', () => {
    expect(metricsOf(line({ kills: 1 }), 1800, 0).kpPct).toBeNull()
    expect(metricsOf(line({ deaths: 1 }), 30, 5).deathsPer10).toBeNull()
  })
})

describe('buildBaseline', () => {
  it('uses the newest 20 analyzable same-role games, excluding remakes and the open match', () => {
    const games = [
      ...Array.from({ length: 25 }, (_, i) => game({ csPerMin: i < 20 ? 8 : 2 }, { matchId: `g${i}`, startedAt: at(30 - i) })), // g0 newest
      game({ csPerMin: 1 }, { matchId: 'open', startedAt: at(40) }),
      game({ csPerMin: 1 }, { matchId: 'remake', startedAt: at(41), remake: true }),
      game({ csPerMin: 1, role: 'MIDDLE' }, { matchId: 'mid', startedAt: at(42) }),
      game({ csPerMin: 1 }, { matchId: 'aram', startedAt: at(43), queueId: 450 }),
    ]
    const b = buildBaseline(games, 'BOTTOM', 'open')
    expect(b.n).toBe(20)
    expect(b.csPerMin).toBe(8)
  })
  it('n = 0 when nothing qualifies and every mean is null', () => {
    const b = buildBaseline([game({}, { queueId: 830 })], 'BOTTOM', 'x')
    expect(b).toEqual({ n: 0, csPerMin: null, kpPct: null, deathsPer10: null, visionPerMin: null, wardsPerMin: null })
  })
  it('kpPct ignores games whose teamKills is 0', () => {
    const b = buildBaseline([game({ kills: 5, assists: 5 }, { matchId: 'a', teamKills: 20 }), game({ kills: 1 }, { matchId: 'b', teamKills: 0 })], 'BOTTOM', 'x')
    expect(b.n).toBe(2)
    expect(b.kpPct).toBe(50)
  })
  it('exposes the minimum sample size the UI labels as "few games"', () => {
    expect(BASELINE_MIN_GAMES).toBe(3)
  })
})
