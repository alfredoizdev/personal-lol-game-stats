import type { Role } from './match-v5'

/** Build flag: show the lane opponent's scoreboard-visible stats on the Live tab. */

// ---------------------------------------------------------------------------
// Raw Live Client Data API shape (subset we read). Everything is optional:
// Riot's local API is unsupported and fields come and go between patches.
// ---------------------------------------------------------------------------
export type RawLivePlayer = {
  riotIdGameName?: string
  riotIdTagLine?: string
  summonerName?: string
  championName?: string
  team?: 'ORDER' | 'CHAOS' | string
  position?: string
  level?: number
  scores?: { kills?: number; deaths?: number; assists?: number; creepScore?: number; wardScore?: number }
  items?: Array<{ itemID?: number; slot?: number }>
}

export type RawAllGameData = {
  activePlayer?: { riotIdGameName?: string; riotIdTagLine?: string; summonerName?: string; level?: number }
  allPlayers?: RawLivePlayer[]
  gameData?: { gameTime?: number; gameMode?: string }
}

// ---------------------------------------------------------------------------
// Transport payload (spec 6.3). Nullable numbers, never fake zeros.
// ---------------------------------------------------------------------------
export type LivePlayerV2 = {
  championName: string
  position: Role | null
  level: number | null
  kills: number | null
  deaths: number | null
  assists: number | null
  cs: number | null
  csPerMin: number | null
  wardScore: number | null
  items: number[]
}

export type LiveFocus = { metric: 'csPerMin'; target: number } | null

export type LiveSnapshotV2 = {
  v: 2
  ts: number
  isFinal: boolean
  gameTimeSeconds: number | null
  gameMode: string | null
  queueId: number | null
  teamKills: number | null
  me: LivePlayerV2
  opponent: LivePlayerV2 | null
  focus: LiveFocus
}

