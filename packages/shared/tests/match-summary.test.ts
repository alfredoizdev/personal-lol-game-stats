import { describe, it, expect } from 'vitest'
import { summarizeMatch, type MatchV5, type MatchV5Participant } from '../src/match-v5'

const ME = 'ME-PUUID'
type P = Partial<MatchV5Participant> & { puuid: string; teamId: 100 | 200 }

function participant(p: P): MatchV5Participant {
  return {
    puuid: p.puuid,
    riotIdGameName: p.riotIdGameName ?? 'Name',
    riotIdTagline: p.riotIdTagline ?? 'NA1',
    championId: p.championId ?? 1,
    championName: p.championName ?? 'Annie',
    teamId: p.teamId,
    teamPosition: p.teamPosition ?? 'TOP',
    kills: p.kills ?? 0,
    deaths: p.deaths ?? 0,
    assists: p.assists ?? 0,
    totalMinionsKilled: p.totalMinionsKilled ?? 0,
    neutralMinionsKilled: p.neutralMinionsKilled ?? 0,
    visionScore: p.visionScore ?? 0,
    wardsPlaced: p.wardsPlaced ?? 0,
    totalDamageDealtToChampions: p.totalDamageDealtToChampions ?? 0,
    goldEarned: p.goldEarned ?? 0,
    champLevel: p.champLevel ?? 1,
    win: p.win ?? false,
    item0: p.item0 ?? 0, item1: p.item1 ?? 0, item2: p.item2 ?? 0,
    item3: p.item3 ?? 0, item4: p.item4 ?? 0, item5: p.item5 ?? 0, item6: p.item6 ?? 0,
  }
}

function blob(opts: {
  me: P
  enemies?: P[]
  allies?: P[]
  duration?: number
  queueId?: number
  earlySurrender?: boolean
}): MatchV5 {
  const allies = opts.allies ?? [
    { puuid: 'A2', teamId: 100, teamPosition: 'JUNGLE' },
    { puuid: 'A3', teamId: 100, teamPosition: 'TOP' },
    { puuid: 'A4', teamId: 100, teamPosition: 'BOTTOM' },
    { puuid: 'A5', teamId: 100, teamPosition: 'UTILITY' },
  ]
  const enemies = opts.enemies ?? [
    { puuid: 'E1', teamId: 200, teamPosition: 'MIDDLE', championName: 'Yone', championId: 777, kills: 1, deaths: 3, assists: 1, totalMinionsKilled: 150 },
    { puuid: 'E2', teamId: 200, teamPosition: 'JUNGLE' },
    { puuid: 'E3', teamId: 200, teamPosition: 'TOP' },
    { puuid: 'E4', teamId: 200, teamPosition: 'BOTTOM' },
    { puuid: 'E5', teamId: 200, teamPosition: 'UTILITY' },
  ]
  const participants = [participant(opts.me), ...allies.map(participant), ...enemies.map(participant)]
  return {
    metadata: { matchId: 'NA1_123', participants: participants.map((p) => p.puuid) },
    info: {
      gameCreation: Date.UTC(2026, 9, 21, 10, 0, 0),
      gameDuration: opts.duration ?? 1694,
      gameEndedInEarlySurrender: opts.earlySurrender ?? false,
      gameMode: 'CLASSIC',
      queueId: opts.queueId ?? 420,
      participants,
    },
  }
}

const me: P = {
  puuid: ME, teamId: 100, teamPosition: 'MIDDLE', championName: 'Yasuo', championId: 157,
  kills: 12, deaths: 4, assists: 8, totalMinionsKilled: 200, neutralMinionsKilled: 28, visionScore: 21,
  totalDamageDealtToChampions: 21400, goldEarned: 14300, champLevel: 16, win: true,
  item0: 3031, item1: 6673, item2: 3006, item3: 3046, item4: 0, item5: 0, item6: 3363,
}

