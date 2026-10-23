import { describe, it, expect } from 'vitest'
import type { RawAllGameData, RawLivePlayer } from '../src/live'
import { MAX_EVENTS, normalizeEvents, type RawLiveEvent } from '../src/live-events'

const p = (name: string, champ: string, team: 'ORDER' | 'CHAOS', tag = 'NA1'): RawLivePlayer => ({
  riotIdGameName: name, riotIdTagLine: tag, summonerName: `${name}#${tag}`, championName: champ, team, position: 'MIDDLE', level: 5,
  scores: { kills: 0, deaths: 0, assists: 0, creepScore: 0, wardScore: 0 }, items: [],
})
const me = p('Hexed', 'Yasuo', 'ORDER', '7551')
const players = [me, p('Ally', 'Lee Sin', 'ORDER'), p('Foe', 'Yone', 'CHAOS'), p('Foe2', 'Zed', 'CHAOS')]
const raw = (events: RawLiveEvent[]): RawAllGameData => ({ allPlayers: players, gameData: { gameTime: 600, gameMode: 'CLASSIC' }, events: { Events: events } })

describe('normalizeEvents', () => {
  it('maps a kill where I am the killer, with champion names and the me/ally flags', () => {
    const [e] = normalizeEvents(raw([{ EventID: 3, EventName: 'ChampionKill', EventTime: 300.2, KillerName: 'Hexed#7551', VictimName: 'Foe#NA1', Assisters: ['Ally#NA1'] }]), me)
    expect(e).toEqual({ id: 3, time: 300.2, type: 'ChampionKill', actor: 'Yasuo', victim: 'Yone', assisters: ['Lee Sin'], actorIsMe: true, victimIsMe: false, actorIsAlly: true, meta: {} })
  })
  it('maps a death of mine (killer enemy) and accepts legacy summoner names', () => {
    const [e] = normalizeEvents(raw([{ EventID: 4, EventName: 'ChampionKill', EventTime: 310, KillerName: 'Foe', VictimName: 'Hexed', Assisters: [] }]), me)
    expect(e?.victimIsMe).toBe(true)
    expect(e?.actor).toBe('Yone')
    expect(e?.actorIsAlly).toBe(false)
  })
  it('keeps the kill streak of a Multikill and the dragon type and steal flag of a DragonKill', () => {
    const out = normalizeEvents(raw([
      { EventID: 5, EventName: 'Multikill', EventTime: 311, KillerName: 'Hexed#7551', KillStreak: 2 },
      { EventID: 6, EventName: 'DragonKill', EventTime: 400, KillerName: 'Ally#NA1', DragonType: 'Fire', Stolen: 'False', Assisters: [] },
    ]), me)
    expect(out[0]).toMatchObject({ type: 'Multikill', actorIsMe: true, meta: { killStreak: 2 } })
    expect(out[1]).toMatchObject({ type: 'DragonKill', actor: 'Lee Sin', actorIsAlly: true, meta: { dragonType: 'Fire', stolen: false } })
  })
  it('a structure event by an enemy: actor null when it is a turret, victim is the structure label', () => {
    const [e] = normalizeEvents(raw([{ EventID: 7, EventName: 'TurretKilled', EventTime: 500, KillerName: 'Foe#NA1', TurretKilled: 'Turret_T1_C_05_A', Assisters: [] }]), me)
    expect(e).toMatchObject({ type: 'TurretKilled', actor: 'Yone', actorIsAlly: false, victim: 'Turret' })
    const [m] = normalizeEvents(raw([{ EventID: 8, EventName: 'InhibKilled', EventTime: 900, KillerName: 'Minion_T200L1S01', InhibKilled: 'Barracks_T2_C1', Assisters: [] }]), me)
    expect(m).toMatchObject({ type: 'InhibKilled', actor: null, actorIsAlly: null, victim: 'Inhibitor' })
  })
  it('maps FirstBlood (Recipient), Ace (AcingTeam) and GameEnd (Result)', () => {
    const out = normalizeEvents(raw([
      { EventID: 1, EventName: 'FirstBlood', EventTime: 120, Recipient: 'Hexed#7551' },
      { EventID: 2, EventName: 'Ace', EventTime: 130, Acer: 'Foe#NA1', AcingTeam: 'CHAOS' },
      { EventID: 9, EventName: 'GameEnd', EventTime: 1500, Result: 'Win' },
    ]), me)
    expect(out[0]).toMatchObject({ type: 'FirstBlood', actor: 'Yasuo', actorIsMe: true })
    expect(out[1]).toMatchObject({ type: 'Ace', actor: 'Yone', actorIsAlly: false })
    expect(out[2]).toMatchObject({ type: 'GameEnd', meta: { result: 'Win' } })
  })
  it('drops unknown events, keeps EventID order and only the last 20', () => {
    const many: RawLiveEvent[] = Array.from({ length: 25 }, (_, i) => ({ EventID: i + 1, EventName: 'ChampionKill', EventTime: i, KillerName: 'Hexed#7551', VictimName: 'Foe#NA1', Assisters: [] }))
    const out = normalizeEvents(raw([{ EventID: 99, EventName: 'SomethingNew', EventTime: 1 }, ...many.slice().reverse()]), me)
    expect(out.length).toBe(MAX_EVENTS)
    expect(out[0]?.id).toBe(6)
    expect(out.at(-1)?.id).toBe(25)
  })
  it('returns [] when the payload has no events', () => {
    expect(normalizeEvents({ allPlayers: players, gameData: {} }, me)).toEqual([])
  })
})
