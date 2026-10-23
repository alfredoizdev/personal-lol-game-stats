import { describe, it, expect } from 'vitest'
import { buildLivePhase, parseLivePhase } from '../src/live-phase'

describe('live-phase payload', () => {
  it('round-trips', () => {
    const p = buildLivePhase('Matchmaking', 83_000, 1_000)
    expect(p).toEqual({ v: 1, ts: 1_000, phase: 'Matchmaking', since: 83_000 })
    expect(parseLivePhase(JSON.parse(JSON.stringify(p)))).toEqual(p)
  })
  it('rejects unknown phases and malformed payloads', () => {
    expect(parseLivePhase({ v: 1, ts: 1, phase: 'Dancing', since: 0 })).toBeNull()
    expect(parseLivePhase({ v: 2, ts: 1, phase: 'Lobby', since: 0 })).toBeNull()
    expect(parseLivePhase({ v: 1, ts: 'x', phase: 'Lobby', since: 0 })).toBeNull()
    expect(parseLivePhase(null)).toBeNull()
  })
})

describe('live-phase · champion select pick (phase 8, piece 2)', () => {
  it('carries the player\'s own pick during champion select and round-trips it', () => {
    const p = buildLivePhase('ChampSelect', 5_000, 1, { championId: 238, position: 'MIDDLE' })
    expect(p.pick).toEqual({ championId: 238, position: 'MIDDLE' })
    expect(parseLivePhase(JSON.parse(JSON.stringify(p)))).toEqual(p)
    expect(parseLivePhase({ v: 1, ts: 1, phase: 'ChampSelect', since: 0, pick: { championId: null, position: 'BOTTOM' } })?.pick).toEqual({ championId: null, position: 'BOTTOM' })
  })
  it('accepts a payload without a pick (older desktop) and rejects a malformed one', () => {
    expect(parseLivePhase({ v: 1, ts: 1, phase: 'Lobby', since: 0 })?.pick).toBeUndefined()
    expect(parseLivePhase({ v: 1, ts: 1, phase: 'ChampSelect', since: 0, pick: { championId: 'x', position: 'MIDDLE' } })).toBeNull()
    expect(parseLivePhase({ v: 1, ts: 1, phase: 'ChampSelect', since: 0, pick: { championId: 1, position: 'FEEDER' } })).toBeNull()
  })
})
