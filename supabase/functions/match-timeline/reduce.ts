// Reduces a Riot MATCH-V5 timeline (0.5–2 MB: 10 participant frames per
// minute plus every event) to the per-minute numbers the phone needs
// (~10 KB). Dependency-free so the same file is unit-tested from
// packages/shared/tests/timeline-reduce.test.ts and bundled by Deno.
//
// Output contract = `TimelineSeries` in packages/shared/src/analysis/timeline-series.ts:
//   { v: 1, matchId, participants: [{ participantId, puuid }], frames: [{ t, cs[10], gold[10], xp[10] }] }
// Arrays are indexed by participantId − 1; cs = minionsKilled + jungleMinionsKilled.
// A missing or corrupt participant frame is `null` (never 0): the engine treats
// null as unknown and skips it, while 0 would read as a huge lead or deficit.

export type RiotParticipantFrame = {
  participantId?: number
  minionsKilled?: number
  jungleMinionsKilled?: number
  totalGold?: number
  xp?: number
}

export type RiotTimeline = {
  metadata: { matchId: string; participants: string[] }
  info: {
    frameInterval?: number
    frames: Array<{ timestamp: number; participantFrames: Record<string, RiotParticipantFrame>; events?: unknown[] }>
    participants: Array<{ participantId: number; puuid: string }>
  }
}

export type TimelineSeries = {
  v: 1
  matchId: string
  participants: Array<{ participantId: number; puuid: string }>
  frames: Array<{ t: number; cs: Array<number | null>; gold: Array<number | null>; xp: Array<number | null> }>
}

const PLAYERS = 10

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function reduceTimeline(raw: RiotTimeline): TimelineSeries {
  const participants = (raw.info.participants ?? [])
    .filter((p) => typeof p.participantId === 'number' && typeof p.puuid === 'string')
    .map((p) => ({ participantId: p.participantId, puuid: p.puuid }))
  const frames = (raw.info.frames ?? []).map((f) => {
    const cs = new Array<number | null>(PLAYERS).fill(null)
    const gold = new Array<number | null>(PLAYERS).fill(null)
    const xp = new Array<number | null>(PLAYERS).fill(null)
    for (const [key, pf] of Object.entries(f.participantFrames ?? {})) {
      const id = typeof pf?.participantId === 'number' ? pf.participantId : Number(key)
      if (!Number.isInteger(id) || id < 1 || id > PLAYERS) continue
      const minions = num(pf.minionsKilled)
      const jungle = num(pf.jungleMinionsKilled)
      cs[id - 1] = minions === null ? null : minions + (jungle ?? 0)
      gold[id - 1] = num(pf.totalGold)
      xp[id - 1] = num(pf.xp)
    }
    return { t: Math.round((num(f.timestamp) ?? 0) / 1000), cs, gold, xp }
  })
  return { v: 1, matchId: raw.metadata.matchId, participants, frames }
}
