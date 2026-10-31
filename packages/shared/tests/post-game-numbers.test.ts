import { describe, it, expect } from 'vitest'
import type { LiveSnapshotV2 } from '../src/live'
import { postGameNumbers } from '../src/post-game'

const snap = (me: Partial<LiveSnapshotV2['me']> = {}, over: Partial<LiveSnapshotV2> = {}): LiveSnapshotV2 => ({
  v: 2, ts: 0, isFinal: true, gameTimeSeconds: 1800, gameMode: 'CLASSIC', queueId: 420, teamKills: 20, focus: null, events: [],
  me: { championName: 'Karma', position: 'MIDDLE', level: 16, kills: 4, deaths: 2, assists: 8, cs: 198, csPerMin: 6.6, wardScore: 30, items: [], isDead: false, respawnSec: null, ...me },
  opponent: null,
  ...over,
})

describe('postGameNumbers (owner, 2026-10-31: the ended screen says what you did well, not only the goal)', () => {
  it('one row per scored metric with your value, the typical value for your tier and a verdict (fewer deaths is better)', () => {
    // Gold mid: CS 6.3, KP 45%, deaths/10 1.8, vision/min 0.95
    const rows = postGameNumbers(snap(), 'Gold')
    expect(rows.map((r) => [r.label, r.value, r.typical, r.verdict])).toEqual([
      ['CS / min', '6.6', '6.3', 'above'],
      ['Kill participation', '60%', '45%', 'above'],
      ['Deaths per 10 min', '0.7', '1.8', 'above'],
      ['Vision score / min', '1.00', '0.95', 'above'],
    ])
    expect(postGameNumbers(snap({ deaths: 6, csPerMin: 6.3 }), 'Gold').map((r) => r.verdict)).toEqual(['even', 'above', 'below', 'above'])
  })
  it('skips a metric the role does not score (support CS) and one the game did not report', () => {
    const rows = postGameNumbers(snap({ position: 'UTILITY', wardScore: null }), 'Silver')
    expect(rows.map((r) => r.label)).toEqual(['Kill participation', 'Deaths per 10 min'])
  })
  it('is empty without a role or before the first minute', () => {
    expect(postGameNumbers(snap({ position: null }), 'Gold')).toEqual([])
    expect(postGameNumbers(snap({}, { gameTimeSeconds: 30 }), 'Gold')).toEqual([])
  })
})
