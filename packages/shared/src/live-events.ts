/**
 * Game events as the Live Client Data API reports them (`allgamedata.events.Events`),
 * normalized for the phone. Only what the game itself shows the player: the kill
 * feed, objectives, structures. Names become champion names via `allPlayers`.
 */
import type { RawAllGameData, RawLivePlayer } from './live'

export type RawLiveEvent = {
  EventID?: number
  EventName?: string
  EventTime?: number
  KillerName?: string
  VictimName?: string
  Assisters?: string[]
  KillStreak?: number
  DragonType?: string
  Stolen?: string | boolean
  TurretKilled?: string
  InhibKilled?: string
  Acer?: string
  AcingTeam?: string
  Recipient?: string
  Result?: string
}

export type LiveEventType = 'GameStart' | 'MinionsSpawning' | 'FirstBlood' | 'ChampionKill' | 'Multikill' | 'Ace' | 'DragonKill' | 'HeraldKill' | 'BaronKill' | 'TurretKilled' | 'InhibKilled' | 'GameEnd'

export type LiveEvent = {
  id: number
  time: number
  type: LiveEventType
  /** Champion name of who did it; null for minions/unknown. */
  actor: string | null
  /** Champion name of who it happened to, or the structure label ('Turret', 'Inhibitor'). */
  victim: string | null
  assisters: string[]
  actorIsMe: boolean
  victimIsMe: boolean
  /** Whether the actor is on my team; null when unknown (minion, no actor). */
  actorIsAlly: boolean | null
  meta: { killStreak?: number; dragonType?: string; stolen?: boolean; result?: 'Win' | 'Lose' }
}

export const MAX_EVENTS = 20

const TYPES: readonly string[] = ['GameStart', 'MinionsSpawning', 'FirstBlood', 'ChampionKill', 'Multikill', 'Ace', 'DragonKill', 'HeraldKill', 'BaronKill', 'TurretKilled', 'InhibKilled', 'GameEnd']

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase()

/** Live Client names are "Name#TAG" since Riot IDs, or the legacy summoner name; match either, case-insensitively. */
function findPlayer(players: RawLivePlayer[], name: string | undefined): RawLivePlayer | null {
  const n = norm(name)
  if (!n) return null
  return (
    players.find((p) => norm(p.summonerName) === n) ??
    players.find((p) => `${norm(p.riotIdGameName)}#${norm(p.riotIdTagLine)}` === n) ??
    players.find((p) => norm(p.riotIdGameName) === n) ??
    null
  )
}

export function normalizeEvents(raw: RawAllGameData, me: RawLivePlayer): LiveEvent[] {
  const players = raw.allPlayers ?? []
  const list = raw.events?.Events ?? []
  const out: LiveEvent[] = []
  for (const e of list) {
    if (typeof e?.EventID !== 'number' || typeof e.EventName !== 'string' || !TYPES.includes(e.EventName)) continue
    const type = e.EventName as LiveEventType
    const actorName = type === 'FirstBlood' ? e.Recipient : type === 'Ace' ? e.Acer : e.KillerName
    const actorP = findPlayer(players, actorName)
    const victimP = type === 'ChampionKill' ? findPlayer(players, e.VictimName) : null
    const victim = type === 'TurretKilled' ? 'Turret' : type === 'InhibKilled' ? 'Inhibitor' : victimP?.championName ?? null
    const meta: LiveEvent['meta'] = {}
    if (typeof e.KillStreak === 'number') meta.killStreak = e.KillStreak
    if (typeof e.DragonType === 'string') meta.dragonType = e.DragonType
    if (e.Stolen !== undefined) meta.stolen = e.Stolen === true || norm(String(e.Stolen)) === 'true'
    if (e.Result === 'Win' || e.Result === 'Lose') meta.result = e.Result
    out.push({
      id: e.EventID,
      time: typeof e.EventTime === 'number' ? e.EventTime : 0,
      type,
      actor: actorP?.championName ?? null,
      victim,
      assisters: (e.Assisters ?? []).map((a) => findPlayer(players, a)?.championName).filter((c): c is string => !!c),
      actorIsMe: actorP === me,
      victimIsMe: victimP === me,
      actorIsAlly: actorP ? actorP.team === me.team : null,
      meta,
    })
  }
  out.sort((a, b) => a.id - b.id)
  return out.slice(-MAX_EVENTS)
}

/** Validates one event from the wire. */
export function parseLiveEvent(v: unknown): LiveEvent | null {
  if (!v || typeof v !== 'object') return null
  const e = v as Record<string, unknown>
  if (typeof e.id !== 'number' || typeof e.time !== 'number' || typeof e.type !== 'string' || !TYPES.includes(e.type)) return null
  if (e.actor !== null && typeof e.actor !== 'string') return null
  if (e.victim !== null && typeof e.victim !== 'string') return null
  if (!Array.isArray(e.assisters) || !e.assisters.every((a) => typeof a === 'string')) return null
  if (typeof e.actorIsMe !== 'boolean' || typeof e.victimIsMe !== 'boolean') return null
  if (e.actorIsAlly !== null && typeof e.actorIsAlly !== 'boolean') return null
  const m = (e.meta && typeof e.meta === 'object' ? e.meta : {}) as Record<string, unknown>
  const meta: LiveEvent['meta'] = {}
  if (typeof m.killStreak === 'number') meta.killStreak = m.killStreak
  if (typeof m.dragonType === 'string') meta.dragonType = m.dragonType
  if (typeof m.stolen === 'boolean') meta.stolen = m.stolen
  if (m.result === 'Win' || m.result === 'Lose') meta.result = m.result
  return {
    id: e.id, time: e.time, type: e.type as LiveEventType, actor: e.actor as string | null, victim: e.victim as string | null,
    assisters: e.assisters as string[], actorIsMe: e.actorIsMe, victimIsMe: e.victimIsMe, actorIsAlly: e.actorIsAlly as boolean | null, meta,
  }
}