const ROLES: readonly string[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
const MIN_SEC_FOR_RATE = 60
const MAX_ITEMS = 7

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
// Live Client Data reports wardScore as a long float (e.g. 13.0152835…); show whole points.
const roundInt = (n: number | null): number | null => (n === null ? null : Math.round(n))

/** Seven fixed slots (0–5 items, 6 trinket) so the trinket stays the trinket with a partial inventory. */
function itemsBySlot(items: RawLivePlayer['items']): number[] {
  const out = new Array<number>(MAX_ITEMS).fill(0)
  ;(items ?? []).forEach((it, i) => {
    const id = num(it?.itemID) ?? 0
    const slot = num(it?.slot) ?? i
    if (id > 0 && slot >= 0 && slot < MAX_ITEMS) out[slot] = id
  })
  return out
}
const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase()
const round1 = (n: number) => Math.round(n * 10) / 10

function toRole(position: string | undefined): Role | null {
  const p = (position ?? '').toUpperCase()
  return ROLES.includes(p) ? (p as Role) : null
}

function toLine(p: RawLivePlayer, gameTime: number | null): LivePlayerV2 {
  const cs = num(p.scores?.creepScore)
  const csPerMin = cs !== null && gameTime !== null && gameTime >= MIN_SEC_FOR_RATE ? round1(cs / (gameTime / 60)) : null
  return {
    championName: p.championName ?? '',
    position: toRole(p.position),
    level: num(p.level),
    kills: num(p.scores?.kills),
    deaths: num(p.scores?.deaths),
    assists: num(p.scores?.assists),
    cs,
    csPerMin,
    wardScore: roundInt(num(p.scores?.wardScore)),
    items: itemsBySlot(p.items),
  }
}

function isMe(p: RawLivePlayer, identity: { gameName: string; tagLine: string }): boolean {
  const g = norm(identity.gameName)
  const t = norm(identity.tagLine)
  if (norm(p.riotIdGameName) === g && norm(p.riotIdTagLine) === t) return true
  const legacy = norm(p.summonerName)
  return legacy !== '' && (legacy === g || legacy === `${g}#${t}`)
}

/** Pure: raw Live Client payload → transport snapshot. Null when the player is not in the game. */
export function buildLiveSnapshot(
  raw: RawAllGameData,
  identity: { gameName: string; tagLine: string },
  extra: { ts: number; queueId: number | null; isFinal: boolean; focus: LiveFocus },
): LiveSnapshotV2 | null {
  const players = raw.allPlayers ?? []
  const me = players.find((p) => isMe(p, identity))
  if (!me) return null
  const gameTime = num(raw.gameData?.gameTime)
  const myRole = toRole(me.position)
  const enemies = players.filter((p) => p.team !== me.team)
  const candidates = myRole ? enemies.filter((p) => toRole(p.position) === myRole) : []
  const opponent = candidates.length === 1 ? candidates[0]! : null
  const teamKills = players
    .filter((p) => p.team === me.team)
    .reduce<number | null>((acc, p) => {
      const k = num(p.scores?.kills)
      if (k === null) return acc
      return (acc ?? 0) + k
    }, null)
  return {
    v: 2,
    ts: extra.ts,
    isFinal: extra.isFinal,
    gameTimeSeconds: gameTime,
    gameMode: raw.gameData?.gameMode ?? null,
    queueId: extra.queueId,
    teamKills,
    me: toLine(me, gameTime),
    opponent: opponent ? toLine(opponent, gameTime) : null,
    focus: extra.focus,
  }
}

// ---------------------------------------------------------------------------
// Validation of anything that arrives on the channel.
// ---------------------------------------------------------------------------
const isNumOrNull = (v: unknown): v is number | null => v === null || (typeof v === 'number' && Number.isFinite(v))

function parsePlayer(v: unknown): LivePlayerV2 | null {
  if (!v || typeof v !== 'object') return null
  const p = v as Record<string, unknown>
  if (typeof p.championName !== 'string') return null
  if (p.position !== null && (typeof p.position !== 'string' || !ROLES.includes(p.position))) return null
  for (const k of ['level', 'kills', 'deaths', 'assists', 'cs', 'csPerMin', 'wardScore']) {
    if (!isNumOrNull(p[k])) return null
  }
  if (!Array.isArray(p.items) || !p.items.every((i) => typeof i === 'number')) return null
  return {
    championName: p.championName,
    position: p.position as Role | null,
    level: p.level as number | null,
    kills: p.kills as number | null,
    deaths: p.deaths as number | null,
    assists: p.assists as number | null,
    cs: p.cs as number | null,
    csPerMin: p.csPerMin as number | null,
    wardScore: p.wardScore as number | null,
    items: p.items as number[],
  }
}

export function parseLiveSnapshot(payload: unknown): LiveSnapshotV2 | null {
  if (!payload || typeof payload !== 'object') return null
  const s = payload as Record<string, unknown>
  if (s.v !== 2) return null
  if (typeof s.ts !== 'number' || typeof s.isFinal !== 'boolean') return null
  if (!isNumOrNull(s.gameTimeSeconds) || !isNumOrNull(s.queueId) || !isNumOrNull(s.teamKills)) return null
  if (s.gameMode !== null && typeof s.gameMode !== 'string') return null
  const me = parsePlayer(s.me)
  if (!me) return null
  let opponent: LivePlayerV2 | null = null
  if (s.opponent !== null && s.opponent !== undefined) {
    opponent = parsePlayer(s.opponent)
    if (!opponent) return null
  }
  let focus: LiveFocus = null
  if (s.focus !== null && s.focus !== undefined) {
    const f = s.focus as Record<string, unknown>
    if (!f || f.metric !== 'csPerMin' || typeof f.target !== 'number') return null
    focus = { metric: 'csPerMin', target: f.target }
  }
  return {
    v: 2,
    ts: s.ts,
    isFinal: s.isFinal,
    gameTimeSeconds: s.gameTimeSeconds as number | null,
    gameMode: s.gameMode as string | null,
    queueId: s.queueId as number | null,
    teamKills: s.teamKills as number | null,
    me,
    opponent,
    focus,
  }
}

// ---------------------------------------------------------------------------
// View state + publish gating.
// ---------------------------------------------------------------------------
export type LiveViewState = 'waiting' | 'live' | 'stale' | 'ended'

const EXPIRE_AFTER_MS = 10 * 60_000

/** waiting | live | stale | ended. Anything older than 10 minutes is forgotten (back to waiting). */
export function liveViewState(
  snapshot: LiveSnapshotV2 | null,
  nowMs: number,
  staleAfterMs = 15_000,
  /** When the phone received the snapshot; defaults to the desktop's `ts` (clocks may differ). */
  receivedAtMs: number = snapshot?.ts ?? 0,
): LiveViewState {
  if (!snapshot) return 'waiting'
  const age = nowMs - receivedAtMs
  if (age > EXPIRE_AFTER_MS) return 'waiting'
  if (snapshot.isFinal) return 'ended'
  return age > staleAfterMs ? 'stale' : 'live'
}

/** Publish when something other than `ts` changed, when final, or when the heartbeat interval elapsed. */
export function shouldPublish(prev: LiveSnapshotV2 | null, next: LiveSnapshotV2, heartbeatMs = 10_000): boolean {
  if (!prev) return true
  if (next.isFinal) return true
  if (next.ts - prev.ts >= heartbeatMs) return true
  const a = { ...prev, ts: 0 }
  const b = { ...next, ts: 0 }
  return JSON.stringify(a) !== JSON.stringify(b)
}
