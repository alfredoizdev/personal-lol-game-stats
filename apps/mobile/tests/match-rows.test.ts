import { describe, it, expect } from 'vitest'
import { toRowStates, type DetailResult } from '../src/lib/match-rows'
import { matchKeys } from '../src/lib/match-keys'
import { RiotApiError } from '../src/lib/riot-api'
import type { MatchV5 } from '@lpp/shared'

const identity = { puuid: 'ME', gameName: 'Me', tagLine: 'NA1' }

function blob(id: string, withMe = true): MatchV5 {
  const me = { puuid: 'ME', championId: 1, championName: 'Annie', teamId: 100, teamPosition: 'MIDDLE', kills: 1, deaths: 1, assists: 1, totalMinionsKilled: 10, neutralMinionsKilled: 0, visionScore: 1, totalDamageDealtToChampions: 1, goldEarned: 1, champLevel: 1, win: true, item0: 0, item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: 0 }
  return { metadata: { matchId: id, participants: [] }, info: { gameCreation: 0, gameDuration: 1000, gameMode: 'CLASSIC', queueId: 420, participants: withMe ? [me] : [] } }
}

describe('toRowStates', () => {
  it('drops NOT_FOUND rows, keeps other errors, maps ready rows, and only the visible window', () => {
    const ids = ['a', 'b', 'c', 'd']
    const results: DetailResult[] = [
      { status: 'success', data: blob('a') },
      { status: 'error', error: new RiotApiError('NOT_FOUND') },
      { status: 'error', error: new RiotApiError('RATE_LIMITED') },
      { status: 'pending' },
    ]
    const rows = toRowStates(ids, results, identity, 3)
    expect(rows.map((r) => r.matchId)).toEqual(['a', 'c'])
    expect(rows[0]).toMatchObject({ status: 'ready' })
    expect(rows[1]).toEqual({ matchId: 'c', status: 'error', error: 'RATE_LIMITED' })
  })

  it('maps a blob without the player to not-participant', () => {
    const rows = toRowStates(['x'], [{ status: 'success', data: blob('x', false) }], identity, 10)
    expect(rows[0]).toEqual({ matchId: 'x', status: 'not-participant' })
  })

  it('a blob that makes the summarizer throw becomes an UNKNOWN error row, not a crash', () => {
    const broken = { metadata: { matchId: 'z' } } as unknown as MatchV5
    const rows = toRowStates(['z'], [{ status: 'success', data: broken }], identity, 10)
    expect(rows[0]).toEqual({ matchId: 'z', status: 'error', error: 'UNKNOWN' })
  })

  it('pending rows are loading', () => {
    expect(toRowStates(['p'], [{ status: 'pending' }], identity, 10)[0]).toEqual({ matchId: 'p', status: 'loading' })
  })
})

describe('matchKeys', () => {
  it('ids keys differ per account', () => {
    expect(matchKeys.ids('a', 20)).not.toEqual(matchKeys.ids('b', 20))
    expect(matchKeys.ids('a', 20)).toContain('a')
  })
})
