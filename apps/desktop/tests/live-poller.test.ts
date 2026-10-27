import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { GameflowPhase, RawAllGameData } from '@lpp/shared'
import { startLivePoller, type LiveState } from '@electron/league/live-poller'
import type { LockfileData } from '@electron/league/lockfile'

const lockfile: LockfileData = { port: 1, password: 'pw', protocol: 'https' }
const identity = { gameName: 'Hexed', tagLine: '7551' }

function raw(cs: number, gameTime = 600): RawAllGameData {
  return {
    activePlayer: { riotIdGameName: 'Hexed', riotIdTagLine: '7551' },
    allPlayers: [
      { riotIdGameName: 'Hexed', riotIdTagLine: '7551', championName: 'Yasuo', team: 'ORDER', position: 'MIDDLE', level: 9, scores: { kills: 2, deaths: 0, assists: 1, creepScore: cs, wardScore: 3 }, items: [] },
      { riotIdGameName: 'Foe', riotIdTagLine: 'NA1', championName: 'Yone', team: 'CHAOS', position: 'MIDDLE', level: 8, scores: { kills: 0, deaths: 2, assists: 0, creepScore: 50, wardScore: 1 }, items: [] },
    ],
    gameData: { gameTime, gameMode: 'CLASSIC' },
  }
}

