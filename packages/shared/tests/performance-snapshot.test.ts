import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '../src/match-v5'
import { recentSnapshot } from '../src/performance/snapshot'
import { game } from './analysis-fixtures'

let n = 0
function g(me: Partial<PlayerLine>, extra: Partial<MatchSummary> = {}): MatchSummary {
  n += 1
  return game(me, { matchId: `s${n}`, startedAt: new Date(Date.UTC(2026, 9, 1, n)).toISOString(), ...extra })
}

describe('recentSnapshot (owner, 2026-10-27: op.gg-style "Recent 20 games" block)', () => {
  it('record, average K/D/A per game, KDA ratio, top 3 champions and the main role share over the newest N games', () => {
    const all = [
      g({ championId: 222, championName: 'Jinx', role: 'BOTTOM', kills: 10, deaths: 2, assists: 6, win: true }),
      g({ championId: 222, championName: 'Jinx', role: 'BOTTOM', kills: 4, deaths: 6, assists: 4, win: false }),
      g({ championId: 51, championName: 'Caitlyn', role: 'BOTTOM', kills: 6, deaths: 4, assists: 8, win: true }),
      g({ championId: 103, championName: 'Ahri', role: 'MIDDLE', kills: 8, deaths: 4, assists: 2, win: true }),
      g({ championId: 1, championName: 'Annie', role: 'MIDDLE', kills: 0, deaths: 0, assists: 0, win: false }, { queueId: 450 }), // ARAM: out
      g({ championId: 1, championName: 'Annie', role: 'MIDDLE', kills: 0, deaths: 0, assists: 0, win: false }, { remake: true }), // remake: out
    ]
    const s = recentSnapshot(all, 20)
    expect(s).toMatchObject({ games: 4, wins: 3, losses: 1, winRate: 75, kills: 7, deaths: 4, assists: 5, kda: 3 })
    expect(s.champions).toEqual([
      { championId: 222, championName: 'Jinx', games: 2, winRate: 50 },
      { championId: 103, championName: 'Ahri', games: 1, winRate: 100 },
      { championId: 51, championName: 'Caitlyn', games: 1, winRate: 100 },
    ])
    expect(s.mainRole).toEqual({ role: 'BOTTOM', pct: 75 })
  })
  it('keeps only the newest N and is empty-safe', () => {
    const many = Array.from({ length: 25 }, (_, i) => g({ championId: 222, championName: 'Jinx', kills: 1, deaths: 1, assists: 1, win: i < 5 }))
    expect(recentSnapshot(many, 20).games).toBe(20)
    expect(recentSnapshot([], 20)).toMatchObject({ games: 0, wins: 0, losses: 0, winRate: null, kda: null, champions: [], mainRole: null })
  })
  it('a perfect KDA (no deaths) is reported as null ratio with the averages intact', () => {
    expect(recentSnapshot([g({ kills: 3, deaths: 0, assists: 3, win: true })], 20)).toMatchObject({ kills: 3, deaths: 0, assists: 3, kda: null })
  })
})
