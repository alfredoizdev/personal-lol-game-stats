import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '@lpp/shared'
import { aggregateMatches } from '../src/lib/match-aggregates'

function line(p: Partial<PlayerLine>): PlayerLine {
  return {
    puuid: 'me', championId: 1, championName: 'Annie', role: 'MIDDLE',
    kills: 0, deaths: 0, assists: 0, cs: 0, csPerMin: 0, visionScore: 0, damageToChampions: 0, gold: 0, level: 1,
    items: [0, 0, 0, 0, 0, 0], trinket: 0, win: false, ...p,
  }
}

function game(p: Partial<PlayerLine>, extra: Partial<MatchSummary> = {}): MatchSummary {
  return {
    matchId: 'x', queueId: 420, queueLabel: 'Ranked Solo', gameMode: 'CLASSIC', durationSec: 1800,
    startedAt: '2026-10-21T00:00:00.000Z', remake: false, me: line(p), opponent: null, ...extra,
  }
}

describe('aggregateMatches', () => {
  it('averages KDA ratio and CS/min and computes the win rate', () => {
    const r = aggregateMatches([
      game({ kills: 10, deaths: 2, assists: 4, csPerMin: 8.0, win: true }),   // kda 7.0
      game({ kills: 2, deaths: 4, assists: 2, csPerMin: 6.0, win: false }),   // kda 1.0
      game({ kills: 5, deaths: 0, assists: 5, csPerMin: 7.0, win: true }),    // kda 10.0 (deaths→1)
    ])
    expect(r).toEqual({ games: 3, avgKda: 6.0, avgCsPerMin: 7.0, winRate: 67 })
  })

  it('excludes remakes', () => {
    const r = aggregateMatches([
      game({ kills: 1, deaths: 1, assists: 1, csPerMin: 5, win: true }),
      game({ kills: 0, deaths: 0, assists: 0, csPerMin: 1, win: false }, { remake: true }),
    ])
    expect(r.games).toBe(1)
    expect(r.winRate).toBe(100)
  })

  it('ignores null csPerMin in the CS mean but keeps the game', () => {
    const r = aggregateMatches([
      game({ kills: 1, deaths: 1, assists: 1, csPerMin: 8, win: true }),
      game({ kills: 1, deaths: 1, assists: 1, csPerMin: null, win: false }),
    ])
    expect(r.games).toBe(2)
    expect(r.avgCsPerMin).toBe(8)
    expect(r.winRate).toBe(50)
  })

  it('returns nulls for an empty list', () => {
    expect(aggregateMatches([])).toEqual({ games: 0, avgKda: null, avgCsPerMin: null, winRate: null })
  })

  it('respects the limit (first N non-remake games)', () => {
    const games = Array.from({ length: 12 }, (_, i) => game({ kills: 1, deaths: 1, assists: 1, csPerMin: 5, win: i < 6 }))
    expect(aggregateMatches(games, 10).games).toBe(10)
    expect(aggregateMatches(games, 10).winRate).toBe(60)
  })
})
