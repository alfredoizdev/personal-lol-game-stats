import type { LeagueStatus } from '@lpp/shared'
import { isLeagueRunning } from './process'
import { readLockfile } from './lockfile'
import { lcuGetCurrentSummoner } from './lcu-client'

export type DetectorOptions = {
  intervalMs: number
  onChange: (status: LeagueStatus) => void
}

/** Callable handle: calling it is equivalent to `.stop()` (RiftLens shape, kept for its tests). */
export type DetectorHandle = (() => void) & {
  stop: () => void
  forceTick: () => Promise<LeagueStatus>
  currentIntervalMs: () => number
}

const ERROR_BACKOFF_THRESHOLD = 3
const ERROR_BACKOFF_MS = 10_000
// Number of consecutive LCU failures we forgive as boot-window noise
// (lockfile is up, HTTP server isn't yet). At the default 2s poll this
// gives the LCU ~6s to come online before the UI surfaces ERROR.
const LCU_GRACE_TICKS = 3

function sameStatus(a: LeagueStatus, b: LeagueStatus): boolean {
  if (a.state !== b.state) return false
  if (a.state === 'CONNECTED' && b.state === 'CONNECTED') {
    return a.summoner.puuid === b.summoner.puuid && a.lcu.port === b.lcu.port
  }
  if (a.state === 'ERROR' && b.state === 'ERROR') {
    return a.reason === b.reason
  }
  return true
}

async function computeStatus(): Promise<LeagueStatus> {
  const running = await isLeagueRunning()
  if (!running) return { state: 'CLOSED' }

  const lockfile = await readLockfile()
  if (!lockfile) return { state: 'STARTING' }

  try {
    const summoner = await lcuGetCurrentSummoner(lockfile)
    return { state: 'CONNECTED', summoner, lcu: { port: lockfile.port } }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return { state: 'ERROR', reason }
  }
}

export function startDetector(opts: DetectorOptions): DetectorHandle {
  let cancelled = false
  let inFlightPromise: Promise<LeagueStatus> | null = null
  let lastStatus: LeagueStatus | null = null
  let errorStreak = 0
  let currentInterval = opts.intervalMs
  let timer: NodeJS.Timeout | null = null

  const runTick = async (): Promise<LeagueStatus> => {
    if (cancelled) return lastStatus ?? { state: 'CLOSED' }
    let status: LeagueStatus
    try {
      status = await computeStatus()
    } catch (err) {
      // Anything unexpected (EACCES on the lockfile, pgrep spawn failure…)
      // becomes ERROR and goes through the same grace/backoff path, so one
      // bad tick can never kill the loop.
      const reason = err instanceof Error ? err.message : String(err)
      status = { state: 'ERROR', reason }
    }

    if (status.state === 'ERROR') {
      errorStreak++
      // Riot's launcher writes the lockfile BEFORE the LCU HTTPS server is
      // ready, so the first few calls reliably time out during a normal
      // client boot. Fold those into STARTING; only escalate to ERROR once
      // the streak proves the LCU is genuinely unreachable.
      if (errorStreak <= LCU_GRACE_TICKS) {
        status = { state: 'STARTING' }
      }
      if (errorStreak >= ERROR_BACKOFF_THRESHOLD) {
        currentInterval = ERROR_BACKOFF_MS
      }
    } else {
      errorStreak = 0
      currentInterval = opts.intervalMs
    }

    if (!lastStatus || !sameStatus(lastStatus, status)) {
      lastStatus = status
      opts.onChange(status)
    }
    return status
  }

  const tick = (): Promise<LeagueStatus> => {
    if (inFlightPromise) return inFlightPromise
    inFlightPromise = runTick().finally(() => {
      inFlightPromise = null
    })
    return inFlightPromise
  }

  const schedule = () => {
    if (cancelled) return
    timer = setTimeout(async () => {
      try {
        await tick()
      } finally {
        schedule()
      }
    }, currentInterval)
  }

  const stop = () => {
    cancelled = true
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  // First tick on next macrotask (setTimeout 0 works with fake timers).
  timer = setTimeout(async () => {
    try {
      await tick()
    } finally {
      schedule()
    }
  }, 0)

  const handle = stop as DetectorHandle
  handle.stop = stop
  handle.forceTick = () => tick()
  handle.currentIntervalMs = () => currentInterval
  return handle
}
