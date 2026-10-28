/**
 * LP per game (owner, 2026-10-27: "sí hay que mostrar el LP"). Riot's match
 * data carries no LP, so the app records the player's own league-v4 standing
 * every time it reads it (a "snapshot"). Between two snapshots whose season
 * record grew by exactly one game, the LP difference belongs to the one
 * ranked game of that queue that ended in between. Several games between two
 * snapshots cannot be split honestly and get nothing. Own data only; pure.
 */
import type { MatchSummary } from './match-v5'
import type { RankEntry, RankQueue } from './rank'

export type RankSnapshot = { queue: RankQueue; tier: string; division: string; leaguePoints: number; wins: number; losses: number; takenAt: string }
export type LpChange = { delta: number; promoted: boolean; demoted: boolean; /** "Gold II": the standing after the game */ to: string }

const QUEUE_ID: Record<RankQueue, number> = { solo: 420, flex: 440 }
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']
const DIVISIONS = ['IV', 'III', 'II', 'I']
const APEX = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER'])
/** League-v4 can lag the match by a minute or two: a game that ended just before a snapshot may not be in it yet. */
const LAG_MS = 3 * 60_000

export function snapshotOf(entry: RankEntry, takenAt: string): RankSnapshot {
  return { queue: entry.queue, tier: entry.tier, division: entry.division, leaguePoints: entry.leaguePoints, wins: entry.wins, losses: entry.losses, takenAt }
}

/** Worth storing only when the standing moved (LP, division, tier or record). */
export function snapshotChanged(prev: RankSnapshot | null, next: RankSnapshot): boolean {
  if (!prev) return true
  return prev.tier !== next.tier || prev.division !== next.division || prev.leaguePoints !== next.leaguePoints || prev.wins !== next.wins || prev.losses !== next.losses
}

const word = (tier: string) => tier.charAt(0) + tier.slice(1).toLowerCase()
const standing = (s: RankSnapshot) => (APEX.has(s.tier) || !s.division ? word(s.tier) : `${word(s.tier)} ${s.division}`)
/** Divisions in a line: Iron IV = 0 … Diamond I = 27; apex tiers above with no division. */
const rung = (s: RankSnapshot) => TIERS.indexOf(s.tier) * 4 + (APEX.has(s.tier) ? 0 : Math.max(0, DIVISIONS.indexOf(s.division)))

function changeBetween(a: RankSnapshot, b: RankSnapshot): LpChange {
  const ra = rung(a)
  const rb = rung(b)
  const apex = APEX.has(a.tier) || APEX.has(b.tier)
  if (ra === rb || apex) return { delta: b.leaguePoints - a.leaguePoints, promoted: rb > ra, demoted: rb < ra, to: standing(b) }
  if (rb > ra) return { delta: 100 - a.leaguePoints + b.leaguePoints, promoted: true, demoted: false, to: standing(b) }
  return { delta: -(a.leaguePoints + (100 - b.leaguePoints)), promoted: false, demoted: true, to: standing(b) }
}

export function lpChanges(snapshots: RankSnapshot[], matches: MatchSummary[]): Map<string, LpChange> {
  const out = new Map<string, LpChange>()
  for (const queue of ['solo', 'flex'] as RankQueue[]) {
    const snaps = snapshots.filter((s) => s.queue === queue).sort((x, y) => Date.parse(x.takenAt) - Date.parse(y.takenAt))
    const games = matches.filter((m) => m.queueId === QUEUE_ID[queue] && !m.remake)
    for (let i = 1; i < snaps.length; i++) {
      const a = snaps[i - 1]!
      const b = snaps[i]!
      const wonOne = b.wins === a.wins + 1 && b.losses === a.losses
      const lostOne = b.losses === a.losses + 1 && b.wins === a.wins
      if (!wonOne && !lostOne) continue
      const from = Date.parse(a.takenAt) - LAG_MS
      const to = Date.parse(b.takenAt)
      const candidates = games
        .filter((m) => m.me.win === wonOne)
        .filter((m) => {
          const ended = Date.parse(m.startedAt) + m.durationSec * 1000
          return ended > from && ended <= to
        })
        .sort((x, y) => Date.parse(y.startedAt) - Date.parse(x.startedAt))
      const match = candidates[0]
      if (!match || out.has(match.matchId)) continue
      out.set(match.matchId, changeBetween(a, b))
    }
  }
  return out
}

/** "+18 LP", "−15 LP", "+25 LP · ↑ Gold II". */
export function formatLpChange(c: LpChange): string {
  const lp = `${c.delta < 0 ? '−' : '+'}${Math.abs(c.delta)} LP`
  if (c.promoted) return `${lp} · ↑ ${c.to}`
  if (c.demoted) return `${lp} · ↓ ${c.to}`
  return lp
}
