import { describe, it, expect } from 'vitest'
import type { LiveEvent } from '../src/live-events'
import type { LiveSnapshotV2 } from '../src/live'
import { alertsForSnapshot, eventLine, lastMatchLine, liveScreenMode, newEvents, PHASE_LABEL, phaseView, respawnNow } from '../src/live-view'

const ev = (over: Partial<LiveEvent>): LiveEvent => ({
  id: 1, time: 600, type: 'ChampionKill', actor: 'Yasuo', victim: 'Yone', assisters: [], actorIsMe: true, victimIsMe: false, actorIsAlly: true, meta: {}, ...over,
})
const snap = (over: Partial<LiveSnapshotV2> = {}, me: Partial<LiveSnapshotV2['me']> = {}): LiveSnapshotV2 => ({
  v: 2, ts: 1000, isFinal: false, gameTimeSeconds: 1450, gameMode: 'CLASSIC', queueId: 420, teamKills: 5,
  me: { championName: 'Yasuo', position: 'MIDDLE', level: 9, kills: 2, deaths: 1, assists: 1, cs: 100, csPerMin: 7.5, wardScore: 3, items: [], isDead: false, respawnSec: 0, ...me },
  opponent: null, focus: null, events: [], ...over,
})

describe('eventLine', () => {
  it('kills, deaths and assists from my point of view', () => {
    expect(eventLine(ev({}))).toEqual({ title: 'You killed Yone', body: null, tone: 'good' })
    expect(eventLine(ev({ actor: 'Yone', victim: 'Yasuo', actorIsMe: false, victimIsMe: true, actorIsAlly: false }))).toEqual({ title: 'Killed by Yone', body: null, tone: 'bad' })
    expect(eventLine(ev({ actor: 'Lee Sin', victim: 'Zed', actorIsMe: false, assisters: ['Yasuo', 'Jinx'] }), 'Yasuo')).toEqual({ title: 'Assist on Zed', body: 'Lee Sin killed Zed', tone: 'good' })
    expect(eventLine(ev({ actor: 'Lee Sin', victim: 'Zed', actorIsMe: false, assisters: [] }), 'Yasuo')).toEqual({ title: 'Lee Sin killed Zed', body: null, tone: 'neutral' })
  })
  it('multikills, first blood and ace', () => {
    expect(eventLine(ev({ type: 'Multikill', victim: null, meta: { killStreak: 2 } }))?.title).toBe('Double kill!')
    expect(eventLine(ev({ type: 'Multikill', victim: null, meta: { killStreak: 5 } }))?.title).toBe('Penta kill!')
    expect(eventLine(ev({ type: 'Multikill', actor: 'Yone', actorIsMe: false, actorIsAlly: false, victim: null, meta: { killStreak: 3 } }))).toEqual({ title: 'Yone · Triple kill', body: null, tone: 'bad' })
    expect(eventLine(ev({ type: 'FirstBlood', victim: null }))).toEqual({ title: 'First blood', body: 'Yasuo', tone: 'good' })
    expect(eventLine(ev({ type: 'Ace', actor: 'Yone', actorIsMe: false, actorIsAlly: false, victim: null }))).toEqual({ title: 'Ace!', body: 'Enemy team', tone: 'bad' })
  })
  it('objectives and structures by team', () => {
    expect(eventLine(ev({ type: 'DragonKill', actor: 'Lee Sin', actorIsMe: false, victim: null, meta: { dragonType: 'Fire' } }))).toEqual({ title: 'Your team took Dragon', body: 'Infernal', tone: 'good' })
    expect(eventLine(ev({ type: 'BaronKill', actor: 'Yone', actorIsMe: false, actorIsAlly: false, victim: null }))).toEqual({ title: 'Enemy team took Baron', body: null, tone: 'bad' })
    expect(eventLine(ev({ type: 'DragonKill', actor: 'Yone', actorIsMe: false, actorIsAlly: false, victim: null, meta: { dragonType: 'Elder', stolen: true } }))).toEqual({ title: 'Enemy team took Dragon', body: 'Elder · stolen', tone: 'bad' })
    expect(eventLine(ev({ type: 'TurretKilled', actor: 'Lee Sin', actorIsMe: false, victim: 'Turret' }))).toEqual({ title: 'Turret down', body: 'Lee Sin', tone: 'good' })
    expect(eventLine(ev({ type: 'TurretKilled', actor: null, actorIsAlly: false, actorIsMe: false, victim: 'Turret' }))).toEqual({ title: 'Your turret fell', body: null, tone: 'bad' })
    expect(eventLine(ev({ type: 'InhibKilled', actor: null, actorIsAlly: null, actorIsMe: false, victim: 'Inhibitor' }))).toEqual({ title: 'Inhibitor down', body: null, tone: 'neutral' })
  })
  it('skips events that are not worth a line', () => {
    expect(eventLine(ev({ type: 'GameStart', actor: null, victim: null, actorIsMe: false, actorIsAlly: null }))).toBeNull()
    expect(eventLine(ev({ type: 'MinionsSpawning', actor: null, victim: null, actorIsMe: false, actorIsAlly: null }))).toBeNull()
  })
  it('never uses an instruction word', () => {
    const forbidden = /\b(should|try|need|needs|more|less|must|go|push|ward|farm|back|group|focus)\b/i
    const types: LiveEvent['type'][] = ['FirstBlood', 'ChampionKill', 'Multikill', 'Ace', 'DragonKill', 'HeraldKill', 'BaronKill', 'TurretKilled', 'InhibKilled', 'GameEnd']
    for (const type of types) {
      for (const [actorIsMe, actorIsAlly] of [[true, true], [false, true], [false, false]] as const) {
        const line = eventLine(ev({ type, actorIsMe, actorIsAlly, victimIsMe: !actorIsMe && type === 'ChampionKill', meta: { killStreak: 2, dragonType: 'Fire', result: 'Win' } }))
        if (line) expect(`${line.title} ${line.body ?? ''}`).not.toMatch(forbidden)
      }
    }
  })
})

