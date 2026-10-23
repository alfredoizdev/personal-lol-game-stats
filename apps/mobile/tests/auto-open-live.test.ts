import { describe, it, expect } from 'vitest'
import { shouldOpenLive } from '../src/lib/auto-open-live'

describe('shouldOpenLive (jump to the Live tab when a match is found or a game starts)', () => {
  it('opens on the transition into ReadyCheck and into a live game', () => {
    expect(shouldOpenLive({ phase: 'Matchmaking', view: 'waiting' }, { phase: 'ReadyCheck', view: 'waiting' })).toBe(true)
    expect(shouldOpenLive({ phase: 'GameStart', view: 'waiting' }, { phase: 'InProgress', view: 'live' })).toBe(true)
    expect(shouldOpenLive({ phase: null, view: 'waiting' }, { phase: null, view: 'live' })).toBe(true)
  })
  it('does not open again while the state holds, nor on other transitions', () => {
    expect(shouldOpenLive({ phase: 'ReadyCheck', view: 'waiting' }, { phase: 'ReadyCheck', view: 'waiting' })).toBe(false)
    expect(shouldOpenLive({ phase: 'InProgress', view: 'live' }, { phase: 'InProgress', view: 'stale' })).toBe(false)
    expect(shouldOpenLive({ phase: 'InProgress', view: 'stale' }, { phase: 'InProgress', view: 'live' })).toBe(false)
    expect(shouldOpenLive({ phase: 'Lobby', view: 'waiting' }, { phase: 'Matchmaking', view: 'waiting' })).toBe(false)
    expect(shouldOpenLive({ phase: 'InProgress', view: 'live' }, { phase: 'EndOfGame', view: 'ended' })).toBe(false)
  })
  it('does not open on the very first observation (app just launched mid-game: the user picks the tab)', () => {
    expect(shouldOpenLive(null, { phase: 'InProgress', view: 'live' })).toBe(false)
  })
})
