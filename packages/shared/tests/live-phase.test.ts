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