describe('newEvents / alertsForSnapshot', () => {
  it('returns only unseen events, in order', () => {
    const seen = new Set([1, 2])
    expect(newEvents(seen, [ev({ id: 1 }), ev({ id: 2 }), ev({ id: 3 }), ev({ id: 4 })]).map((e) => e.id)).toEqual([3, 4])
  })
  it('emits one alert per unseen event with a line, plus a goal alert on a status flip', () => {
    const s = snap({ events: [ev({ id: 7 }), ev({ id: 8, type: 'GameStart', actor: null, victim: null, actorIsMe: false, actorIsAlly: null })] })
    const alerts = alertsForSnapshot({ seen: new Set(), snapshot: s, goalPrev: 'on_track', goalNext: 'below', goalText: '7.0 CS/min', goalNow: '6.2' })
    expect(alerts.map((a) => a.kind)).toEqual(['goal', 'kill'])
    expect(alerts[0]).toEqual({ id: 'goal:below', kind: 'goal', title: 'Below goal', body: 'Goal 7.0 CS/min · now 6.2', tone: 'bad' })
    expect(alerts[1]?.id).toBe('event:7')
  })
  it('no goal alert on the first known status or when unchanged; a death alert carries the respawn time', () => {
    const s = snap({ events: [ev({ id: 1, actor: 'Yone', victim: 'Yasuo', actorIsMe: false, victimIsMe: true, actorIsAlly: false })] }, { isDead: true, respawnSec: 24 })
    const first = alertsForSnapshot({ seen: new Set(), snapshot: s, goalPrev: null, goalNext: 'on_track', goalText: 'x', goalNow: '1' })
    expect(first.map((a) => a.kind)).toEqual(['death'])
    expect(first[0]).toMatchObject({ title: 'Killed by Yone', body: 'Back in 24 s', tone: 'bad' })
    const same = alertsForSnapshot({ seen: new Set([1]), snapshot: s, goalPrev: 'on_track', goalNext: 'on_track', goalText: 'x', goalNow: '1' })
    expect(same).toEqual([])
  })
})

