import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '../src/match-v5'
import { recommendedPicks } from '../src/prematch/picks'
import { META_BANS, metaBansFor } from '../src/prematch/meta-bans'
import { game } from './analysis-fixtures'

const at = (i: number) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString()
let n = 0
function g(me: Partial<PlayerLine>, extra: Partial<MatchSummary> = {}): MatchSummary {
  n += 1
  return game({ championId: 222, championName: 'Jinx', role: 'BOTTOM', ...me }, { matchId: `p${n}`, startedAt: at(n), ...extra })
}
const cait = { championId: 51, championName: 'Caitlyn' }
const ez = { championId: 81, championName: 'Ezreal' }

describe('recommendedPicks (your picks for the role, from your own games)', () => {
  it('best = champions with 3+ games by win rate then games; mostPlayed = the rest by games', () => {
    const all = [
      g({ win: true, kills: 5, deaths: 2, assists: 5, csPerMin: 8 }), g({ win: true, csPerMin: 7 }), g({ win: false, csPerMin: 6 }), // Jinx 2–1
      g({ win: true, ...cait }), g({ win: true, ...cait }), g({ win: true, ...cait }), g({ win: false, ...cait }), // Caitlyn 3–1
      g({ win: false, ...ez }), g({ win: true, ...ez }), // Ezreal 1–1, few games
      g({ win: true, role: 'MIDDLE', championId: 238, championName: 'Zed' }), // other role
      g({ win: true, ...ez }, { queueId: 450 }), // ARAM ignored
    ]
    const picks = recommendedPicks(all, 'BOTTOM')
    expect(picks.best.map((p) => [p.championName, p.wins, p.games, p.winRate])).toEqual([
      ['Caitlyn', 3, 4, 75],
      ['Jinx', 2, 3, 67],
    ])
    expect(picks.best[1]).toMatchObject({ avgCsPerMin: 7, fewGames: false })
    expect(picks.mostPlayed.map((p) => [p.championName, p.games, p.fewGames])).toEqual([['Ezreal', 2, true]])
  })
  it('is empty without games in that role', () => {
    expect(recommendedPicks([], 'TOP')).toEqual({ best: [], mostPlayed: [] })
  })
})

describe('META_BANS (curated per patch, option 1)', () => {
  it('lists five distinct champions per role with Data Dragon ids and names, and says when it was updated', () => {
    for (const role of ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const) {
      const rows = metaBansFor(role)
      expect(rows).toHaveLength(5)
      expect(new Set(rows.map((r) => r.championId)).size).toBe(5)
      for (const r of rows) {
        expect(r.championId).toBeGreaterThan(0)
        expect(r.championName.length).toBeGreaterThan(1)
      }
    }
    expect(META_BANS.updatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
