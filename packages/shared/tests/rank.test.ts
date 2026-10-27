import { describe, it, expect } from 'vitest'
import { formatRank, parseRankedEntries, rankCard, rankTier, type RankEntry } from '../src/rank'

const solo: RankEntry = { queue: 'solo', tier: 'GOLD', division: 'II', leaguePoints: 45, wins: 12, losses: 8 }

describe('ranked entries (owner, 2026-10-27: the account rank shows nowhere)', () => {
  it('parses Riot league-v4 entries into solo and flex, ignoring other queues', () => {
    const raw = [
      { queueType: 'RANKED_SOLO_5x5', tier: 'GOLD', rank: 'II', leaguePoints: 45, wins: 12, losses: 8 },
      { queueType: 'RANKED_FLEX_SR', tier: 'SILVER', rank: 'I', leaguePoints: 10, wins: 3, losses: 4 },
      { queueType: 'RANKED_TFT', tier: 'DIAMOND', rank: 'IV', leaguePoints: 1, wins: 1, losses: 1 },
    ]
    expect(parseRankedEntries(raw)).toEqual({
      solo,
      flex: { queue: 'flex', tier: 'SILVER', division: 'I', leaguePoints: 10, wins: 3, losses: 4 },
      level: null,
    })
    expect(parseRankedEntries([])).toEqual({ solo: null, flex: null, level: null })
    expect(parseRankedEntries(null)).toEqual({ solo: null, flex: null, level: null })
  })
  it('formats a rank line: tier, division, LP and record; apex tiers carry no division', () => {
    expect(formatRank(solo)).toBe('Gold II · 45 LP · 12W 8L')
    expect(formatRank({ ...solo, tier: 'MASTER', division: 'I', leaguePoints: 120 })).toBe('Master · 120 LP · 12W 8L')
    expect(formatRank(null)).toBe('Unranked')
  })
  it('rankTier maps the Riot tier to the ladder tier used on the goal ruler', () => {
    expect(rankTier('GOLD')).toBe('Gold')
    expect(rankTier('EMERALD')).toBe('Emerald')
    expect(rankTier('GRANDMASTER')).toBe('Master+')
    expect(rankTier('CHALLENGER')).toBe('Master+')
    expect(rankTier(null)).toBeNull()
  })
  it('rankCard splits the standing for the op.gg-style card: tier name, LP line, record with win rate', () => {
    expect(rankCard(solo)).toEqual({ name: 'Gold II', lp: '45 LP', record: '12W 8L (60%)' })
    expect(rankCard({ ...solo, tier: 'CHALLENGER', division: 'I', leaguePoints: 812, wins: 0, losses: 0 })).toEqual({ name: 'Challenger', lp: '812 LP', record: '0W 0L' })
    expect(rankCard(null)).toEqual({ name: 'Unranked', lp: null, record: null })
  })
  it('carries the summoner level from summoner-v4 when the function sends it; null otherwise', () => {
    expect(parseRankedEntries([], { summonerLevel: 109, profileIconId: 1 }).level).toBe(109)
    expect(parseRankedEntries([], null).level).toBeNull()
    expect(parseRankedEntries([]).level).toBeNull()
  })
})
