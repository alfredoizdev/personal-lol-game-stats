import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { LeagueStatus } from '@lpp/shared'
import type { LockfileData } from '@electron/league/lockfile'
import type { Summoner } from '@lpp/shared'

const isLeagueRunning = vi.fn<() => Promise<boolean>>()
const readLockfile = vi.fn<() => Promise<LockfileData | null>>()
const lcuGetCurrentSummoner = vi.fn<(lf: LockfileData) => Promise<Summoner>>()

vi.mock('@electron/league/process', () => ({
  isLeagueRunning: () => isLeagueRunning(),
}))
vi.mock('@electron/league/lockfile', () => ({
  readLockfile: () => readLockfile(),
}))
vi.mock('@electron/league/lcu-client', () => ({
  lcuGetCurrentSummoner: (lf: LockfileData) => lcuGetCurrentSummoner(lf),
}))

import { startDetector } from '@electron/league/detector'

const lockfile: LockfileData = { port: 51234, password: 'pw', protocol: 'https' }
const summoner: Summoner = {
  displayName: 'Test',
  gameName: 'Test',
  tagLine: 'NA1',
  summonerLevel: 100,
  profileIconId: 1,
  puuid: 'puuid-1',
}

async function flushTicks() {
  // let pending microtasks resolve between fake timer advances
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('LeagueDetector', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    isLeagueRunning.mockReset()
    readLockfile.mockReset()
    lcuGetCurrentSummoner.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits CLOSED when the client is not running', async () => {
    isLeagueRunning.mockResolvedValue(false)
    const emissions: LeagueStatus[] = []
    const stop = startDetector({ intervalMs: 3000, onChange: (s) => emissions.push(s) })

    await vi.advanceTimersByTimeAsync(0)
    await flushTicks()

    expect(emissions).toEqual([{ state: 'CLOSED' }])
    stop()
  })

  it('emits STARTING when process is up but no lockfile yet', async () => {
    isLeagueRunning.mockResolvedValue(true)
    readLockfile.mockResolvedValue(null)
    const emissions: LeagueStatus[] = []
    const stop = startDetector({ intervalMs: 3000, onChange: (s) => emissions.push(s) })

    await vi.advanceTimersByTimeAsync(0)
    await flushTicks()

    expect(emissions).toEqual([{ state: 'STARTING' }])
    stop()
  })

  it('emits CONNECTED with summoner when LCU responds', async () => {
    isLeagueRunning.mockResolvedValue(true)
    readLockfile.mockResolvedValue(lockfile)
    lcuGetCurrentSummoner.mockResolvedValue(summoner)
    const emissions: LeagueStatus[] = []
    const stop = startDetector({ intervalMs: 3000, onChange: (s) => emissions.push(s) })

    await vi.advanceTimersByTimeAsync(0)
    await flushTicks()

    expect(emissions).toEqual([
      {
        state: 'CONNECTED',
        summoner,
        lcu: { port: lockfile.port },
      },
    ])
    stop()
  })

  it('only emits when state changes (no duplicate CLOSED across ticks)', async () => {
    isLeagueRunning.mockResolvedValue(false)
    const emissions: LeagueStatus[] = []
    const stop = startDetector({ intervalMs: 3000, onChange: (s) => emissions.push(s) })

    await vi.advanceTimersByTimeAsync(0)
    await flushTicks()
    await vi.advanceTimersByTimeAsync(3000)
    await flushTicks()
    await vi.advanceTimersByTimeAsync(3000)
    await flushTicks()

    expect(emissions).toEqual([{ state: 'CLOSED' }])
    stop()
  })

  it('surfaces STARTING during the LCU boot grace window, then ERROR once sustained', async () => {
    // Riot client writes the lockfile BEFORE its HTTPS server is ready,
    // so the first few LCU calls time out. Surfacing ERROR there panics
    // the user — the detector should hold at STARTING until the failure
    // streak proves the client is genuinely broken.
    isLeagueRunning.mockResolvedValue(true)
    readLockfile.mockResolvedValue(lockfile)
    lcuGetCurrentSummoner.mockRejectedValue(new Error('LCU request timeout'))
    const emissions: LeagueStatus[] = []
    const stop = startDetector({ intervalMs: 3000, onChange: (s) => emissions.push(s) })

    // Tick 1: first LCU failure — still in grace, looks like STARTING.
    await vi.advanceTimersByTimeAsync(0)
    await flushTicks()
    expect(emissions.at(-1)).toMatchObject({ state: 'STARTING' })

    // Tick 2 + 3: still in grace.
    await vi.advanceTimersByTimeAsync(3000)
    await flushTicks()
    await vi.advanceTimersByTimeAsync(3000)
    await flushTicks()
    expect(emissions.every((e) => e.state === 'STARTING')).toBe(true)

    // Tick 4: grace exhausted — escalate to ERROR with the underlying reason.
    // The 3rd-tick error streak already triggered ERROR_BACKOFF_THRESHOLD,
    // so the next poll is +10s, not +3s.
    await vi.advanceTimersByTimeAsync(10_000)
    await flushTicks()
    expect(emissions.at(-1)).toMatchObject({ state: 'ERROR', reason: expect.stringContaining('LCU') })

    stop()
  })

  it('stop() cancels the loop', async () => {
    isLeagueRunning.mockResolvedValue(false)
    const emissions: LeagueStatus[] = []
    const stop = startDetector({ intervalMs: 3000, onChange: (s) => emissions.push(s) })

    await vi.advanceTimersByTimeAsync(0)
    await flushTicks()
    stop()

    isLeagueRunning.mockResolvedValue(true)
    readLockfile.mockResolvedValue(lockfile)
    lcuGetCurrentSummoner.mockResolvedValue(summoner)
    await vi.advanceTimersByTimeAsync(10_000)
    await flushTicks()

    expect(emissions).toEqual([{ state: 'CLOSED' }])
  })

  it('forceTick() returns the latest status immediately', async () => {
    isLeagueRunning.mockResolvedValue(true)
    readLockfile.mockResolvedValue(lockfile)
    lcuGetCurrentSummoner.mockResolvedValue(summoner)
    const emissions: LeagueStatus[] = []
    const handle = startDetector({ intervalMs: 3000, onChange: (s) => emissions.push(s) })

    await vi.advanceTimersByTimeAsync(0)
    await flushTicks()

    const forced = await handle.forceTick()
    expect(forced.state).toBe('CONNECTED')
    handle.stop()
  })

  it('backs off to 10s after 3 consecutive errors', async () => {
    isLeagueRunning.mockResolvedValue(true)
    readLockfile.mockResolvedValue(lockfile)
    lcuGetCurrentSummoner.mockRejectedValue(new Error('boom'))
    const emissions: LeagueStatus[] = []
    const handle = startDetector({ intervalMs: 3000, onChange: (s) => emissions.push(s) })

    await vi.advanceTimersByTimeAsync(0)
    await flushTicks()
    await vi.advanceTimersByTimeAsync(3000)
    await flushTicks()
    await vi.advanceTimersByTimeAsync(3000)
    await flushTicks()
    // After 3 errors: next tick should be at +10s, not +3s
    expect(handle.currentIntervalMs()).toBe(10_000)

    handle.stop()
  })

  it('resets interval to base after recovery from error streak', async () => {
    isLeagueRunning.mockResolvedValue(true)
    readLockfile.mockResolvedValue(lockfile)
    lcuGetCurrentSummoner.mockRejectedValue(new Error('boom'))

    const handle = startDetector({ intervalMs: 3000, onChange: () => {} })

    await vi.advanceTimersByTimeAsync(0)
    await flushTicks()
    await vi.advanceTimersByTimeAsync(3000)
    await flushTicks()
    await vi.advanceTimersByTimeAsync(3000)
    await flushTicks()
    expect(handle.currentIntervalMs()).toBe(10_000)

    // Recovery: LCU starts responding
    lcuGetCurrentSummoner.mockResolvedValue(summoner)
    await vi.advanceTimersByTimeAsync(10_000)
    await flushTicks()

    expect(handle.currentIntervalMs()).toBe(3000)
    handle.stop()
  })
})