describe('summarizeMatch', () => {
  it('summarizes the player and the lane opponent', () => {
    const s = summarizeMatch(blob({ me }), ME)
    expect(s).not.toBeNull()
    expect(s!.matchId).toBe('NA1_123')
    expect(s!.queueId).toBe(420)
    expect(s!.queueLabel).toBe('Ranked Solo')
    expect(s!.durationSec).toBe(1694)
    expect(s!.startedAt).toBe('2026-10-21T10:00:00.000Z')
    expect(s!.remake).toBe(false)
    expect(s!.me).toMatchObject({
      puuid: ME, championName: 'Yasuo', championId: 157, role: 'MIDDLE',
      kills: 12, deaths: 4, assists: 8, cs: 228, visionScore: 21, damageToChampions: 21400, gold: 14300, level: 16, win: true,
      items: [3031, 6673, 3006, 3046, 0, 0], trinket: 3363,
    })
    expect(s!.me.csPerMin).toBe(8.1) // 228 / 28.233 = 8.07 → 8.1
    expect(s!.opponent).toMatchObject({ puuid: 'E1', championName: 'Yone', role: 'MIDDLE', cs: 150 })
  })

  it('opponent is null when two enemies share the lane', () => {
    const s = summarizeMatch(
      blob({
        me,
        enemies: [
          { puuid: 'E1', teamId: 200, teamPosition: 'MIDDLE' },
          { puuid: 'E2', teamId: 200, teamPosition: 'MIDDLE' },
          { puuid: 'E3', teamId: 200, teamPosition: 'TOP' },
          { puuid: 'E4', teamId: 200, teamPosition: 'BOTTOM' },
          { puuid: 'E5', teamId: 200, teamPosition: 'UTILITY' },
        ],
      }),
      ME,
    )
    expect(s!.opponent).toBeNull()
  })

  it('ARAM (empty teamPosition) has no role and no opponent', () => {
    const s = summarizeMatch(blob({ me: { ...me, teamPosition: '' }, queueId: 450 }), ME)
    expect(s!.me.role).toBeNull()
    expect(s!.opponent).toBeNull()
    expect(s!.queueLabel).toBe('ARAM')
  })

  it('flags remakes and still computes csPerMin when duration ≥ 60 s', () => {
    const s = summarizeMatch(blob({ me, duration: 120, earlySurrender: true }), ME)
    expect(s!.remake).toBe(true)
    expect(s!.me.csPerMin).toBe(114)
  })

  it('flags a sub-5-minute game as a remake even without the surrender flag', () => {
    expect(summarizeMatch(blob({ me, duration: 299 }), ME)!.remake).toBe(true)
  })

  it('csPerMin is null when the game lasted under a minute', () => {
    expect(summarizeMatch(blob({ me, duration: 30 }), ME)!.me.csPerMin).toBeNull()
  })

  it('returns null when the puuid is not a participant', () => {
    expect(summarizeMatch(blob({ me }), 'SOMEONE-ELSE')).toBeNull()
  })

  it('falls back to the Riot ID when the stored puuid is the LCU 36-char form', () => {
    const b = blob({ me: { ...me, riotIdGameName: 'CyberFluxLOL', riotIdTagline: '9214' } })
    const s = summarizeMatch(b, { puuid: '5336b049-acb8-5319-a139-32ae5c004afc', gameName: 'CyberFluxLOL', tagLine: '9214' })
    expect(s).not.toBeNull()
    expect(s!.me.championName).toBe('Yasuo')
    expect(s!.me.puuid).toBe(ME) // the encrypted puuid from the blob, not the stored one
  })

  it('Riot ID fallback is case-insensitive and trims', () => {
    const b = blob({ me: { ...me, riotIdGameName: 'CyberFluxLOL', riotIdTagline: '9214' } })
    expect(summarizeMatch(b, { puuid: 'nope', gameName: ' cyberfluxlol ', tagLine: '9214' })).not.toBeNull()
  })

  it('still returns null when neither puuid nor Riot ID match', () => {
    expect(summarizeMatch(blob({ me }), { puuid: 'nope', gameName: 'Other', tagLine: 'NA1' })).toBeNull()
  })
})
