import { describe, it, expect } from 'vitest'
import {
  buildLiveSnapshot,
  liveViewState,
  stillLoading,
  parseLiveSnapshot,
  shouldPublish,
  type LiveSnapshotV2,
  type RawAllGameData,
  type RawLivePlayer,
} from '../src/live'

const ME = { gameName: 'Hexed', tagLine: '7551' }

function player(p: Omit<Partial<RawLivePlayer>, 'team'> & { team: 'ORDER' | 'CHAOS' }): RawLivePlayer {
  return {
    riotIdGameName: p.riotIdGameName ?? 'Someone',
    riotIdTagLine: p.riotIdTagLine ?? 'NA1',
    summonerName: p.summonerName,
    championName: p.championName ?? 'Annie',
    team: p.team,
    position: p.position ?? 'TOP',
    level: p.level ?? 1,
    scores: p.scores ?? { kills: 0, deaths: 0, assists: 0, creepScore: 0, wardScore: 0 },
    items: p.items ?? [],
  }
}

function raw(opts: { me?: Omit<Partial<RawLivePlayer>, 'team'>; enemies?: RawLivePlayer[]; allies?: RawLivePlayer[]; gameTime?: number }): RawAllGameData {
  const me = player({
    riotIdGameName: 'Hexed', riotIdTagLine: '7551', championName: 'Yasuo', position: 'MIDDLE', level: 11,
    scores: { kills: 4, deaths: 1, assists: 3, creepScore: 112, wardScore: 9 },
    items: [{ itemID: 3031 }, { itemID: 0 }, { itemID: 3006 }],
    ...opts.me,
    team: 'ORDER',
  })
  const allies = opts.allies ?? [
    player({ team: 'ORDER', position: 'TOP', scores: { kills: 2, deaths: 0, assists: 1, creepScore: 90, wardScore: 5 } }),
    player({ team: 'ORDER', position: 'JUNGLE', scores: { kills: 1, deaths: 2, assists: 5, creepScore: 80, wardScore: 12 } }),
  ]
  const enemies = opts.enemies ?? [
    player({ team: 'CHAOS', position: 'MIDDLE', championName: 'Yone', level: 10, scores: { kills: 3, deaths: 4, assists: 2, creepScore: 100, wardScore: 6 }, items: [{ itemID: 6673 }] }),
    player({ team: 'CHAOS', position: 'TOP' }),
  ]
  return {
    activePlayer: { riotIdGameName: 'Hexed', riotIdTagLine: '7551', level: 11 },
    allPlayers: [me, ...allies, ...enemies],
    gameData: { gameTime: opts.gameTime ?? 872, gameMode: 'CLASSIC' },
  }
}

const extra = { ts: 1_000_000, queueId: 420, isFinal: false, focus: null }

