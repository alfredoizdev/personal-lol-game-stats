import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine, Role } from '../src/match-v5'
import { analyzeMatch } from '../src/analysis/areas'
import { performanceTier } from '../src/analysis/performance-tier'
import { performanceProfile, PERIODS, RECENT_N, ROLE_LABEL } from '../src/performance/profile'
import { game, line } from './analysis-fixtures'

/** The worked ADC example (score 82) and a weak game (single digits). */
const STRONG: Partial<PlayerLine> = { kills: 6, deaths: 3, assists: 8, cs: 210, csPerMin: 7, visionScore: 27, wardsPlaced: 9, wardsKilled: 3, damageToChampions: 24000 }
const WEAK: Partial<PlayerLine> = { kills: 1, deaths: 8, assists: 2, cs: 120, csPerMin: 4, visionScore: 6, wardsPlaced: 2 }

let n = 0
/** Each call is one day newer than the previous one. */
function g(me: Partial<PlayerLine>, extra: Partial<MatchSummary> = {}, opp: Partial<PlayerLine> | null = null): MatchSummary {
  n += 1
  const role: Role = (me.role as Role | undefined) ?? 'BOTTOM'
  return game(
    { championId: 222, championName: 'Jinx', role, ...me },
    { matchId: `g${n}`, startedAt: new Date(Date.UTC(2026, 0, 1 + n)).toISOString(), opponent: opp ? line({ puuid: 'opp', participantId: 6, role, ...opp }) : null, ...extra },
  )
}
const score = (s: MatchSummary) => {
  const a = analyzeMatch({ summary: s, series: null, baseline: null })
  return a.analyzable ? a.overall : null
}
const win = (me: Partial<PlayerLine> = STRONG, extra: Partial<MatchSummary> = {}, opp: Partial<PlayerLine> | null = null) => g({ ...me, win: true }, extra, opp)
const loss = (me: Partial<PlayerLine> = WEAK, extra: Partial<MatchSummary> = {}, opp: Partial<PlayerLine> | null = null) => g({ ...me, win: false }, extra, opp)

describe('performanceProfile — overview', () => {
  it('is empty and honest with no games', () => {
    const p = performanceProfile([], 20)
    expect(p).toMatchObject({ period: 20, games: 0, wins: 0, winRate: null, avgScore: null, tier: null, recent: [], streak: null, roles: [], strongestRole: null, weakestRole: null, areas: [], weakestArea: null, champions: [], toughest: [], best: [], matchupGames: 0, previousAvgScore: null, previousN: 0, bestScore: null, worstScore: null })
    expect(p.headline).toBe("No Summoner's Rift games loaded yet.")
    expect(PERIODS).toEqual([20, 50, 100])
  })
  it('keeps only analyzable games, newest first, and never more than the period', () => {
    const all = [...Array.from({ length: 25 }, () => win()), win(STRONG, { queueId: 450 }), win(STRONG, { remake: true })]
    expect(performanceProfile(all, 20).games).toBe(20)
    const seven = Array.from({ length: 7 }, () => win())
    const p = performanceProfile(seven, 50)
    expect(p.games).toBe(7)
    expect(p.headline).toContain('over 7 games')
  })
  it('averages the match score (same as the Matches rows) and names the tier', () => {
    const older = loss()
    const newer = win()
    const p = performanceProfile([older, newer], 20)
    expect(score(newer)).toBe(82)
    const expected = Math.round((82 + score(older)!) / 2)
    expect(p).toMatchObject({ games: 2, wins: 1, winRate: 50, avgScore: expected, tier: performanceTier(expected) })
    expect(p.recent).toEqual([
      { matchId: older.matchId, win: false, score: score(older), championName: 'Jinx' },
      { matchId: newer.matchId, win: true, score: 82, championName: 'Jinx' },
    ])
    expect(p.headline).toBe('Only 2 games loaded — load more for a clearer picture.')
  })
  it('compares with the previous window of the same size and reports the best and worst game', () => {
    const older = [loss(), loss(), loss(), loss(), loss()] // games 21–25 (older)
    const recent = Array.from({ length: 19 }, () => win()).concat([loss()]) // 20 newest
    const p = performanceProfile([...older, ...recent], 20)
    expect(p.games).toBe(20)
    expect(p.previousN).toBe(5)
    expect(p.previousAvgScore).toBe(score(older[0]!))
    expect(p.bestScore).toBe(82)
    expect(p.worstScore).toBe(score(older[0]!))
    const only = performanceProfile(recent, 20)
    expect(only.previousAvgScore).toBeNull()
    expect(only.previousN).toBe(0)
  })
  it('recent is oldest → newest, capped at RECENT_N', () => {
    const all = Array.from({ length: 12 }, () => win())
    const p = performanceProfile(all, 20)
    expect(RECENT_N).toBe(10)
    expect(p.recent.map((r) => r.matchId)).toEqual(all.slice(2).map((s) => s.matchId))
  })
  it('streak needs two games in a row; a whole period can be one streak', () => {
    expect(performanceProfile([win(), loss(), loss(), loss()], 20).streak).toEqual({ kind: 'loss', n: 3 })
    expect(performanceProfile([win(), loss()], 20).streak).toBeNull()
    expect(performanceProfile([loss(), win(), win()], 20).streak).toEqual({ kind: 'win', n: 2 })
    expect(performanceProfile(Array.from({ length: 10 }, () => loss()), 20).streak).toEqual({ kind: 'loss', n: 10 })
  })
})

