import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '@lpp/shared'
import { headerDonuts, winRateRating, KDA_TARGET, type HeaderDonut } from '../src/lib/header-donuts'

function line(p: Partial<PlayerLine>): PlayerLine {
  return {
    puuid: 'me', participantId: 1, championId: 1, championName: 'Annie', role: 'MIDDLE', wardsPlaced: 0, wardsKilled: 0,
    kills: 0, deaths: 0, assists: 0, cs: 0, csPerMin: 0, visionScore: 0, damageToChampions: 0, gold: 0, level: 1,
    items: [0, 0, 0, 0, 0, 0], trinket: 0, win: false, ...p,
  }
}

function game(p: Partial<PlayerLine>, extra: Partial<MatchSummary> = {}): MatchSummary {
  return {
    matchId: 'x', queueId: 420, queueLabel: 'Ranked Solo', gameMode: 'CLASSIC', durationSec: 1800,
    startedAt: '2026-10-21T00:00:00.000Z', remake: false, teamKills: 0, me: line(p), opponent: null, ...extra,
  }
}

const byKey = (summaries: MatchSummary[], limit?: number): Record<HeaderDonut['key'], HeaderDonut> =>
  Object.fromEntries(headerDonuts(summaries, limit).map((d) => [d.key, d])) as Record<HeaderDonut['key'], HeaderDonut>

describe('headerDonuts', () => {
  it('returns the three donuts in order with their labels', () => {
    const d = headerDonuts([])
    expect(d.map((x) => x.key)).toEqual(['kda', 'cs', 'winRate'])
    expect(d.map((x) => x.label)).toEqual(['Avg KDA', 'CS / min', 'Win Rate'])
  })

  it('scores the average KDA against the 3.0 target: 3.0 → 70, Good', () => {
    expect(KDA_TARGET).toBe(3.0)
    const { kda } = byKey([
      game({ kills: 6, deaths: 2, assists: 0, csPerMin: 7 }), // 3.0
      game({ kills: 3, deaths: 3, assists: 6, csPerMin: 7 }), // 3.0
    ])
    expect(kda).toEqual({ key: 'kda', label: 'Avg KDA', display: '3.0', score: 70, rating: 'Good' })
  })

  it('rates a low KDA Poor and a high KDA Great', () => {
    expect(byKey([game({ kills: 1, deaths: 2, assists: 0, csPerMin: 7 })]).kda).toMatchObject({ display: '0.5', score: 0, rating: 'Poor' })
    expect(byKey([game({ kills: 8, deaths: 1, assists: 4, csPerMin: 7 })]).kda).toMatchObject({ display: '12.0', score: 100, rating: 'Great' })
  })

  it('CS/min is the mean of per-game role-target scores and skips support games', () => {
    const { cs } = byKey([
      game({ role: 'MIDDLE', csPerMin: 7.0, kills: 1, deaths: 1, assists: 1 }),   // 7.0 / 7.0 → 70
      game({ role: 'BOTTOM', csPerMin: 9.75, kills: 1, deaths: 1, assists: 1 }),  // 9.75 / 7.5 = 1.3 → 100
      game({ role: 'UTILITY', csPerMin: 1.0, kills: 1, deaths: 1, assists: 1 }),  // no target → skipped
    ])
    expect(cs.score).toBe(85)
    expect(cs.rating).toBe('Great')
    expect(cs.display).toBe('5.9') // display still averages every non-null CS/min like the header did
  })

  it('CS/min score is null when only support games were played', () => {
    const { cs } = byKey([
      game({ role: 'UTILITY', csPerMin: 1.2, kills: 1, deaths: 1, assists: 1 }),
      game({ role: 'UTILITY', csPerMin: 0.8, kills: 1, deaths: 1, assists: 1 }),
    ])
    expect(cs.score).toBeNull()
    expect(cs.rating).toBeNull()
    expect(cs.display).toBe('1.0')
  })

  it('win rate fills the arc with the rate itself and uses its own thresholds', () => {
    const { winRate } = byKey([
      game({ win: true, kills: 1, deaths: 1, assists: 1 }),
      game({ win: false, kills: 1, deaths: 1, assists: 1 }),
      game({ win: false, kills: 1, deaths: 1, assists: 1 }),
    ])
    expect(winRate).toEqual({ key: 'winRate', label: 'Win Rate', display: '33%', score: 33, rating: 'Poor' })
  })

  it('winRateRating thresholds: < 40 Poor, 40–49 Fair, 50–59 Good, ≥ 60 Great', () => {
    expect(winRateRating(39)).toBe('Poor')
    expect(winRateRating(40)).toBe('Fair')
    expect(winRateRating(49)).toBe('Fair')
    expect(winRateRating(50)).toBe('Good')
    expect(winRateRating(59)).toBe('Good')
    expect(winRateRating(60)).toBe('Great')
  })

  it('uses the same window as aggregateMatches: remakes excluded, first `limit` games', () => {
    const games = [
      game({ win: false, kills: 0, deaths: 5, assists: 0 }, { remake: true }),
      ...Array.from({ length: 12 }, (_, i) => game({ win: i < 6, kills: 1, deaths: 1, assists: 1 })),
    ]
    expect(byKey(games, 10).winRate.score).toBe(60)
    expect(byKey(games, 10).winRate.rating).toBe('Great')
  })

  it('with no games every donut is null and displays —', () => {
    for (const d of headerDonuts([])) {
      expect(d.score).toBeNull()
      expect(d.rating).toBeNull()
      expect(d.display).toBe('—')
    }
  })
})
