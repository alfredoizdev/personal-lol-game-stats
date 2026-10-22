import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '@lpp/shared'
import { resultLetter, resultOf } from '../src/lib/result-badge'

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

describe('resultLetter', () => {
  it('maps win to V, loss to D and remake to R', () => {
    expect(resultLetter('win')).toBe('V')
    expect(resultLetter('loss')).toBe('D')
    expect(resultLetter('remake')).toBe('R')
  })
})

describe('resultOf', () => {
  it('is remake when the summary is a remake, regardless of win', () => {
    expect(resultOf(game({ win: true }, { remake: true }))).toBe('remake')
    expect(resultOf(game({ win: false }, { remake: true }))).toBe('remake')
  })

  it('is win or loss from me.win otherwise', () => {
    expect(resultOf(game({ win: true }))).toBe('win')
    expect(resultOf(game({ win: false }))).toBe('loss')
  })
})
