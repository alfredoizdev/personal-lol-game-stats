import type { MatchSummary, PlayerLine, Role } from '../src/match-v5'
import type { TimelineSeries } from '../src/analysis/timeline-series'

export function line(p: Partial<PlayerLine> & { role?: Role | null }): PlayerLine {
  return {
    puuid: 'me', participantId: 1, championId: 1, championName: 'Jinx', role: 'BOTTOM',
    kills: 0, deaths: 0, assists: 0, cs: 0, csPerMin: 0, visionScore: 0, wardsPlaced: 0, wardsKilled: 0,
    damageToChampions: 0, gold: 0, level: 1, items: [0, 0, 0, 0, 0, 0], trinket: 0, win: false, ...p,
  }
}

export function game(me: Partial<PlayerLine>, extra: Partial<MatchSummary> = {}): MatchSummary {
  return {
    matchId: 'NA1_1', queueId: 420, queueLabel: 'Ranked Solo', gameMode: 'CLASSIC', durationSec: 1800,
    startedAt: '2026-10-21T00:00:00.000Z', remake: false, teamKills: 20, me: line(me), opponent: null, ...extra,
  }
}

/** The worked example in docs/ANALYSIS.md: a 30-minute ranked ADC game. */
export const ADC_ME: Partial<PlayerLine> = {
  participantId: 4, role: 'BOTTOM', kills: 6, deaths: 3, assists: 8, cs: 210, csPerMin: 7.0,
  visionScore: 27, wardsPlaced: 9, wardsKilled: 3, damageToChampions: 24000,
}
export const ADC_OPP: PlayerLine = line({
  puuid: 'opp', participantId: 9, championName: 'Caitlyn', role: 'BOTTOM', kills: 4, deaths: 5, assists: 6,
  cs: 195, csPerMin: 6.5, visionScore: 18, wardsPlaced: 6, wardsKilled: 1, damageToChampions: 21000,
})
export const ADC_GAME: MatchSummary = game(ADC_ME, { opponent: ADC_OPP })

/** cs / gold / xp per frame for participants 4 (me) and 9 (opponent); everyone else 0. */
export function adcSeries(): TimelineSeries {
  const rows: Array<[t: number, csMe: number, csOpp: number, goldMe: number, goldOpp: number, xpMe: number, xpOpp: number]> = [
    [0, 0, 0, 500, 500, 0, 0],
    [600, 75, 70, 4000, 3800, 4500, 4300],
    [840, 105, 95, 5500, 5300, 6300, 6100],
    [900, 112, 104, 6000, 5700, 6800, 6500],
    [1500, 170, 160, 10000, 9600, 11000, 10700],
    [1800, 210, 195, 12500, 12000, 13500, 13100],
  ]
  const arr = (me: number, opp: number) => Array.from({ length: 10 }, (_, i) => (i === 3 ? me : i === 8 ? opp : 0))
  return {
    v: 1,
    matchId: 'NA1_1',
    participants: Array.from({ length: 10 }, (_, i) => ({ participantId: i + 1, puuid: i === 3 ? 'me' : i === 8 ? 'opp' : `p${i + 1}` })),
    frames: rows.map(([t, cm, co, gm, go, xm, xo]) => ({ t, cs: arr(cm, co), gold: arr(gm, go), xp: arr(xm, xo) })),
  }
}
