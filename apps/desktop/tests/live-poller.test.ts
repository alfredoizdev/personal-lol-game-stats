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
  const states: LiveState[] = []
  const handle = startLivePoller({
    getLockfile: () => lockfile,
    identity: () => identity,
    focus: () => null,
    onChange: (s) => states.push(s),
    deps: {
      getPhase: vi.fn(async () => phase),
      getQueueId: vi.fn(async () => 420),
      getAllGameData: vi.fn(async () => data),
      now: () => Date.now(),
    },
  })
  return { handle, states, setPhase: (p: GameflowPhase | null) => (phase = p), setData: (d: RawAllGameData | null) => (data = d) }
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
    expect(h.states.at(-1)).toEqual({ kind: 'idle' })
    h.setPhase('ChampSelect')
    await tick(2000)
    expect(h.states.at(-1)).toEqual({ kind: 'waiting', phase: 'ChampSelect' })
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
})
