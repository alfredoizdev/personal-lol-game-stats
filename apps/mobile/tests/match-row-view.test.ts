import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '@lpp/shared'
import { rowMeta } from '../src/lib/match-row-view'

const me: PlayerLine = { puuid: 'p', participantId: 1, championId: 51, championName: 'Caitlyn', role: 'BOTTOM', kills: 14, deaths: 5, assists: 5, cs: 230, csPerMin: 7.5, visionScore: 20, wardsPlaced: 8, wardsKilled: 2, damageToChampions: 30000, gold: 15000, level: 18, items: [1, 2, 3, 0, 0, 0], trinket: 3363, win: true }
const summary: MatchSummary = { matchId: 'NA1_1', queueId: 420, queueLabel: 'Ranked Solo', gameMode: 'CLASSIC', durationSec: 1830, startedAt: '2026-10-27T10:00:00Z', remake: false, teamKills: 35, me, opponent: null }
const NOW = Date.parse('2026-10-27T16:30:00Z')

describe('match row meta (owner, 2026-10-27: op.gg-style rows)', () => {
  it('queue name, time ago and kill participation', () => {
    expect(rowMeta(summary, NOW)).toEqual({ queue: 'Ranked Solo', when: '6h ago', kp: 'K/P 54%' })
  })
  it('no kill participation when the team has no kills', () => {
    expect(rowMeta({ ...summary, teamKills: 0 }, NOW).kp).toBeNull()
  })
})