describe('buildLiveSnapshot', () => {
  it('maps me and the lane opponent with nullable numbers', () => {
    const s = buildLiveSnapshot(raw({}), ME, extra)
    expect(s).not.toBeNull()
    expect(s!.v).toBe(2)
    expect(s!.gameTimeSeconds).toBe(872)
    expect(s!.gameMode).toBe('CLASSIC')
    expect(s!.queueId).toBe(420)
    expect(s!.teamKills).toBe(7) // 4 + 2 + 1
    expect(s!.me).toEqual({
      championName: 'Yasuo', position: 'MIDDLE', level: 11, kills: 4, deaths: 1, assists: 3, cs: 112, csPerMin: 7.7, wardScore: 9, items: [3031, 0, 3006, 0, 0, 0, 0], isDead: null, respawnSec: null,
    })
    expect(s!.opponent).toMatchObject({ championName: 'Yone', position: 'MIDDLE', cs: 100, csPerMin: 6.9, items: [6673, 0, 0, 0, 0, 0, 0] })
  })

  it('csPerMin is null under 60 s of game time', () => {
    const s = buildLiveSnapshot(raw({ gameTime: 30 }), ME, extra)
    expect(s!.me.csPerMin).toBeNull()
    expect(s!.opponent?.csPerMin).toBeNull()
  })

  it('opponent is null when two enemies share my position', () => {
    const s = buildLiveSnapshot(
      raw({ enemies: [player({ team: 'CHAOS', position: 'MIDDLE' }), player({ team: 'CHAOS', position: 'MIDDLE' })] }),
      ME,
      extra,
    )
    expect(s!.opponent).toBeNull()
  })

  it('ARAM (empty position) has no role and no opponent', () => {
    const s = buildLiveSnapshot(raw({ me: { position: '' }, enemies: [player({ team: 'CHAOS', position: '' })] }), ME, extra)
    expect(s!.me.position).toBeNull()
    expect(s!.opponent).toBeNull()
  })

  it('matches the active player case-insensitively and falls back to summonerName', () => {
    expect(buildLiveSnapshot(raw({}), { gameName: 'hexed', tagLine: '7551' }, extra)).not.toBeNull()
    const legacy = raw({ me: { riotIdGameName: '', riotIdTagLine: '', summonerName: 'Hexed' } })
    expect(buildLiveSnapshot(legacy, ME, extra)).not.toBeNull()
  })

  it('places items by slot so the trinket stays in slot 6 with a partial inventory', () => {
    const s = buildLiveSnapshot(raw({ me: { items: [{ itemID: 1055, slot: 0 }, { itemID: 3363, slot: 6 }] } }), ME, extra)!
    expect(s.me.items).toEqual([1055, 0, 0, 0, 0, 0, 3363])
  })

  it('rounds the live vision score to a whole number', () => {
    const s = buildLiveSnapshot(
      raw({ me: { scores: { kills: 0, deaths: 0, assists: 0, creepScore: 0, wardScore: 13.0152835845 } }, enemies: [player({ team: 'CHAOS', position: 'MIDDLE', scores: { kills: 0, deaths: 0, assists: 0, creepScore: 0, wardScore: 7.5 } })] }),
      ME,
      extra,
    )!
    expect(s.me.wardScore).toBe(13)
    expect(s.opponent?.wardScore).toBe(8)
  })

  it('returns null when the player is not in allPlayers', () => {
    expect(buildLiveSnapshot(raw({}), { gameName: 'Nobody', tagLine: 'XX' }, extra)).toBeNull()
  })

  it('carries isFinal and focus through', () => {
    const s = buildLiveSnapshot(raw({}), ME, { ...extra, isFinal: true, focus: { metric: 'csPerMin', target: 7 } })
    expect(s!.isFinal).toBe(true)
    expect(s!.focus).toEqual({ metric: 'csPerMin', target: 7 })
  })
})

describe('buildLiveSnapshot · death and events (phase 8)', () => {
  it('carries isDead / respawnSec for me and the opponent, and normalized events', () => {
    const r = raw({})
    Object.assign(r.allPlayers![0]!, { isDead: true, respawnTimer: 17.4 })
    r.events = { Events: [{ EventID: 1, EventName: 'ChampionKill', EventTime: 500, KillerName: 'Someone#NA1', VictimName: 'Hexed#7551', Assisters: [] }] }
    const s = buildLiveSnapshot(r, ME, extra)!
    expect(s.me.isDead).toBe(true)
    expect(s.me.respawnSec).toBe(17.4)
    expect(s.opponent?.isDead).toBeNull() // the fixture opponent has no isDead field
    expect(s.events.length).toBe(1)
    expect(s.events[0]?.victimIsMe).toBe(true)
  })
  it('leaves death fields null and events empty when the Live Client does not send them', () => {
    const s = buildLiveSnapshot(raw({}), ME, extra)!
    expect(s.me.isDead).toBeNull()
    expect(s.me.respawnSec).toBeNull()
    expect(s.events).toEqual([])
  })
})