function harness(initialPhase: GameflowPhase | null) {
  let phase: GameflowPhase | null = initialPhase
  let data: RawAllGameData | null = null
  let dataDelay = 0
  let pick: { championId: number | null; position: 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY' | null } | null = null
  const states: LiveState[] = []
  const handle = startLivePoller({
    getLockfile: () => lockfile,
    identity: () => identity,
    focus: () => null,
    onChange: (s) => states.push(s),
    deps: {
      getPhase: vi.fn(async () => phase),
      getQueueId: vi.fn(async () => 420),
      getPick: vi.fn(async () => pick),
      getAllGameData: vi.fn(async () => {
        if (dataDelay > 0) await new Promise((r) => setTimeout(r, dataDelay))
        return data
      }),
      now: () => Date.now(),
    },
  })
  return {
    handle,
    states,
    setPhase: (p: GameflowPhase | null) => (phase = p),
    setData: (d: RawAllGameData | null) => (data = d),
    setDataDelay: (ms: number) => (dataDelay = ms),
    setPick: (p: typeof pick) => (pick = p),
  }
}

async function tick(ms: number) {
  await vi.advanceTimersByTimeAsync(ms)
  await Promise.resolve()
}

describe('startLivePoller', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('is idle outside a game and waiting during champ select', async () => {
    const h = harness('None')
    await tick(0)
    expect(h.states.at(-1)).toEqual({ kind: 'idle', phase: 'None' })
    h.setPhase('ChampSelect')
    await tick(2000)
    expect(h.states.at(-1)).toEqual({ kind: 'waiting', phase: 'ChampSelect', pick: null })
    h.handle.stop()
  })

  it('after a game ends, the end-of-game and lobby phases still surface (as idle with the phase) so the phone can return to Prepare', async () => {
    const h = harness('InProgress')
    h.setData(raw(100))
    await tick(0)
    h.setPhase('WaitingForStats')
    await tick(2000)
    expect(h.states.at(-1)?.kind).toBe('ended')
    await tick(2000) // same phase: the ENDED state stays
    expect(h.states.at(-1)?.kind).toBe('ended')
    h.setPhase('EndOfGame')
    await tick(2000)
    expect(h.states.at(-1)).toEqual({ kind: 'idle', phase: 'EndOfGame' })
    h.setPhase('Lobby')
    await tick(2000)
    expect(h.states.at(-1)).toEqual({ kind: 'idle', phase: 'Lobby' })
    h.handle.stop()
  })

  it('during champion select the waiting state carries my pick and re-emits when it changes', async () => {
    const h = harness('ChampSelect')
    h.setPick({ championId: null, position: 'MIDDLE' })
    await tick(0)
    expect(h.states.at(-1)).toEqual({ kind: 'waiting', phase: 'ChampSelect', pick: { championId: null, position: 'MIDDLE' } })
    h.setPick({ championId: 238, position: 'MIDDLE' })
    await tick(2000)
    expect(h.states.at(-1)).toEqual({ kind: 'waiting', phase: 'ChampSelect', pick: { championId: 238, position: 'MIDDLE' } })
    h.handle.stop()
  })

  it('idle carries the client phase (lobby, end of game) so the phone can show it', async () => {
    const h = harness('Lobby')
    await tick(0)
    expect(h.states.at(-1)).toEqual({ kind: 'idle', phase: 'Lobby' })
    h.setPhase('EndOfGame')
    await tick(2000)
    expect(h.states.at(-1)).toEqual({ kind: 'idle', phase: 'EndOfGame' })
    h.setPhase(null)
    await tick(2000)
    expect(h.states.at(-1)).toEqual({ kind: 'idle', phase: null })
    h.handle.stop()
  })

  it('emits live snapshots while InProgress, with queueId, and no duplicates for unchanged data', async () => {
    const h = harness('InProgress')
    h.setData(raw(100))
    await tick(0)
    await tick(2000)
    const live = h.states.filter((s) => s.kind === 'live')
    expect(live.length).toBe(1)
    expect(live[0]!.kind === 'live' && live[0]!.snapshot.queueId).toBe(420)
    expect(live[0]!.kind === 'live' && live[0]!.snapshot.me.cs).toBe(100)
    h.setData(raw(104))
    await tick(2000)
    expect(h.states.filter((s) => s.kind === 'live').length).toBe(2)
    h.handle.stop()
  })

  it('InProgress before the Live Client answers (loading screen) surfaces as waiting InProgress once, then live', async () => {
    const h = harness('ChampSelect')
    await tick(0)
    h.setPhase('InProgress') // the game client is launching; allgamedata still null
    await tick(2000)
    await tick(2000)
    expect(h.states.filter((s) => s.kind === 'waiting' && s.phase === 'InProgress').length).toBe(1)
    h.setData(raw(10, 30))
    await tick(2000)
    expect(h.states.at(-1)?.kind).toBe('live')
    h.handle.stop()
  })

  it('an unreadable phase while the game client launches (after champ select) does not drop to idle', async () => {
    const h = harness('ChampSelect')
    await tick(0)
    h.setPhase(null) // LCU busy while the game client starts
    await tick(2000)
    await tick(2000)
    expect(h.states.some((s) => s.kind === 'idle')).toBe(false)
    h.setPhase('InProgress')
    await tick(2000)
    expect(h.states.at(-1)).toMatchObject({ kind: 'waiting', phase: 'InProgress' })
    h.handle.stop()
  })

  it('does not end the game on Reconnect', async () => {
    const h = harness('InProgress')
    h.setData(raw(100))
    await tick(0)
    h.setPhase('Reconnect')
    await tick(2000)
    h.setPhase('InProgress')
    await tick(2000)
    expect(h.states.some((s) => s.kind === 'ended')).toBe(false)
    h.handle.stop()
  })

  it('ends exactly once with a final snapshot when the phase moves to WaitingForStats', async () => {
    const h = harness('InProgress')
    h.setData(raw(100))
    await tick(0)
    h.setPhase('WaitingForStats')
    await tick(2000)
    await tick(2000)
    const ended = h.states.filter((s) => s.kind === 'ended')
    expect(ended.length).toBe(1)
    expect(ended[0]!.kind === 'ended' && ended[0]!.snapshot.isFinal).toBe(true)
    expect(ended[0]!.kind === 'ended' && ended[0]!.snapshot.me.cs).toBe(100)
    h.handle.stop()
  })

  it('stop() halts polling', async () => {
    const h = harness('InProgress')
    h.setData(raw(100))
    await tick(0)
    h.handle.stop()
    const before = h.states.length
    h.setData(raw(200))
    await tick(6000)
    expect(h.states.length).toBe(before)
  })

  it('a brief unreadable phase mid-game (LCU timeout) does not end it', async () => {
    const h = harness('InProgress')
    h.setData(raw(100))
    await tick(0)
    h.setPhase(null)
    await tick(2000)
    await tick(2000)
    h.setPhase('InProgress')
    await tick(2000)
    expect(h.states.some((s) => s.kind === 'ended')).toBe(false)
    expect(h.handle.current().kind).toBe('live')
    h.handle.stop()
  })

  it('three consecutive unreadable phases do end it (League really went away)', async () => {
    const h = harness('InProgress')
    h.setData(raw(100))
    await tick(0)
    h.setPhase(null)
    await tick(2000)
    await tick(2000)
    await tick(2000)
    expect(h.states.filter((s) => s.kind === 'ended').length).toBe(1)
    h.handle.stop()
  })

  it('Reconnect → GameStart → InProgress (client restart) does not end it', async () => {
    const h = harness('InProgress')
    h.setData(raw(100))
    await tick(0)
    h.setPhase('Reconnect')
    await tick(2000)
    h.setPhase('GameStart')
    await tick(2000)
    h.setPhase('InProgress')
    await tick(2000)
    expect(h.states.some((s) => s.kind === 'ended')).toBe(false)
    h.handle.stop()
  })

  it('a Live Client response that lands after the end is dropped', async () => {
    const h = harness('InProgress')
    h.setData(raw(100))
    await tick(0)
    h.setDataDelay(3000) // slower than the 2 s tick
    await tick(2000) // a live tick is now in flight
    h.setPhase('WaitingForStats')
    await tick(2000) // phase tick ends the game while the request is pending
    await tick(4000) // the late response resolves
    const kinds = h.states.map((s) => s.kind)
    expect(kinds.filter((k) => k === 'ended').length).toBe(1)
    expect(kinds.lastIndexOf('live')).toBeLessThan(kinds.lastIndexOf('ended'))
    h.handle.stop()
  })

  it('stop() during a game emits one final snapshot so the phone learns it ended', async () => {
    const h = harness('InProgress')
    h.setData(raw(100))
    await tick(0)
    h.handle.stop()
    const last = h.states[h.states.length - 1]!
    expect(last.kind).toBe('ended')
    expect(last.kind === 'ended' && last.snapshot.isFinal).toBe(true)
  })
})
