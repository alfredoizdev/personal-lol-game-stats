import { describe, it, expect } from 'vitest'
import type { LeagueStatus } from '@lpp/shared'
import { liveLabel, statusLabel } from '@shared/status-label'

const summoner = {
  displayName: 'Hide on bush',
  gameName: 'Hide on bush',
  tagLine: 'KR1',
  summonerLevel: 1,
  profileIconId: 1,
  puuid: 'p',
}

describe('statusLabel', () => {
  it('CLOSED', () => {
    expect(statusLabel({ state: 'CLOSED' })).toBe('League is not running')
  })
  it('STARTING', () => {
    expect(statusLabel({ state: 'STARTING' })).toBe('League is starting…')
  })
  it('CONNECTED shows the Riot ID', () => {
    const s: LeagueStatus = { state: 'CONNECTED', summoner, lcu: { port: 1 } }
    expect(statusLabel(s)).toBe('Connected as Hide on bush#KR1')
  })
  it('ERROR shows the reason', () => {
    expect(statusLabel({ state: 'ERROR', reason: 'LCU 401' })).toBe('Error: LCU 401')
  })
})

describe('liveLabel · idle phases (phase 8)', () => {
  it('names the end-of-game screen and the lobby instead of a flat "Not in a game"', () => {
    expect(liveLabel({ kind: 'idle', phase: 'EndOfGame' })).toBe('Match ended')
    expect(liveLabel({ kind: 'idle', phase: 'WaitingForStats' })).toBe('Match ended')
    expect(liveLabel({ kind: 'idle', phase: 'Lobby' })).toBe('In lobby')
    expect(liveLabel({ kind: 'idle', phase: 'None' })).toBe('Not in a game')
    expect(liveLabel({ kind: 'idle' })).toBe('Not in a game')
  })
})