describe('parseLiveSnapshot', () => {
  const good = buildLiveSnapshot(raw({}), ME, extra)!
  it('round-trips a built snapshot', () => {
    expect(parseLiveSnapshot(JSON.parse(JSON.stringify(good)))).toEqual(good)
  })
  it('rejects foreign or corrupted payloads', () => {
    expect(parseLiveSnapshot({})).toBeNull()
    expect(parseLiveSnapshot({ v: 1 })).toBeNull()
    expect(parseLiveSnapshot({ players: [], gameTimeSec: 10 })).toBeNull()
    expect(parseLiveSnapshot({ ...good, me: { ...good.me, kills: '3' } })).toBeNull()
    expect(parseLiveSnapshot(null)).toBeNull()
    expect(parseLiveSnapshot('x')).toBeNull()
  })
  it('defaults the phase 8 fields when an older desktop omits them', () => {
    const s = buildLiveSnapshot(raw({}), ME, extra)!
    const wire = JSON.parse(JSON.stringify(s)) as Record<string, unknown>
    delete wire.events
    delete (wire.me as Record<string, unknown>).isDead
    delete (wire.me as Record<string, unknown>).respawnSec
    const parsed = parseLiveSnapshot(wire)!
    expect(parsed.events).toEqual([])
    expect(parsed.me.isDead).toBeNull()
    expect(parsed.me.respawnSec).toBeNull()
  })
  it('rejects a snapshot whose events are malformed', () => {
    const s = buildLiveSnapshot(raw({}), ME, extra)!
    expect(parseLiveSnapshot({ ...s, events: [{ id: 'x' }] })).toBeNull()
    expect(parseLiveSnapshot({ ...s, me: { ...s.me, isDead: 'yes' } })).toBeNull()
  })
  it('accepts a snapshot without opponent', () => {
    expect(parseLiveSnapshot({ ...good, opponent: null })).toEqual({ ...good, opponent: null })
  })
})

describe('liveViewState', () => {
  const base = buildLiveSnapshot(raw({}), ME, extra)!
  it('waiting without a snapshot', () => {
    expect(liveViewState(null, 0)).toBe('waiting')
  })
  it('live when fresh, stale after 15 s, ended when final', () => {
    expect(liveViewState(base, base.ts + 3_000)).toBe('live')
    expect(liveViewState(base, base.ts + 16_000)).toBe('stale')
    expect(liveViewState({ ...base, isFinal: true }, base.ts + 60_000)).toBe('ended')
  })
  it('an ended snapshot expires back to waiting after 10 minutes', () => {
    expect(liveViewState({ ...base, isFinal: true }, base.ts + 9 * 60_000)).toBe('ended')
    expect(liveViewState({ ...base, isFinal: true }, base.ts + 11 * 60_000)).toBe('waiting')
  })
  it('measures age from when the phone received it, not the desktop clock', () => {
    const ahead = { ...base, ts: base.ts + 60_000 } // desktop clock a minute ahead
    expect(liveViewState(ahead, base.ts + 3_000, 15_000, base.ts)).toBe('live')
    expect(liveViewState(ahead, base.ts + 20_000, 15_000, base.ts)).toBe('stale')
  })
  it('a stale non-final snapshot expires back to waiting after 10 minutes too', () => {
    expect(liveViewState(base, base.ts + 11 * 60_000)).toBe('waiting')
  })
})

describe('stillLoading (owner, 2026-10-30: "aparece reconnecting mientras el juego aún está cargando")', () => {
  const base = buildLiveSnapshot(raw({}), ME, extra)!
  it('a snapshot at 0:00 means the loading screen: the Live Client answers once and then stalls until the game starts', () => {
    expect(stillLoading({ ...base, gameTimeSeconds: 0 })).toBe(true)
  })
  it('once the clock runs, a stall is a real reconnect', () => {
    expect(stillLoading({ ...base, gameTimeSeconds: 1 })).toBe(false)
    expect(stillLoading({ ...base, gameTimeSeconds: 900 })).toBe(false)
    expect(stillLoading({ ...base, gameTimeSeconds: null })).toBe(false)
  })
  it('a final snapshot is never loading', () => {
    expect(stillLoading({ ...base, gameTimeSeconds: 0, isFinal: true })).toBe(false)
  })
})

describe('shouldPublish', () => {
  const a = buildLiveSnapshot(raw({}), ME, extra)!
  it('publishes the first snapshot', () => {
    expect(shouldPublish(null, a)).toBe(true)
  })
  it('skips an identical snapshot within the heartbeat window', () => {
    expect(shouldPublish(a, { ...a, ts: a.ts + 3_000 })).toBe(false)
  })
  it('publishes after the heartbeat interval even if unchanged', () => {
    expect(shouldPublish(a, { ...a, ts: a.ts + 10_000 })).toBe(true)
  })
  it('publishes on any data change and on final', () => {
    const b: LiveSnapshotV2 = { ...a, ts: a.ts + 2_000, me: { ...a.me, cs: 113 } }
    expect(shouldPublish(a, b)).toBe(true)
    expect(shouldPublish(a, { ...a, ts: a.ts + 1_000, isFinal: true })).toBe(true)
  })
})
