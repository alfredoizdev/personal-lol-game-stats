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

export function createDemoDeps(opts: { appPath: string; identity: () => { gameName: string; tagLine: string } | null }): LivePollerDeps {
  const fixture = JSON.parse(readFileSync(path.join(opts.appPath, 'fixtures', 'live-allgamedata.json'), 'utf8')) as RawAllGameData
  const startedAt = Date.now()
  const elapsed = () => Math.floor((Date.now() - startedAt) / 1000)

  const rename = (p: RawLivePlayer): RawLivePlayer => {
    const id = opts.identity()
    if (!id || p.riotIdGameName !== '__ME__') return p
    return { ...p, riotIdGameName: id.gameName, riotIdTagLine: id.tagLine, summonerName: `${id.gameName}#${id.tagLine}` }
  }

  return {
    getPhase: async (): Promise<GameflowPhase | null> => (elapsed() < GAME_SECONDS ? 'InProgress' : 'WaitingForStats'),
    getQueueId: async () => 420,
    getAllGameData: async () => {
      const t = elapsed()
      if (t >= GAME_SECONDS) return null
      const players = (fixture.allPlayers ?? []).map(rename).map((p, i) => {
        // Simple progression: me farms 7.5 cs/min, the enemy mid 6.5; a kill for me at 20 s.
        const isMe = i === 0
        const isEnemyMid = p.position === 'MIDDLE' && p.team === 'CHAOS'
        const rate = isMe ? 7.5 : isEnemyMid ? 6.5 : 5
        const cs = Math.floor((t / 60) * rate * 10) // 10x so numbers look like minute 10
        return {
          ...p,
          level: 1 + Math.floor(t / 6),
          scores: { ...p.scores, creepScore: cs, kills: isMe && t >= 20 ? 1 : 0, deaths: isEnemyMid && t >= 20 ? 1 : 0, wardScore: t / 10 + 0.0152835845 }, // float like the real Live Client API
        }
      })
      return { ...fixture, allPlayers: players, gameData: { gameTime: t * 10 + 600, gameMode: 'DEMO' } }
    },
    now: () => Date.now(),
  }
}

export const DEMO_TICK_SECONDS = TICK_SECONDS
