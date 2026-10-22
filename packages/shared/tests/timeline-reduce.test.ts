import { describe, it, expect } from 'vitest'
import { reduceTimeline, type RiotTimeline } from '../../../supabase/functions/match-timeline/reduce'

function rawFixture(): RiotTimeline {
  const participants = Array.from({ length: 10 }, (_, i) => ({ participantId: i + 1, puuid: `p${i + 1}` }))
  const frame = (timestamp: number, scale: number) => ({
    timestamp,
    participantFrames: Object.fromEntries(
      participants.map((p) => [
        String(p.participantId),
        { participantId: p.participantId, minionsKilled: 6 * scale, jungleMinionsKilled: 2 * scale, totalGold: (500 + 20 * p.participantId) * scale, xp: 100 * scale * p.participantId },
      ]),
    ),
    events: [],
  })
  return { metadata: { matchId: 'NA1_1', participants: participants.map((p) => p.puuid) }, info: { frameInterval: 60000, frames: [frame(0, 0), frame(60012, 1)], participants } }
}

describe('reduceTimeline', () => {
  it('reduces a Riot timeline to per-frame cs/gold/xp arrays indexed by participantId − 1', () => {
    const out = reduceTimeline(rawFixture())
    expect(out).toMatchObject({ v: 1, matchId: 'NA1_1' })
    expect(out.frames.length).toBe(2)
    expect(out.frames[1]!.t).toBe(60)
    expect(out.frames[1]!.cs[0]).toBe(8)
    expect(out.frames[1]!.gold[5]).toBe(620)
    expect(out.frames[1]!.xp[9]).toBe(1000)
    expect(out.participants[5]).toEqual({ participantId: 6, puuid: 'p6' })
    expect(out.frames[0]!.cs).toEqual(new Array(10).fill(0))
  })
  it('keeps array length 10 and zero-fills a missing participant frame', () => {
    const raw = rawFixture()
    delete raw.info.frames[1]!.participantFrames['4']
    const out = reduceTimeline(raw)
    expect(out.frames[1]!.cs.length).toBe(10)
    expect(out.frames[1]!.cs[3]).toBe(0)
    expect(out.frames[1]!.cs[4]).toBe(8)
  })
  it('drops the events: the reduced payload carries only the per-minute numbers', () => {
    const out = reduceTimeline(rawFixture())
    expect(Object.keys(out).sort()).toEqual(['frames', 'matchId', 'participants', 'v'])
    expect(Object.keys(out.frames[0]!).sort()).toEqual(['cs', 'gold', 't', 'xp'])
  })
})
