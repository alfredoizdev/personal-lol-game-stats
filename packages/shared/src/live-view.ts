/**
 * Pure view engines for the Live tab (Phase 8): event copy, alert derivation
 * between snapshots, respawn countdown, client-phase label and screen mode.
 * Every string is a statement of what happened — never an instruction.
 */
import type { LiveEvent } from './live-events'
import type { LivePlayerV2, LiveSnapshotV2, LiveViewState } from './live'
import type { LivePhasePayload } from './live-phase'
import type { GameflowPhase } from './types'
import { formatDuration } from './format'
import type { GoalStatus } from './notify/goal-notifier'

export type LiveAlertTone = 'good' | 'bad' | 'neutral'
export type LiveAlertKind = 'goal' | 'kill' | 'death' | 'assist' | 'multikill' | 'objective' | 'structure' | 'ace' | 'first_blood' | 'match_found'
export type LiveAlert = { id: string; kind: LiveAlertKind; title: string; body: string | null; tone: LiveAlertTone }
export type EventLine = { title: string; body: string | null; tone: LiveAlertTone }

const STREAK: Record<number, string> = { 2: 'Double kill', 3: 'Triple kill', 4: 'Quadra kill', 5: 'Penta kill' }
const DRAGON: Record<string, string> = { Fire: 'Infernal', Water: 'Ocean', Earth: 'Mountain', Air: 'Cloud', Hextech: 'Hextech', Chemtech: 'Chemtech', Elder: 'Elder' }
const OBJECTIVE: Partial<Record<LiveEvent['type'], string>> = { DragonKill: 'Dragon', HeraldKill: 'Herald', BaronKill: 'Baron' }

const team = (e: LiveEvent) => (e.actorIsAlly === null ? null : e.actorIsAlly ? 'Your team' : 'Enemy team')
const toneOf = (ally: boolean | null): LiveAlertTone => (ally === null ? 'neutral' : ally ? 'good' : 'bad')

/** One line per event from the player's point of view; null for events that are not worth showing. `myChampion` resolves assists. */
export function eventLine(e: LiveEvent, myChampion?: string): EventLine | null {
  switch (e.type) {
    case 'GameStart':
    case 'MinionsSpawning':
    case 'GameEnd':
      return null
    case 'ChampionKill': {
      if (e.actorIsMe) return { title: `You killed ${e.victim ?? 'an enemy'}`, body: null, tone: 'good' }
      if (e.victimIsMe) return { title: `Killed by ${e.actor ?? 'the enemy team'}`, body: null, tone: 'bad' }
      const assisted = myChampion !== undefined && e.assisters.includes(myChampion)
      const line = `${e.actor ?? 'Someone'} killed ${e.victim ?? 'someone'}`
      return assisted ? { title: `Assist on ${e.victim ?? 'the kill'}`, body: line, tone: 'good' } : { title: line, body: null, tone: 'neutral' }
    }
    case 'Multikill': {
      const name = STREAK[e.meta.killStreak ?? 0] ?? 'Multikill'
      if (e.actorIsMe) return { title: `${name}!`, body: null, tone: 'good' }
      return { title: `${e.actor ?? team(e) ?? 'Someone'} · ${name}`, body: null, tone: toneOf(e.actorIsAlly) }
    }
    case 'FirstBlood':
      return { title: 'First blood', body: e.actor, tone: toneOf(e.actorIsAlly) }
    case 'Ace':
      return { title: 'Ace!', body: team(e), tone: toneOf(e.actorIsAlly) }
    case 'DragonKill':
    case 'HeraldKill':
    case 'BaronKill': {
      const who = team(e) ?? 'Someone'
      const parts = [e.type === 'DragonKill' && e.meta.dragonType ? DRAGON[e.meta.dragonType] ?? e.meta.dragonType : null, e.meta.stolen ? 'stolen' : null].filter((p): p is string => !!p)
      return { title: `${who} took ${OBJECTIVE[e.type]}`, body: parts.length ? parts.join(' · ') : null, tone: toneOf(e.actorIsAlly) }
    }
    case 'TurretKilled':
      if (e.actorIsAlly === true) return { title: 'Turret down', body: e.actor, tone: 'good' }
      if (e.actorIsAlly === false) return { title: 'Your turret fell', body: e.actor, tone: 'bad' }
      return { title: 'Turret down', body: null, tone: 'neutral' }
    case 'InhibKilled':
      if (e.actorIsAlly === true) return { title: 'Inhibitor down', body: e.actor, tone: 'good' }
      if (e.actorIsAlly === false) return { title: 'Your inhibitor fell', body: e.actor, tone: 'bad' }
      return { title: 'Inhibitor down', body: null, tone: 'neutral' }
  }
}

