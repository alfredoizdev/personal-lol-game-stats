/**
 * Read-only LCU client. Only three endpoints are used by this app:
 *   GET /lol-summoner/v1/current-summoner
 *   GET /lol-gameflow/v1/gameflow-phase
 *   GET /lol-lobby/v2/lobby
 * Loopback HTTPS with the self-signed cert Riot ships (not validated).
 */
import https from 'node:https'
import type { GameflowPhase, Summoner } from '@lpp/shared'
import type { LockfileData } from './lockfile'

const KNOWN_PHASES: GameflowPhase[] = [
  'None',
  'Lobby',
  'Matchmaking',
  'ReadyCheck',
  'ChampSelect',
  'GameStart',
  'InProgress',
  'WaitingForStats',
  'PreEndOfGame',
  'EndOfGame',
  'Reconnect',
]

const REQUEST_TIMEOUT_MS = 3000

const agent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
})

type LcuRawSummoner = {
  displayName?: unknown
  gameName?: unknown
  tagLine?: unknown
  summonerLevel?: unknown
  profileIconId?: unknown
  puuid?: unknown
}

function pickString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function pickNumber(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function coerceSummoner(raw: LcuRawSummoner): Summoner {
  return {
    displayName: pickString(raw.displayName),
    gameName: pickString(raw.gameName),
    tagLine: pickString(raw.tagLine),
    summonerLevel: pickNumber(raw.summonerLevel),
    profileIconId: pickNumber(raw.profileIconId),
    puuid: pickString(raw.puuid),
  }
}

/** Generic GET against the LCU. Kept generic so later phases can add endpoints. */
export function lcuGet<T>(lockfile: LockfileData, path: string): Promise<T> {
  const auth = 'Basic ' + Buffer.from(`riot:${lockfile.password}`).toString('base64')

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: '127.0.0.1',
        port: lockfile.port,
        path,
        method: 'GET',
        agent,
        headers: { authorization: auth, accept: 'application/json' },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c as Buffer))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')
          const status = res.statusCode ?? 0
          if (status < 200 || status >= 300) {
            reject(new Error(`LCU ${status} ${res.statusMessage ?? ''}`.trim()))
            return
          }
          try {
            resolve(JSON.parse(body) as T)
          } catch {
            reject(new Error('LCU response was not JSON'))
          }
        })
      },
    )
    req.on('timeout', () => {
      req.destroy(new Error('LCU request timeout'))
    })
    req.on('error', reject)
    req.end()
  })
}

export async function lcuGetCurrentSummoner(lockfile: LockfileData): Promise<Summoner> {
  const raw = await lcuGet<unknown>(lockfile, '/lol-summoner/v1/current-summoner')
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Unexpected LCU response shape')
  }
  return coerceSummoner(raw as LcuRawSummoner)
}

/** Current gameflow phase, or null when the LCU is unreachable or the value is unknown. */
export async function lcuGetGameflowPhase(lockfile: LockfileData): Promise<GameflowPhase | null> {
  const raw = await lcuGet<unknown>(lockfile, '/lol-gameflow/v1/gameflow-phase').catch(() => null)
  if (typeof raw !== 'string') return null
  return (KNOWN_PHASES as string[]).includes(raw) ? (raw as GameflowPhase) : null
}

/** queueId from the lobby (available during Matchmaking / ReadyCheck), or null. */
export async function lcuGetLobbyQueueId(lockfile: LockfileData): Promise<number | null> {
  const raw = await lcuGet<unknown>(lockfile, '/lol-lobby/v2/lobby').catch(() => null)
  if (!raw || typeof raw !== 'object') return null
  const gameConfig = (raw as Record<string, unknown>).gameConfig
  if (!gameConfig || typeof gameConfig !== 'object') return null
  const id = pickNumber((gameConfig as Record<string, unknown>).queueId)
  return Number.isFinite(id) && id > 0 ? id : null
}