describe('performanceProfile — roles', () => {
  it('lists roles by games then role order, ranks only roles with 3+ games', () => {
    const all = [
      win({ ...STRONG, role: 'MIDDLE' }), win({ ...STRONG, role: 'MIDDLE' }), loss({ ...STRONG, role: 'MIDDLE' }),
      win({ ...WEAK, role: 'TOP' }), loss({ ...WEAK, role: 'TOP' }), loss({ ...WEAK, role: 'TOP' }),
      win({ ...STRONG, role: 'JUNGLE' }), win({ ...STRONG, role: 'JUNGLE' }),
      win({ ...STRONG, role: null }), // no role: counted in the overview, not in roles
    ]
    const p = performanceProfile(all, 20)
    expect(p.games).toBe(9)
    expect(p.roles.map((r) => [r.role, r.games, r.wins, r.winRate, r.fewGames])).toEqual([
      ['TOP', 3, 1, 33, false],
      ['MIDDLE', 3, 2, 67, false],
      ['JUNGLE', 2, 2, 100, true],
    ])
    expect(p.roles[1]!.avgScore).toBe(score(all[0]!))
    expect(p.strongestRole).toBe('MIDDLE')
    expect(p.weakestRole).toBe('TOP')
    expect(ROLE_LABEL).toEqual({ TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support' })
  })
  it('a single rankable role is strongest and there is no weakest', () => {
    const all = [win({ role: 'MIDDLE' }), win({ role: 'MIDDLE' }), win({ role: 'MIDDLE' }), loss({ role: 'TOP' }), loss({ role: 'TOP' })]
    const p = performanceProfile(all, 20)
    expect(p.strongestRole).toBe('MIDDLE')
    expect(p.weakestRole).toBeNull()
  })
})

describe('performanceProfile — areas', () => {
  it('averages farming, combat and vision scores and sub-rows with the mean role target; lane never', () => {
    const all = [win({ ...STRONG, role: 'BOTTOM' }), win({ ...STRONG, role: 'MIDDLE', csPerMin: 6 }), win({ ...STRONG, role: 'MIDDLE' })]
    const p = performanceProfile(all, 20)
    expect(p.areas.map((a) => a.key)).toEqual(['farming', 'combat', 'vision'])
    const farming = p.areas[0]!
    const scores = all.map((s) => analyzeMatch({ summary: s, series: null, baseline: null })).map((a) => (a.analyzable ? a.areas.find((x) => x.key === 'farming')!.score! : 0))
    expect(farming.n).toBe(3)
    expect(farming.avgScore).toBe(Math.round(scores.reduce((a, b) => a + b, 0) / 3))
    expect(farming.rating).toBe('Good')
    expect(farming.subrows).toEqual([{ key: 'total', label: 'CS / min', avg: 6.7, target: 7.2, decimals: 1, suffix: '', n: 3 }])
    const combat = p.areas[1]!
    expect(combat.subrows.map((r) => r.key)).toEqual(['kp', 'deaths'])
    expect(combat.subrows[0]).toMatchObject({ label: 'Kill participation', avg: 70, target: 55, decimals: 0, suffix: '%', n: 3 })
    expect(p.weakestArea).toBe('farming')
  })
  it('a support has no farming area; the weakest is picked among the rest', () => {
    const all = [win({ ...STRONG, role: 'UTILITY', csPerMin: 1 }), win({ ...STRONG, role: 'UTILITY', csPerMin: 1 }), loss({ ...WEAK, role: 'UTILITY', csPerMin: 1 })]
    const p = performanceProfile(all, 20)
    expect(p.areas.map((a) => a.key)).toEqual(['combat', 'vision'])
    expect(['combat', 'vision']).toContain(p.weakestArea)
  })
  it('needs 3 scored games to name a weakest area', () => {
    expect(performanceProfile([win(), loss()], 20).weakestArea).toBeNull()
  })
})

describe('performanceProfile — champions and matchups', () => {
  it('lists champions by games with their most-played role, tier and few-games flag, at most 8', () => {
    const all = [
      win({ championId: 222, championName: 'Jinx', role: 'BOTTOM' }), win({ championId: 222, championName: 'Jinx', role: 'BOTTOM' }), loss({ championId: 222, championName: 'Jinx', role: 'MIDDLE' }),
      win({ championId: 51, championName: 'Caitlyn' }),
      ...Array.from({ length: 8 }, (_, i) => win({ championId: 1000 + i, championName: `C${i}` })),
    ]
    const p = performanceProfile(all, 20)
    expect(p.champions.length).toBe(8)
    expect(p.champions[0]).toMatchObject({ championId: 222, championName: 'Jinx', role: 'BOTTOM', games: 3, wins: 2, winRate: 67, fewGames: false })
    expect(p.champions[0]!.tier).toBe(performanceTier(p.champions[0]!.avgScore!))
    expect(p.champions[1]).toMatchObject({ championName: 'C0', games: 1, fewGames: true })
  })
  it('groups lane opponents by champion and role, needs 2 games, sorts toughest and best', () => {
    const draven = { championId: 119, championName: 'Draven' }
    const cait = { championId: 51, championName: 'Caitlyn' }
    const all = [
      loss(WEAK, {}, draven), loss(WEAK, {}, draven), win(STRONG, {}, draven), // 1/3
      win(STRONG, {}, cait), win(STRONG, {}, cait), // 2/2
      loss(WEAK, {}, { championId: 81, championName: 'Ezreal' }), // once → ignored
      loss({ ...WEAK, role: 'MIDDLE' }, {}, { ...draven, role: 'MIDDLE' }), loss({ ...WEAK, role: 'MIDDLE' }, {}, { ...draven, role: 'MIDDLE' }), // Draven mid 0/2
      loss(WEAK, {}, { championId: 1, championName: 'Annie', role: 'MIDDLE' }), loss(WEAK, {}, { championId: 1, championName: 'Annie', role: 'MIDDLE' }), // role mismatch → ignored
    ]
    const p = performanceProfile(all, 20)
    expect(p.toughest.map((m) => [m.championName, m.role, m.games, m.wins, m.winRate, m.fewGames])).toEqual([
      ['Draven', 'MIDDLE', 2, 0, 0, true],
      ['Draven', 'BOTTOM', 3, 1, 33, false],
    ])
    expect(p.best.map((m) => [m.championName, m.role, m.winRate])).toEqual([['Caitlyn', 'BOTTOM', 100]])
  })
  it('matchups use every loaded game, not just the period, and say how many', () => {
    const draven = { championId: 119, championName: 'Draven' }
    const old = [loss(WEAK, {}, draven), loss(WEAK, {}, draven)]
    const recent = Array.from({ length: 20 }, () => win())
    const p = performanceProfile([...old, ...recent], 20)
    expect(p.games).toBe(20)
    expect(p.matchupGames).toBe(22)
    expect(p.toughest.map((m) => [m.championName, m.games])).toEqual([['Draven', 2]])
  })
  it('an even matchup (50 %) is in neither list', () => {
    const mf = { championId: 21, championName: 'MissFortune' }
    const p = performanceProfile([win(STRONG, {}, mf), loss(WEAK, {}, mf)], 20)
    expect(p.toughest).toEqual([])
    expect(p.best).toEqual([])
  })
  it('limits toughest to 5 and best to 3', () => {
    const lost = Array.from({ length: 7 }, (_, i) => [loss(WEAK, {}, { championId: 10 + i, championName: `E${i}` }), loss(WEAK, {}, { championId: 10 + i, championName: `E${i}` })]).flat()
    const won = Array.from({ length: 4 }, (_, i) => [win(STRONG, {}, { championId: 30 + i, championName: `W${i}` }), win(STRONG, {}, { championId: 30 + i, championName: `W${i}` })]).flat()
    const p = performanceProfile([...lost, ...won], 20)
    expect(p.toughest.length).toBe(5)
    expect(p.best.length).toBe(3)
  })
})

describe('performanceProfile — headline', () => {
  it('states the record, the strongest role and the weakest area', () => {
    const all = [
      win({ ...STRONG, role: 'MIDDLE' }), win({ ...STRONG, role: 'MIDDLE' }), win({ ...STRONG, role: 'MIDDLE' }),
      loss({ ...WEAK, role: 'TOP' }), loss({ ...WEAK, role: 'TOP' }), loss({ ...WEAK, role: 'TOP' }),
    ]
    expect(performanceProfile(all, 20).headline).toBe('50% win rate over 6 games · strongest as Mid · Farming is your weakest area')
  })
})
