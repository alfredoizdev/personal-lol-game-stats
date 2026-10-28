import { describe, it, expect } from 'vitest'
import type { LiveEvent } from '../src/live-events'
import type { LiveSnapshotV2 } from '../src/live'
import { liveImpact } from '../src/live-impact'

let id = 0
const ev = (type: LiveEvent['type'], actorIsMe: boolean, assisters: string[] = [], actorIsAlly = true): LiveEvent => ({ id: ++id, time: 600, type, actor: actorIsMe ? 'Yasuo' : 'Lee Sin', victim: null, assisters, actorIsMe, victimIsMe: false, actorIsAlly, meta: {} })
const snap = (me: Partial<LiveSnapshotV2['me']> = {}, over: Partial<LiveSnapshotV2> = {}): LiveSnapshotV2 => ({
  v: 2, ts: 1, isFinal: false, gameTimeSeconds: 1200, gameMode: 'CLASSIC', queueId: 420, teamKills: 20, focus: null, opponent: null, events: [],
  me: { championName: 'Yasuo', position: 'MIDDLE', level: 11, kills: 5, deaths: 2, assists: 6, cs: 140, csPerMin: 7.0, wardScore: 12, items: [], isDead: false, respawnSec: null, ...me },
  ...over,
})

describe('liveImpact (owner, 2026-10-28: a semi-donut of your impact in the game, green what you bring, red what you do not)', () => {
  it('scores four areas against the role targets and weights them like the match score; on target reads as green', () => {
    // mid, 20 min: KP 55% (target 55), deaths/10 = 1.0 (target 1.5), CS 7.0 (target 7), vision 0.6/min (target 0.6); 2 of 2 team objectives
    const s = snap({}, { events: [ev('DragonKill', true), ev('TurretKilled', false, ['Yasuo'])] })
    const r = liveImpact(s)
    expect(r.areas.map((a) => a.key)).toEqual(['fights', 'farm', 'objectives', 'vision'])
    expect(r.areas.find((a) => a.key === 'farm')).toMatchObject({ label: 'Farm', value: '7.0 CS/min', onTarget: true })
    expect(r.areas.find((a) => a.key === 'fights')).toMatchObject({ label: 'Fights', value: '55% KP · 1.0 deaths/10', onTarget: true })
    expect(r.areas.find((a) => a.key === 'objectives')).toMatchObject({ label: 'Objectives', value: '2 of 2', onTarget: true, score: 100 })
    expect(r.areas.find((a) => a.key === 'vision')).toMatchObject({ label: 'Vision', value: '0.60 vision/min', onTarget: true })
    expect(r.score).toBeGreaterThanOrEqual(70)
    expect(['Good', 'Great']).toContain(r.rating)
  })
  it('below target reads as red, and the weakest area is the one furthest below', () => {
    const s = snap({ csPerMin: 4.0, kills: 1, assists: 1, deaths: 6 }, { events: [ev('DragonKill', false), ev('BaronKill', false)] })
    const r = liveImpact(s)
    expect(r.areas.find((a) => a.key === 'farm')?.onTarget).toBe(false)
    expect(r.areas.find((a) => a.key === 'objectives')).toMatchObject({ value: '0 of 2', onTarget: false, score: 0 })
    expect(r.score).toBeLessThan(40)
    expect(r.rating).toBe('Poor')
  })
  it('support has no farm area and its own weights; objectives unscored until the team has one; enemy objectives never count', () => {
    const s = snap({ position: 'UTILITY', csPerMin: 1.0 }, { events: [ev('DragonKill', false, [], false)] })
    const r = liveImpact(s)
    expect(r.areas.map((a) => a.key)).toEqual(['fights', 'objectives', 'vision'])
    expect(r.areas.find((a) => a.key === 'objectives')).toMatchObject({ value: 'None yet', score: null, onTarget: null })
    expect(r.score).not.toBeNull()
  })
  it('nothing before the third minute or without a game time', () => {
    expect(liveImpact(snap({}, { gameTimeSeconds: 120 })).score).toBeNull()
    expect(liveImpact(snap({}, { gameTimeSeconds: null })).score).toBeNull()
  })
  it('KP needs team kills: with none, Fights is deaths only', () => {
    const r = liveImpact(snap({ kills: 0, assists: 0, deaths: 0 }, { teamKills: 0 }))
    expect(r.areas.find((a) => a.key === 'fights')).toMatchObject({ value: '0.0 deaths/10', onTarget: true })
  })
})