export function newEvents(seen: ReadonlySet<number>, events: LiveEvent[]): LiveEvent[] {
  return events.filter((e) => !seen.has(e.id))
}

const KIND: Partial<Record<LiveEvent['type'], LiveAlertKind>> = {
  Multikill: 'multikill', FirstBlood: 'first_blood', Ace: 'ace', DragonKill: 'objective', HeraldKill: 'objective', BaronKill: 'objective', TurretKilled: 'structure', InhibKilled: 'structure',
}

/** Alerts to show for this snapshot: a goal flip (not the first known status) and every unseen event with a line. */
export function alertsForSnapshot(input: {
  seen: ReadonlySet<number>
  snapshot: LiveSnapshotV2
  goalPrev: GoalStatus | null
  goalNext: GoalStatus | null
  goalText: string | null
  goalNow: string | null
}): LiveAlert[] {
  const out: LiveAlert[] = []
  const { goalPrev, goalNext } = input
  if (goalPrev !== null && goalPrev !== 'unknown' && goalNext !== null && goalNext !== 'unknown' && goalNext !== goalPrev) {
    out.push({
      id: `goal:${goalNext}`,
      kind: 'goal',
      title: goalNext === 'on_track' ? 'On track' : 'Below goal',
      body: `Goal ${input.goalText ?? ''}${input.goalNow ? ` · now ${input.goalNow}` : ''}`.trim(),
      tone: goalNext === 'on_track' ? 'good' : 'bad',
    })
  }
  const me = input.snapshot.me
  for (const e of newEvents(input.seen, input.snapshot.events)) {
    const line = eventLine(e, me.championName)
    if (!line) continue
    let kind: LiveAlertKind = KIND[e.type] ?? 'kill'
    let body = line.body
    if (e.type === 'ChampionKill') {
      const assisted = e.assisters.includes(me.championName)
      if (!e.actorIsMe && !e.victimIsMe && !assisted) continue // a kill between other players stays in the feed only
      kind = e.actorIsMe ? 'kill' : e.victimIsMe ? 'death' : 'assist'
      if (e.victimIsMe && me.isDead && me.respawnSec !== null && me.respawnSec > 0) body = `Back in ${Math.ceil(me.respawnSec)} s`
    }
    out.push({ id: `event:${e.id}`, kind, title: line.title, body, tone: line.tone })
  }
  return out
}

/** Seconds left to respawn, counted down locally from the snapshot that last said "dead"; null when alive, unknown or already over. */
export function respawnNow(p: Pick<LivePlayerV2, 'isDead' | 'respawnSec'>, snapshotTs: number, nowMs: number): number | null {
  if (p.isDead !== true || p.respawnSec === null) return null
  const left = p.respawnSec - Math.max(0, nowMs - snapshotTs) / 1000
  return left > 0 ? Math.ceil(left) : null
}

export const PHASE_LABEL: Record<GameflowPhase, string> = {
  None: 'Waiting for a match',
  Lobby: 'In lobby',
  Matchmaking: 'Searching for a match',
  ReadyCheck: 'Match found',
  ChampSelect: 'Champion select',
  GameStart: 'Loading into the game…',
  InProgress: 'In game',
  Reconnect: 'Reconnecting to the game…',
  WaitingForStats: 'Match ended',
  PreEndOfGame: 'Match ended',
  EndOfGame: 'Match ended',
}

