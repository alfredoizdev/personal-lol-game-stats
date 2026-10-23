import { queueLabel } from './queue-label'

/** Minimal Riot MATCH-V5 shape (only the fields this app reads). */
export type MatchV5Participant = {
  puuid: string
  /** 1–10; the key into timeline participantFrames. Falls back to the 1-based index when absent. */
  participantId?: number
  riotIdGameName?: string
  riotIdTagline?: string
  championId: number
  championName: string
  teamId: number
  teamPosition: string
  kills: number
  deaths: number
  assists: number
  totalMinionsKilled: number
  neutralMinionsKilled: number
  visionScore: number
  wardsPlaced?: number
  wardsKilled?: number
  totalDamageDealtToChampions: number
  goldEarned: number
  champLevel: number
  win: boolean
  item0: number
  item1: number
  item2: number
  item3: number
  item4: number
  item5: number
  item6: number
}

export type MatchV5 = {
  metadata: { matchId: string; participants: string[] }
  info: {
    gameCreation: number
    gameDuration: number
    gameEndedInEarlySurrender?: boolean
    gameMode: string
    queueId: number
    participants: MatchV5Participant[]
  }
}

export type Role = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY'
const ROLES: readonly string[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

export type PlayerLine = {
  puuid: string
  participantId: number
  championId: number
  championName: string
  role: Role | null
  kills: number
  deaths: number
  assists: number
  cs: number
  csPerMin: number | null
  visionScore: number
  wardsPlaced: number
  wardsKilled: number
  damageToChampions: number
  gold: number
  level: number
  /** Six item slots in order; 0 = empty. */
  items: number[]
  trinket: number
  win: boolean
}

export type MatchSummary = {
  matchId: string
  queueId: number
  queueLabel: string
  gameMode: string
  durationSec: number
  startedAt: string
  remake: boolean
  /** Kills of the player's team (for kill participation). */
  teamKills: number
  me: PlayerLine
  opponent: PlayerLine | null
}

const REMAKE_MAX_SEC = 300
const MIN_SEC_FOR_RATE = 60

function toRole(teamPosition: string): Role | null {
  return ROLES.includes(teamPosition) ? (teamPosition as Role) : null
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function toLine(p: MatchV5Participant, durationSec: number, index: number): PlayerLine {
  const cs = p.totalMinionsKilled + p.neutralMinionsKilled
  return {
    puuid: p.puuid,
    participantId: p.participantId ?? index + 1,
    championId: p.championId,
    championName: p.championName,
    role: toRole(p.teamPosition),
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    cs,
    csPerMin: durationSec >= MIN_SEC_FOR_RATE ? round1(cs / (durationSec / 60)) : null,
    visionScore: p.visionScore,
    wardsPlaced: p.wardsPlaced ?? 0,
    wardsKilled: p.wardsKilled ?? 0,
    damageToChampions: p.totalDamageDealtToChampions,
    gold: p.goldEarned,
    level: p.champLevel,
    items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5],
    trinket: p.item6,
    win: p.win,
  }
}

/**
 * Lane opponent: the single enemy with the same (non-empty) teamPosition.
 * Zero or several candidates → null; we never guess.
 */
function findOpponent(me: MatchV5Participant, all: MatchV5Participant[]): MatchV5Participant | null {
  const role = toRole(me.teamPosition)
  if (!role) return null
  const candidates = all.filter((p) => p.teamId !== me.teamId && p.teamPosition === me.teamPosition)
  return candidates.length === 1 ? candidates[0]! : null
}

/**
 * Who "me" is. `puuid` is preferred; `gameName`+`tagLine` is the fallback for
 * accounts stored with the LCU's 36-char uuid (which never equals Riot's
 * 78-char encrypted puuid carried by MATCH-V5).
 */
export type PlayerIdentity = { puuid: string; gameName?: string; tagLine?: string }

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase()

function findMe(participants: MatchV5Participant[], identity: PlayerIdentity): MatchV5Participant | undefined {
  const byPuuid = participants.find((p) => p.puuid === identity.puuid)
  if (byPuuid) return byPuuid
  if (!identity.gameName || !identity.tagLine) return undefined
  const g = norm(identity.gameName)
  const t = norm(identity.tagLine)
  return participants.find((p) => norm(p.riotIdGameName) === g && norm(p.riotIdTagline) === t)
}

/** Summarize one MATCH-V5 blob from the point of view of the player. Null when they did not play in it. */
export function summarizeMatch(blob: MatchV5, identity: string | PlayerIdentity): MatchSummary | null {
  const id: PlayerIdentity = typeof identity === 'string' ? { puuid: identity } : identity
  const me = findMe(blob.info.participants, id)
  if (!me) return null
  const all = blob.info.participants
  const durationSec = blob.info.gameDuration
  const opponent = findOpponent(me, all)
  return {
    matchId: blob.metadata.matchId,
    queueId: blob.info.queueId,
    queueLabel: queueLabel(blob.info.queueId),
    gameMode: blob.info.gameMode,
    durationSec,
    startedAt: new Date(blob.info.gameCreation).toISOString(),
    remake: blob.info.gameEndedInEarlySurrender === true || durationSec < REMAKE_MAX_SEC,
    teamKills: all.filter((p) => p.teamId === me.teamId).reduce((sum, p) => sum + p.kills, 0),
    me: toLine(me, durationSec, all.indexOf(me)),
    opponent: opponent ? toLine(opponent, durationSec, all.indexOf(opponent)) : null,
  }
}
