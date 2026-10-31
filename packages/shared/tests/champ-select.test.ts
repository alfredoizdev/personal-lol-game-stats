import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '../src/match-v5'
import { champSelectPicks } from '../src/prematch/picks'
import { champSelectBans } from '../src/prematch/bans'
import type { MatchupRow } from '../src/prematch/history'
import { game } from './analysis-fixtures'

const at = (i: number) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString()
let n = 0
function g(me: Partial<PlayerLine>): MatchSummary {
  n += 1
  return game({ championId: 222, championName: 'Jinx', role: 'BOTTOM', ...me }, { matchId: `c${n}`, startedAt: at(n) })
}
const cait = { championId: 51, championName: 'Caitlyn' }
const ez = { championId: 81, championName: 'Ezreal' }
const kai = { championId: 145, championName: "Kai'Sa" }

describe('champSelectPicks (the three picks the carousel shows)', () => {
  it('takes the best win-rate champions first, then fills with the most played, three in all', () => {
    const all = [
      g({ win: true }), g({ win: true }), g({ win: false }), // Jinx 2–1
      g({ win: true, ...cait }), g({ win: true, ...cait }), g({ win: true, ...cait }), g({ win: false, ...cait }), // Caitlyn 3–1
      g({ win: false, ...ez }), g({ win: true, ...ez }), // Ezreal 1–1, few games
      g({ win: true, ...kai }), // Kai'Sa 1–0, few games
    ]
    const picks = champSelectPicks(all, 'BOTTOM')
    expect(picks.map((p) => [p.championName, p.reason])).toEqual([
      ['Caitlyn', 'best'],
      ['Jinx', 'best'],
      ['Ezreal', 'mostPlayed'],
    ])
  })
  it('never shows a champion you have a losing record with (owner, 2026-10-30: a 0W 2L top pick is not a pick)', () => {
    const all = [
      g({ win: false, ...ez }), g({ win: false, ...ez }), // Ezreal 0–2, few games: out
      g({ win: false, ...cait }), g({ win: false, ...cait }), g({ win: true, ...cait }), // Caitlyn 1–2: out even with 3+ games
      g({ win: true, ...kai }), g({ win: false, ...kai }), // Kai'Sa 1–1: even record stays
      g({ win: true }), // Jinx 1–0: stays
    ]
    expect(champSelectPicks(all, 'BOTTOM').map((p) => [p.championName, p.reason])).toEqual([
      ['Kai\'Sa', 'mostPlayed'],
      ['Jinx', 'mostPlayed'],
    ])
    expect(champSelectPicks([g({ win: false }), g({ win: false })], 'BOTTOM')).toEqual([])
  })
  it('returns fewer than three when the role has fewer champions, and none without games', () => {
    expect(champSelectPicks([g({ win: true })], 'BOTTOM').map((p) => p.championName)).toEqual(['Jinx'])
    expect(champSelectPicks([], 'TOP')).toEqual([])
  })
})

const row = (championId: number, championName: string, wins: number, games: number): MatchupRow => ({ championId, championName, wins, games, winRate: Math.round((wins / games) * 100), fewGames: games < 3 })

describe('champSelectBans (three from your games, three from the meta)', () => {
  const meta = [
    { championId: 1, championName: 'Annie' },
    { championId: 2, championName: 'Olaf' },
    { championId: 3, championName: 'Galio' },
    { championId: 4, championName: 'Twisted Fate' },
    { championId: 5, championName: 'Xin Zhao' },
  ]
  it('history = the lane opponents you lose to, worst first, at most three; meta = the first three not already listed', () => {
    const matchups = [row(2, 'Olaf', 1, 5), row(10, 'Draven', 2, 6), row(11, 'Lucian', 1, 4), row(12, 'Ashe', 3, 6), row(13, 'Sivir', 4, 5)]
    const bans = champSelectBans(matchups, meta)
    expect(bans.history.map((r) => r.championName)).toEqual(['Olaf', 'Draven', 'Lucian'])
    expect(bans.meta.map((r) => r.championName)).toEqual(['Annie', 'Galio', 'Twisted Fate'])
  })
  it('never lists a champion you beat as a history ban, and still gives three meta bans with no history', () => {
    const bans = champSelectBans([row(12, 'Ashe', 4, 6)], meta)
    expect(bans.history).toEqual([])
    expect(bans.meta.map((r) => r.championName)).toEqual(['Annie', 'Olaf', 'Galio'])
  })
})
