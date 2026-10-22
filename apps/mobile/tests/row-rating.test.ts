import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '@lpp/shared'
import { quickRating } from '../src/lib/row-rating'

function line(p: Partial<PlayerLine>): PlayerLine {
  return {
    puuid: 'me', participantId: 1, championId: 222, championName: 'Jinx', role: 'BOTTOM',
    kills: 6, deaths: 3, assists: 8, cs: 210, csPerMin: 7, visionScore: 27, wardsPlaced: 9, wardsKilled: 3,
    damageToChampions: 24000, gold: 12000, level: 16, items: [0, 0, 0, 0, 0, 0], trinket: 0, win: true, ...p,
  }
}
function game(p: Partial<PlayerLine> = {}, extra: Partial<MatchSummary> = {}): MatchSummary {
  return {
    matchId: 'NA1_1', queueId: 420, queueLabel: 'Ranked Solo', gameMode: 'CLASSIC', durationSec: 1800,
    startedAt: '2026-10-21T00:00:00.000Z', remake: false, teamKills: 20, me: line(p), opponent: null, ...extra,
  }
}

describe('quickRating', () => {
  it('rates an analyzable game from match data alone (no timeline, no baseline)', () => {
    const r = quickRating(game())!
    expect(r.score).toBe(82) // Farming 61 (total only), Combat 99, Vision 96 → (61·35 + 99·30 + 96·15) / 80
    expect(r.tier).toBe('8+')
    expect(r.label).toBe('Strong Game')
  })
  it('is null for ARAM, bots and remakes', () => {
    expect(quickRating(game({}, { queueId: 450 }))).toBeNull()
    expect(quickRating(game({}, { queueId: 830 }))).toBeNull()
    expect(quickRating(game({}, { remake: true }))).toBeNull()
  })
})
