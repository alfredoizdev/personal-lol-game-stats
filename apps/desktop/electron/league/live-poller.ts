/**
 * Live state machine. Two cooperating timers:
 *  - phase tick (2 s): LCU gameflow phase → idle / waiting / (in game)
 *  - live tick (2 s, only while InProgress): Live Client allgamedata → snapshot
 * Leaving InProgress for an end-of-game phase emits `ended` exactly once with
 * the last snapshot marked `isFinal`. While a game is running, `Reconnect`,
 * `GameStart` (client restart) and a few unreadable phases (LCU timeouts) never
 * end it. Ticks are single-flight and a Live Client response that lands after
 * the game ended or the poller stopped is dropped. `stop()` mid-game emits the
 * final snapshot so the phone learns the game is over.
 */
import { buildLiveSnapshot, type GameflowPhase, type LiveFocus, type LiveSnapshotV2, type RawAllGameData } from '@lpp/shared'
import type { LockfileData } from './lockfile'
import { lcuGetCurrentQueueId, lcuGetGameflowPhase } from './lcu-client'
import { getLiveAllGameData } from './live-client'

export type LiveState =
  | { kind: 'idle'; phase?: GameflowPhase | null }
  | { kind: 'waiting'; phase: GameflowPhase }
  | { kind: 'live'; snapshot: LiveSnapshotV2 }
  | { kind: 'ended'; snapshot: LiveSnapshotV2 }

export type LivePollerDeps = {
  getPhase: (lockfile: LockfileData) => Promise<GameflowPhase | null>
  getQueueId: (lockfile: LockfileData) => Promise<number | null>
  getAllGameData: () => Promise<RawAllGameData | null>
  now: () => number
}

export type LivePollerOptions = {
  getLockfile: () => LockfileData | null
  identity: () => { gameName: string; tagLine: string } | null
  focus: () => LiveFocus
  onChange: (state: LiveState) => void
  deps?: Partial<LivePollerDeps>
}

export type LivePollerHandle = { stop: () => void; current: () => LiveState }

const PHASE_INTERVAL_MS = 2000
const LIVE_INTERVAL_MS = 2000
const END_PHASES: readonly GameflowPhase[] = ['WaitingForStats', 'PreEndOfGame', 'EndOfGame', 'None', 'Lobby']
const WAITING_PHASES: readonly GameflowPhase[] = ['Matchmaking', 'ReadyCheck', 'ChampSelect', 'GameStart']
/** Consecutive unreadable phases tolerated while a game is running (LCU is often slow in-game). */
const NULL_PHASE_GRACE = 3

function sameState(a: LiveState, b: LiveState): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'waiting' && b.kind === 'waiting') return a.phase === b.phase
  if (a.kind === 'idle' && b.kind === 'idle') return (a.phase ?? null) === (b.phase ?? null)
  if ((a.kind === 'live' || a.kind === 'ended') && (b.kind === 'live' || b.kind === 'ended')) {
    const x = { ...a.snapshot, ts: 0 }
    const y = { ...b.snapshot, ts: 0 }
    return JSON.stringify(x) === JSON.stringify(y)
  }
  return true
}

export function startLivePoller(opts: LivePollerOptions): LivePollerHandle {
  const deps: LivePollerDeps = {
    getPhase: opts.deps?.getPhase ?? lcuGetGameflowPhase,
    getQueueId: opts.deps?.getQueueId ?? lcuGetCurrentQueueId,
    getAllGameData: opts.deps?.getAllGameData ?? getLiveAllGameData,
    now: opts.deps?.now ?? (() => Date.now()),
  }

  let stopped = false
  let state: LiveState = { kind: 'idle' }
  let lastPhase: GameflowPhase | null = null
  let queueId: number | null = null
  let lastSnapshot: LiveSnapshotV2 | null = null
  let phaseTimer: NodeJS.Timeout | null = null
  let liveTimer: NodeJS.Timeout | null = null
  let phaseBusy = false
  let liveBusy = false
  let liveGen = 0 // bumped whenever live polling stops; late responses from an older generation are dropped
  let nullStreak = 0

  let emitted = false
  const emit = (next: LiveState) => {
    if (emitted && sameState(state, next)) return
    emitted = true
    state = next
    opts.onChange(next)
  }

  const liveTick = async () => {
    if (stopped || liveBusy) return
    liveBusy = true
    const gen = liveGen
    try {
      const identity = opts.identity()
      const raw = await deps.getAllGameData()
      if (stopped || gen !== liveGen) return
      if (raw && identity) {
        const snapshot = buildLiveSnapshot(raw, identity, { ts: deps.now(), queueId, isFinal: false, focus: opts.focus() })
        if (snapshot) {
          lastSnapshot = snapshot
          emit({ kind: 'live', snapshot })
        }
      }
    } finally {
      liveBusy = false
    }
  }

  const startLive = () => {
    if (liveTimer) return
    void liveTick()
    liveTimer = setInterval(() => void liveTick(), LIVE_INTERVAL_MS)
  }

  const stopLive = () => {
    liveGen++
    if (liveTimer) clearInterval(liveTimer)
    liveTimer = null
  }

  const endGame = () => {
    stopLive()
    if (lastSnapshot) {
      const final: LiveSnapshotV2 = { ...lastSnapshot, ts: deps.now(), isFinal: true }
      lastSnapshot = null
      emit({ kind: 'ended', snapshot: final })
    }
  }

  const phaseTick = async () => {
    if (stopped || phaseBusy) return
    phaseBusy = true
    try {
      const lockfile = opts.getLockfile()
      const phase = lockfile ? await deps.getPhase(lockfile) : null
      if (stopped) return
      nullStreak = phase === null ? nullStreak + 1 : 0

      if (phase === 'InProgress') {
        if (lastPhase !== 'InProgress' && lockfile) {
          queueId = await deps.getQueueId(lockfile).catch(() => null)
        }
        startLive()
      } else if (phase === 'Reconnect' || (phase === 'GameStart' && lastSnapshot)) {
        // Client dropped mid-game (Reconnect → GameStart → InProgress): keep what we had, keep polling.
        startLive()
      } else if (phase && WAITING_PHASES.includes(phase)) {
        if (lastSnapshot) endGame()
        else emit({ kind: 'waiting', phase })
      } else if (phase === null && lastSnapshot && nullStreak < NULL_PHASE_GRACE) {
        // A slow/unreachable LCU for a moment is not the end of the game.
      } else if (phase === null || END_PHASES.includes(phase)) {
        if (lastSnapshot) endGame()
        // After `ended`, keep that state while the phase that ended the game holds; a new phase
        // (end-of-game screen → lobby) surfaces as idle with the phase so the phone can move on.
        else if (state.kind !== 'ended' || phase !== lastPhase) emit({ kind: 'idle', phase })
      }
      lastPhase = phase
    } finally {
      phaseBusy = false
    }
  }

  const stop = () => {
    stopped = true
    if (phaseTimer) clearInterval(phaseTimer)
    endGame() // no-op unless a game was running; then the final snapshot still goes out
  }

  void phaseTick()
  phaseTimer = setInterval(() => void phaseTick(), PHASE_INTERVAL_MS)

  return { stop, current: () => state }
}
