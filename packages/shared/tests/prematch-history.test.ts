import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '../src/match-v5'
import { banSuggestion, bestRole, BEST_ROLE_MIN_GAMES, championSummary, lastRole, playedChampions, playedRoles, roleSummary, toughestMatchups, banPick } from '../src/prematch/history'
import { game, line } from './analysis-fixtures'

const at = (i: number) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString()
let n = 0
function g(me: Partial<PlayerLine>, opp: Partial<PlayerLine> | null, extra: Partial<MatchSummary> = {}): MatchSummary {
  n += 1
  return game({ championId: 222, championName: 'Jinx', role: 'BOTTOM', ...me }, { matchId: `g${n}`, startedAt: at(n), opponent: opp ? line({ puuid: 'opp', participantId: 6, role: 'BOTTOM', ...opp }) : null, ...extra })
}
const draven = { championId: 119, championName: 'Draven' }
const cait = { championId: 51, championName: 'Caitlyn' }

describe('championSummary', () => {
  it('counts analyzable games with that champion and role, with averages', () => {
    const all = [
      g({ win: true, kills: 6, deaths: 3, assists: 9, csPerMin: 7 }, null),
      g({ win: true, kills: 4, deaths: 2, assists: 6, csPerMin: 8 }, null),
      g({ win: false, kills: 2, deaths: 6, assists: 2, csPerMin: 6 }, null),
      g({ win: true, csPerMin: 9 }, null, { queueId: 450 }), // ARAM ignored
      g({ win: true, csPerMin: 9 }, null, { remake: true }), // remake ignored
      g({ win: true, championId: 51, championName: 'Caitlyn', csPerMin: 9 }, null), // other champion
      g({ win: true, role: 'MIDDLE', csPerMin: 9 }, null), // other role
    ]
    const s = championSummary(all, 222, 'BOTTOM')
    expect(s.games).toBe(3)
    expect(s.wins).toBe(2)
    expect(s.winRate).toBe(67)
    expect(s.avgKda).toBeCloseTo(((6 + 9) / 3 + (4 + 6) / 2 + (2 + 2) / 6) / 3, 2)
    expect(s.avgCsPerMin).toBe(7)
    expect(s.fewGames).toBe(false)
  })
  it('flags few games under 3 and nulls the averages with 0 games', () => {
    expect(championSummary([g({ win: true }, null), g({ win: false }, null)], 222, 'BOTTOM').fewGames).toBe(true)
    expect(championSummary([], 222, 'BOTTOM')).toEqual({ games: 0, wins: 0, winRate: null, avgKda: null, avgCsPerMin: null, fewGames: true })
  })
})

describe('toughestMatchups', () => {
  it('groups by lane opponent in that role, needs 2 games, sorts by win rate then games then name', () => {
    const all = [
      g({ win: false }, draven), g({ win: false }, draven), g({ win: true }, draven), g({ win: false }, draven), g({ win: false }, draven), // 1/5
      g({ win: false }, cait), g({ win: true }, cait), // 1/2
      g({ win: false }, { championId: 81, championName: 'Ezreal' }), // 1 game → not listed
      g({ win: false, championId: 51, championName: 'Caitlyn' }, { championId: 67, championName: 'Vayne' }), g({ win: true, championId: 51, championName: 'Caitlyn' }, { championId: 67, championName: 'Vayne' }), // as another champion: still counts (role grouping), 1/2
      g({ win: false }, null), // no opponent → ignored
      g({ win: false, role: 'MIDDLE' }, { championId: 1, championName: 'Annie', role: 'MIDDLE' }), // other role
    ]
    const rows = toughestMatchups(all, 'BOTTOM')
    expect(rows.map((r) => [r.championName, r.games, r.wins, r.winRate, r.fewGames])).toEqual([
      ['Draven', 5, 1, 20, false],
      ['Caitlyn', 2, 1, 50, true],
      ['Vayne', 2, 1, 50, true],
    ])
  })
  it('respects the limit', () => {
    const all = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap((name, i) => [g({ win: false }, { championId: i + 10, championName: name }), g({ win: false }, { championId: i + 10, championName: name })])
    expect(toughestMatchups(all, 'BOTTOM').length).toBe(5)
    expect(toughestMatchups(all, 'BOTTOM', 2).length).toBe(2)
  })
})

describe('banSuggestion', () => {
  it('names the worst matchup with ≥ 3 games and < 40 % win rate', () => {
    const rows = toughestMatchups([g({ win: false }, draven), g({ win: false }, draven), g({ win: true }, draven), g({ win: false }, draven), g({ win: false }, draven)], 'BOTTOM')
    expect(banSuggestion(rows, 'Bot')).toBe('You lost 4 of 5 games against Draven as Bot. Consider banning it.')
  })
  it('falls back when no matchup has 3 games under 40 %', () => {
    const two = toughestMatchups([g({ win: false }, draven), g({ win: false }, draven)], 'BOTTOM')
    expect(banSuggestion(two, 'Bot')).toBe('Not enough games against a single champion to suggest a ban.')
    const even = toughestMatchups([g({ win: false }, cait), g({ win: true }, cait), g({ win: true }, cait), g({ win: false }, cait)], 'BOTTOM')
    expect(banSuggestion(even, 'Bot')).toBe('Not enough games against a single champion to suggest a ban.')
  })
})