/** Phase older than this (no heartbeat) is treated as unknown. */
export const PHASE_STALE_MS = 30_000
const WAITING = { label: 'Waiting for a match', timer: null, loading: false }
/** The game client is starting or coming back: the pre-game card shows a spinner (the card only shows while there is no live snapshot). */
const LOADING_PHASES: readonly GameflowPhase[] = ['GameStart', 'InProgress', 'Reconnect']

/** What the pre-game card says; the queue timer runs from `since` plus the time elapsed since the phone received the phase. */
export function phaseView(phase: LivePhasePayload | null, receivedAtMs: number, nowMs: number): { label: string; timer: string | null; loading: boolean } {
  if (!phase || phase.phase === 'None' || nowMs - receivedAtMs > PHASE_STALE_MS) return WAITING
  const timer = phase.phase === 'Matchmaking' ? formatDuration(Math.floor((phase.since + Math.max(0, nowMs - receivedAtMs)) / 1000)) : null
  const loading = LOADING_PHASES.includes(phase.phase)
  return { label: phase.phase === 'InProgress' ? PHASE_LABEL.GameStart : PHASE_LABEL[phase.phase], timer, loading }
}

export type LiveScreenMode = 'pre' | 'live' | 'ended' | 'after'
/** After the final snapshot, the ENDED hero gives way to Prepare once the client is back in the lobby or after this long. */
export const ENDED_HOLD_MS = 60_000
/** Phases that still belong to the game that just ended (the end-of-game screen included). */
const GAME_AND_TAIL: readonly GameflowPhase[] = ['InProgress', 'Reconnect', 'GameStart', 'WaitingForStats', 'PreEndOfGame', 'EndOfGame']
/** Phases that mean the next game is on its way: the Last-match card makes room. */
const NEXT_QUEUE: readonly GameflowPhase[] = ['Matchmaking', 'ReadyCheck', 'ChampSelect']
/** A game phase received this long after the final snapshot belongs to the NEXT game (the ended game's own tail is over within seconds). */
const NEXT_GAME: readonly GameflowPhase[] = ['GameStart', 'InProgress', 'Reconnect']

export function liveScreenMode(input: {
  view: LiveViewState
  endedAtMs: number | null
  nowMs: number
  phase: GameflowPhase | null
  /** ms since the phone received that phase; older than PHASE_STALE_MS counts as unknown (same rule as phaseView). */
  phaseAgeMs: number
  dismissed: boolean
}): LiveScreenMode {
  if (input.view === 'live' || input.view === 'stale') return 'live'
  if (input.view === 'ended') {
    const phase = input.phaseAgeMs > PHASE_STALE_MS ? null : input.phase
    if (phase !== null && NEXT_QUEUE.includes(phase)) return 'pre'
    const phaseReceivedAt = input.nowMs - input.phaseAgeMs
    if (phase !== null && NEXT_GAME.includes(phase) && input.endedAtMs !== null && phaseReceivedAt - input.endedAtMs > ENDED_HOLD_MS) return 'pre'
    const left = phase !== null && !GAME_AND_TAIL.includes(phase)
    const held = input.endedAtMs !== null && input.nowMs - input.endedAtMs > ENDED_HOLD_MS
    if (!left && !held) return 'ended'
    return input.dismissed ? 'pre' : 'after'
  }
  return 'pre'
}

/** "Yasuo · 24:10 · Goal met" for the Last-match card. */
export function lastMatchLine(snapshot: LiveSnapshotV2, goal: { text: string; met: boolean | null } | null): string {
  const parts = [snapshot.me.championName || '—', snapshot.gameTimeSeconds === null ? '--:--' : formatDuration(snapshot.gameTimeSeconds)]
  if (goal && goal.met !== null) parts.push(goal.met ? 'Goal met' : 'Goal missed')
  return parts.join(' · ')
}
