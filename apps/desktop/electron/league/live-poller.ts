/**
 * Live state machine. Two cooperating timers:
 *  - phase tick (2 s): LCU gameflow phase → idle / waiting / (in game)
 *  - live tick (2 s, only while InProgress): Live Client allgamedata → snapshot
 * Leaving InProgress for an end-of-game phase emits `ended` exactly once with
 * the last snapshot marked `isFinal`. `Reconnect` and `GameStart` never end it.
 */
import { buildLiveSnapshot, type GameflowPhase, type LiveFocus, type LiveSnapshotV2, type RawAllGameData } from '@lpp/shared'
import type { LockfileData } from './lockfile'
import { lcuGetCurrentQueueId, lcuGetGameflowPhase } from './lcu-client'
import { getLiveAllGameData } from './live-client'

export type LiveState =
  | { kind: 'idle' }
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

function sameState(a: LiveState, b: LiveState): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'waiting' && b.kind === 'waiting') return a.phase === b.phase
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

  let emitted = false
  const emit = (next: LiveState) => {
    if (emitted && sameState(state, next)) return
    emitted = true
    state = next
    opts.onChange(next)
  }

  const liveTick = async () => {
    if (stopped) return
    const identity = opts.identity()
    const raw = await deps.getAllGameData()
    if (raw && identity) {
      const snapshot = buildLiveSnapshot(raw, identity, { ts: deps.now(), queueId, isFinal: false, focus: opts.focus() })
      if (snapshot) {
        lastSnapshot = snapshot
        emit({ kind: 'live', snapshot })
      }
    }
  }

  const startLive = () => {
    if (liveTimer) return
    void liveTick()
    liveTimer = setInterval(() => void liveTick(), LIVE_INTERVAL_MS)
  }

  const stopLive = () => {
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
    if (stopped) return
    const lockfile = opts.getLockfile()
    const phase = lockfile ? await deps.getPhase(lockfile) : null
    if (stopped) return

    if (phase === 'InProgress') {
      if (lastPhase !== 'InProgress' && lockfile) {
        queueId = await deps.getQueueId(lockfile).catch(() => null)
      }
      startLive()
    } else if (phase === 'Reconnect') {
      // Client dropped mid-game: keep whatever we had, keep polling the live client.
      startLive()
    } else if (phase && WAITING_PHASES.includes(phase)) {
      if (lastSnapshot) endGame()
      else emit({ kind: 'waiting', phase })
    } else if (phase === null || END_PHASES.includes(phase)) {
      if (lastSnapshot) endGame()
      else if (state.kind !== 'ended') emit({ kind: 'idle' })
    }
    lastPhase = phase
  }

  const stop = () => {
    stopped = true
    if (phaseTimer) clearInterval(phaseTimer)
    stopLive()
  }

  void phaseTick()
  phaseTimer = setInterval(() => void phaseTick(), PHASE_INTERVAL_MS)

  return { stop, current: () => state }
}
