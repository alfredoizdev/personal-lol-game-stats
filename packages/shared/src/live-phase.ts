import type { GameflowPhase } from './types'

/** Client phase relayed by the desktop on the live channel (event `live-phase`): what League is doing before and after a game. */
export type LivePhasePayload = { v: 1; ts: number; phase: GameflowPhase; since: number }

export const GAMEFLOW_PHASES: readonly GameflowPhase[] = ['None', 'Lobby', 'Matchmaking', 'ReadyCheck', 'ChampSelect', 'GameStart', 'InProgress', 'WaitingForStats', 'PreEndOfGame', 'EndOfGame', 'Reconnect']

/** `since` = ms the client has been in this phase (the phone runs the queue timer from it). */
export function buildLivePhase(phase: GameflowPhase, since: number, ts: number): LivePhasePayload {
  return { v: 1, ts, phase, since }
}

export function parseLivePhase(payload: unknown): LivePhasePayload | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, unknown>
  if (p.v !== 1 || typeof p.ts !== 'number' || typeof p.since !== 'number') return null
  if (typeof p.phase !== 'string' || !(GAMEFLOW_PHASES as readonly string[]).includes(p.phase)) return null
  return { v: 1, ts: p.ts, phase: p.phase as GameflowPhase, since: p.since }
}
