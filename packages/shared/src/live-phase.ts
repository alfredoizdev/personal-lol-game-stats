import type { GameflowPhase } from './types'
import type { Role } from './match-v5'

/** The player's own champion-select cell: locked champion (null until locked) and assigned position (null in modes without one). */
export type ChampSelectPick = { championId: number | null; position: Role | null }

/** Client phase relayed by the desktop on the live channel (event `live-phase`): what League is doing before and after a game. */
export type LivePhasePayload = { v: 1; ts: number; phase: GameflowPhase; since: number; pick?: ChampSelectPick }

const ROLES: readonly string[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

export const GAMEFLOW_PHASES: readonly GameflowPhase[] = ['None', 'Lobby', 'Matchmaking', 'ReadyCheck', 'ChampSelect', 'GameStart', 'InProgress', 'WaitingForStats', 'PreEndOfGame', 'EndOfGame', 'Reconnect']

/** `since` = ms the client has been in this phase (the phone runs the queue timer from it). */
export function buildLivePhase(phase: GameflowPhase, since: number, ts: number, pick?: ChampSelectPick | null): LivePhasePayload {
  return pick ? { v: 1, ts, phase, since, pick } : { v: 1, ts, phase, since }
}

export function parseChampSelectPick(v: unknown): ChampSelectPick | null {
  if (!v || typeof v !== 'object') return null
  const p = v as Record<string, unknown>
  if (p.championId !== null && (typeof p.championId !== 'number' || !Number.isFinite(p.championId))) return null
  if (p.position !== null && (typeof p.position !== 'string' || !ROLES.includes(p.position))) return null
  return { championId: p.championId as number | null, position: p.position as Role | null }
}

export function parseLivePhase(payload: unknown): LivePhasePayload | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, unknown>
  if (p.v !== 1 || typeof p.ts !== 'number' || typeof p.since !== 'number') return null
  if (typeof p.phase !== 'string' || !(GAMEFLOW_PHASES as readonly string[]).includes(p.phase)) return null
  const out: LivePhasePayload = { v: 1, ts: p.ts, phase: p.phase as GameflowPhase, since: p.since }
  if (p.pick !== undefined && p.pick !== null) {
    const pick = parseChampSelectPick(p.pick)
    if (!pick) return null
    out.pick = pick
  }
  return out
}
