/**
 * DEV ONLY. Scripted stand-in for the LCU phase + Live Client so the whole
 * desktop → Supabase → phone pipeline can be exercised without a real match.
 * Enabled by LPP_LIVE_DEMO=1 and never in packaged builds. The snapshot's
 * gameMode is 'DEMO' so the phone shows a DEMO badge, never LIVE.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { GameflowPhase, RawAllGameData, RawLivePlayer } from '@lpp/shared'
import type { LivePollerDeps } from '../league/live-poller'

const GAME_SECONDS = 60
const TICK_SECONDS = 2
/** Pre-game script (wall seconds): queue → ready check → champ select → loading, then the 60 s game, then end of game → lobby. */
const PRE: Array<{ until: number; phase: GameflowPhase }> = [
  { until: 8, phase: 'Matchmaking' },
  { until: 11, phase: 'ReadyCheck' },
  { until: 16, phase: 'ChampSelect' },
  { until: 18, phase: 'GameStart' },
]
const GAME_START = 18
const DEATH_AT = 30 // game second I die; respawn 20 s
const RESPAWN = 20

export function createDemoDeps(opts: { appPath: string; identity: () => { gameName: string; tagLine: string } | null }): LivePollerDeps {
  const fixture = JSON.parse(readFileSync(path.join(opts.appPath, 'fixtures', 'live-allgamedata.json'), 'utf8')) as RawAllGameData
  const startedAt = Date.now()
  const elapsed = () => Math.floor((Date.now() - startedAt) / 1000)

  const rename = (p: RawLivePlayer): RawLivePlayer => {
    const id = opts.identity()
    if (!id || p.riotIdGameName !== '__ME__') return p
    return { ...p, riotIdGameName: id.gameName, riotIdTagLine: id.tagLine, summonerName: `${id.gameName}#${id.tagLine}` }
  }

  const gameSec = () => elapsed() - GAME_START
  const name = (p: RawLivePlayer) => `${p.riotIdGameName}#${p.riotIdTagLine}`

  return {
    getPhase: async (): Promise<GameflowPhase | null> => {
      const w = elapsed()
      const pre = PRE.find((s) => w < s.until)
      if (pre) return pre.phase
      if (gameSec() < GAME_SECONDS) return 'InProgress'
      return gameSec() < GAME_SECONDS + 5 ? 'EndOfGame' : 'Lobby'
    },
    getQueueId: async () => 420,
    // Champion select in the demo: assigned mid, Yasuo locked after 2 s.
    getPick: async () => (elapsed() < 13 ? { championId: null, position: 'MIDDLE' } : { championId: 157, position: 'MIDDLE' }),
    getAllGameData: async () => {
      const t = gameSec()
      if (t < 0 || t >= GAME_SECONDS) return null
      const renamed = (fixture.allPlayers ?? []).map(rename)
      const me = renamed[0]!
      const enemyMid = renamed.find((p) => p.position === 'MIDDLE' && p.team === 'CHAOS') ?? renamed[1]!
      const ally = renamed.find((p, i) => i !== 0 && p.team === me.team) ?? me
      const dead = t >= DEATH_AT && t < DEATH_AT + RESPAWN
      const players = renamed.map((p, i) => {
        // Simple progression: me farms 7.5 cs/min, the enemy mid 6.5; a kill for me at 20 s, my death at 30 s.
        const isMe = i === 0
        const isEnemyMid = p === enemyMid
        const rate = isMe ? 7.5 : isEnemyMid ? 6.5 : 5
        const cs = Math.floor((t / 60) * rate * 10) // 10x so numbers look like minute 10
        return {
          ...p,
          level: 1 + Math.floor(t / 6),
          scores: { ...p.scores, creepScore: cs, kills: (isMe && t >= 20 ? 1 : 0) + (isEnemyMid && t >= DEATH_AT ? 1 : 0), deaths: (isEnemyMid && t >= 20 ? 1 : 0) + (isMe && t >= DEATH_AT ? 1 : 0), wardScore: t / 10 + 0.0152835845 }, // float like the real Live Client API
          isDead: isMe ? dead : false,
          respawnTimer: isMe && dead ? DEATH_AT + RESPAWN - t : 0,
        }
      })
      const g = (sec: number) => sec * 10 + 600 // demo game clock
      const events = [
        { EventID: 0, EventName: 'GameStart', EventTime: g(0) },
        { EventID: 1, EventName: 'MinionsSpawning', EventTime: g(6) },
        ...(t >= 20 ? [{ EventID: 2, EventName: 'FirstBlood', EventTime: g(20), Recipient: name(me) }, { EventID: 3, EventName: 'ChampionKill', EventTime: g(20), KillerName: name(me), VictimName: name(enemyMid), Assisters: [] }] : []),
        ...(t >= DEATH_AT ? [{ EventID: 4, EventName: 'ChampionKill', EventTime: g(DEATH_AT), KillerName: name(enemyMid), VictimName: name(me), Assisters: [] }] : []),
        ...(t >= 42 ? [{ EventID: 5, EventName: 'DragonKill', EventTime: g(42), KillerName: name(ally), DragonType: 'Fire', Stolen: 'False', Assisters: [name(me)] }] : []),
        ...(t >= 52 ? [{ EventID: 6, EventName: 'TurretKilled', EventTime: g(52), KillerName: name(ally), TurretKilled: 'Turret_T2_C_05_A', Assisters: [] }] : []),
      ]
      return { ...fixture, allPlayers: players, gameData: { gameTime: g(t), gameMode: 'DEMO' }, events: { Events: events } }
    },
    now: () => Date.now(),
  }
}

export const DEMO_TICK_SECONDS = TICK_SECONDS