describe('respawnNow', () => {
  it('counts down from the last snapshot and clamps at zero', () => {
    const p = { isDead: true, respawnSec: 17.4 }
    expect(respawnNow(p, 1_000, 1_000)).toBe(18)
    expect(respawnNow(p, 1_000, 11_000)).toBe(8) // 7.4 s left → the game shows 8
    expect(respawnNow(p, 1_000, 30_000)).toBeNull()
  })
  it('is null when alive or unknown', () => {
    expect(respawnNow({ isDead: false, respawnSec: 0 }, 0, 0)).toBeNull()
    expect(respawnNow({ isDead: null, respawnSec: null }, 0, 0)).toBeNull()
  })
})

describe('phaseView', () => {
  it('labels every phase and runs the queue timer from since + elapsed', () => {
    expect(PHASE_LABEL.Matchmaking).toBe('Searching for a match')
    expect(PHASE_LABEL.ReadyCheck).toBe('Match found')
    expect(PHASE_LABEL.ChampSelect).toBe('Champion select')
    expect(PHASE_LABEL.GameStart).toBe('Loading into the game…')
    expect(PHASE_LABEL.Lobby).toBe('In lobby')
    expect(phaseView({ v: 1, ts: 0, phase: 'Matchmaking', since: 80_000 }, 10_000, 13_500)).toEqual({ label: 'Searching for a match', timer: '1:23' })
    expect(phaseView({ v: 1, ts: 0, phase: 'ChampSelect', since: 0 }, 0, 0)).toEqual({ label: 'Champion select', timer: null })
  })
  it('falls back to waiting when there is no phase or it is older than 30 s', () => {
    expect(phaseView(null, 0, 0)).toEqual({ label: 'Waiting for a match', timer: null })
    expect(phaseView({ v: 1, ts: 0, phase: 'Matchmaking', since: 0 }, 0, 31_000)).toEqual({ label: 'Waiting for a match', timer: null })
    expect(phaseView({ v: 1, ts: 0, phase: 'None', since: 0 }, 0, 0)).toEqual({ label: 'Waiting for a match', timer: null })
  })
})

describe('liveScreenMode', () => {
  it('pre before a game, live during, ended right after, after when the client leaves the game or 60 s pass', () => {
    expect(liveScreenMode({ view: 'waiting', endedAtMs: null, nowMs: 0, phase: 'Lobby', dismissed: false })).toBe('pre')
    expect(liveScreenMode({ view: 'live', endedAtMs: null, nowMs: 0, phase: 'InProgress', dismissed: false })).toBe('live')
    expect(liveScreenMode({ view: 'stale', endedAtMs: null, nowMs: 0, phase: 'InProgress', dismissed: false })).toBe('live')
    expect(liveScreenMode({ view: 'ended', endedAtMs: 1_000, nowMs: 5_000, phase: 'InProgress', dismissed: false })).toBe('ended')
    expect(liveScreenMode({ view: 'ended', endedAtMs: 1_000, nowMs: 5_000, phase: 'EndOfGame', dismissed: false })).toBe('after')
    expect(liveScreenMode({ view: 'ended', endedAtMs: 1_000, nowMs: 61_001, phase: null, dismissed: false })).toBe('after')
    expect(liveScreenMode({ view: 'ended', endedAtMs: 1_000, nowMs: 5_000, phase: null, dismissed: false })).toBe('ended')
  })
  it('a dismissed after-card goes back to pre; an expired ended snapshot is pre', () => {
    expect(liveScreenMode({ view: 'ended', endedAtMs: 1_000, nowMs: 70_000, phase: 'Lobby', dismissed: true })).toBe('pre')
    expect(liveScreenMode({ view: 'waiting', endedAtMs: 1_000, nowMs: 700_000, phase: 'Lobby', dismissed: false })).toBe('pre')
  })
})

describe('lastMatchLine', () => {
  it('summarises the ended game', () => {
    expect(lastMatchLine(snap({ gameTimeSeconds: 1450 }), { text: '7.0 CS/min', met: true })).toBe('Yasuo · 24:10 · Goal met')
    expect(lastMatchLine(snap({ gameTimeSeconds: 1450 }), { text: '7.0 CS/min', met: false })).toBe('Yasuo · 24:10 · Goal missed')
    expect(lastMatchLine(snap({ gameTimeSeconds: null }), null)).toBe('Yasuo · --:--')
  })
})