describe('playedChampions / lastRole', () => {
  it('lists champions played in that role by games, then name', () => {
    const all = [g({}, null), g({}, null), g({ championId: 51, championName: 'Caitlyn' }, null), g({ championId: 81, championName: 'Ezreal' }, null), g({ role: 'MIDDLE', championId: 1, championName: 'Annie' }, null)]
    expect(playedChampions(all, 'BOTTOM')).toEqual([
      { championId: 222, championName: 'Jinx', games: 2 },
      { championId: 51, championName: 'Caitlyn', games: 1 },
      { championId: 81, championName: 'Ezreal', games: 1 },
    ])
  })
  it('lastRole is the role of the newest analyzable game, null when none', () => {
    const all = [g({ role: 'MIDDLE' }, null), g({ role: 'TOP' }, null, { queueId: 450 })]
    expect(lastRole(all)).toBe('MIDDLE')
    expect(lastRole([])).toBeNull()
  })
})

describe('roleSummary / playedRoles (Prepare by role, 2026-10-23)', () => {
  it('roleSummary is your record in that role, whatever champion you played', () => {
    const all = [
      g({ win: true, kills: 6, deaths: 3, assists: 9, csPerMin: 7 }, null),
      g({ win: false, kills: 2, deaths: 6, assists: 2, csPerMin: 6, ...cait }, null),
      g({ win: true, csPerMin: 9 }, null, { queueId: 450 }), // ARAM ignored
      g({ win: true, role: 'MIDDLE', csPerMin: 9 }, null), // other role
    ]
    const s = roleSummary(all, 'BOTTOM')
    expect(s.games).toBe(2)
    expect(s.wins).toBe(1)
    expect(s.winRate).toBe(50)
    expect(s.avgCsPerMin).toBe(6.5)
    expect(s.fewGames).toBe(true)
    expect(roleSummary([], 'TOP')).toEqual({ games: 0, wins: 0, winRate: null, avgKda: null, avgCsPerMin: null, fewGames: true })
  })
  it('playedRoles lists the roles you queued by games, most played first', () => {
    const all = [g({}, null), g({}, null), g({ role: 'MIDDLE' }, null), g({ role: 'UTILITY' }, null), g({ role: 'UTILITY' }, null), g({ role: 'UTILITY' }, null), g({ role: 'TOP' }, null, { queueId: 450 })]
    expect(playedRoles(all)).toEqual([
      { role: 'UTILITY', games: 3 },
      { role: 'BOTTOM', games: 2 },
      { role: 'MIDDLE', games: 1 },
    ])
    expect(playedRoles([])).toEqual([])
  })
})

describe('bestRole (owner, 2026-10-27: a mark on the role you play best)', () => {
  const r = (role: PlayerLine['role'], win: boolean) => g({ role, win }, null)
  it('is the role with the highest win rate among roles with enough games; ties go to the role with more games', () => {
    const all = [
      ...Array.from({ length: 5 }, (_, i) => r('UTILITY', i < 4)), // 80 % over 5
      ...Array.from({ length: 10 }, (_, i) => r('MIDDLE', i < 6)), // 60 % over 10
      ...Array.from({ length: 2 }, () => r('TOP', true)), // 100 % but only 2 games
    ]
    expect(BEST_ROLE_MIN_GAMES).toBe(5)
    expect(bestRole(all)).toEqual({ role: 'UTILITY', games: 5, winRate: 80 })
    const tie = [...Array.from({ length: 5 }, (_, i) => r('UTILITY', i < 3)), ...Array.from({ length: 10 }, (_, i) => r('MIDDLE', i < 6))] // both 60 %
    expect(bestRole(tie)?.role).toBe('MIDDLE')
  })
  it('is null until some role has enough games', () => {
    expect(bestRole([])).toBeNull()
    expect(bestRole(Array.from({ length: 4 }, () => r('TOP', true)))).toBeNull()
  })
})

describe('banPick (owner, 2026-10-30: Prepare shows one ban line, no matchups table)', () => {
  it('is the first opponent you lost to often enough, else null', () => {
    const rows = [
      { championId: 1, championName: 'Zed', games: 2, wins: 1, winRate: 50, fewGames: true },
      { championId: 2, championName: 'Ahri', games: 5, wins: 1, winRate: 20, fewGames: false },
    ]
    expect(banPick(rows)?.championName).toBe('Ahri')
    expect(banPick([rows[0]!])).toBeNull()
  })
})
