import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '../src/match-v5'
import { sessionPatterns, SESSION_GAP_MIN, SESSION_MIN_SIDE } from '../src/performance/session-patterns'
import { game } from './analysis-fixtures'

const T0 = Date.UTC(2026, 9, 1, 18)
const MIN = 60_000
let n = 0
/** A 30-minute game starting `startMin` minutes after T0. */
function g(startMin: number, me: Partial<PlayerLine>): MatchSummary {
  n += 1
  return game({ role: 'MIDDLE', ...me }, { matchId: `s${n}`, startedAt: new Date(T0 + startMin * MIN).toISOString() })
}
/** One session of consecutive 30-minute games, 5 minutes apart, starting `startMin`. */
function session(startMin: number, games: Array<Partial<PlayerLine>>): MatchSummary[] {
  return games.map((me, i) => g(startMin + i * 35, me))
}
const W = { win: true, deaths: 3 }
const L = { win: false, deaths: 7 }

describe('sessionPatterns (owner, 2026-10-29: how you play in a session — after a loss, deep into the night)', () => {
  it('splits games into sessions by the gap between one game ending and the next starting', () => {
    const all = [...session(0, [W, L, W]), ...session(60 * 24, [L, L]), g(60 * 48, W)]
    const p = sessionPatterns(all)!
    expect(p.sessions).toBe(3)
    expect(p.avgGames).toBe(2)
    expect(p.longest).toBe(3)
  })
  it(`a gap under ${SESSION_GAP_MIN} minutes keeps the same session; a longer one starts another`, () => {
    const a = g(0, W)
    const b = g(30 + SESSION_GAP_MIN - 1, W) // ends at 30, starts just inside the gap
    const c = g(30 + SESSION_GAP_MIN - 1 + 30 + SESSION_GAP_MIN + 1, W)
    const d = g(60 * 24, W)
    expect(sessionPatterns([a, b, c, d])!.sessions).toBe(3)
  })
  it('win rate of the next game after a loss and after a win, inside a session', () => {
    // each session: W L W L L W  → after W: L, L, (end)… count transitions
    const all = [...session(0, [W, L, W, L, L, W]), ...session(60 * 24, [W, L, W, L, L, W]), ...session(60 * 48, [L, W, L, W, W, L])]
    const p = sessionPatterns(all)!
    // after a loss (8 transitions): W, L, W, W, L, W, W, W → 6 wins
    expect(p.afterLoss).toEqual({ winRate: 75, n: 8 })
    // after a win (7 transitions): L, L, L, L, L, W, L → 1 win
    expect(p.afterWin).toEqual({ winRate: 14, n: 7 })
  })
  it('games 1–2 of a session against the 4th game onwards: win rate and deaths per game', () => {
    const all = [
      ...session(0, [W, W, L, L, L]),
      ...session(60 * 24, [W, L, W, L, L]),
      ...session(60 * 48, [W, W, W, L, L, L]),
    ]
    const p = sessionPatterns(all)!
    expect(p.early).toEqual({ winRate: 83, deaths: 3.7, n: 6 }) // 5 W 1 L: (3*5+7)/6 = 3.67
    expect(p.deep).toEqual({ winRate: 0, deaths: 7.0, n: 7 })
  })
  it(`a side with fewer than ${SESSION_MIN_SIDE} games is null, and so is the whole thing without three sessions`, () => {
    const p = sessionPatterns([...session(0, [W, L]), ...session(60 * 24, [W, L]), ...session(60 * 48, [W, L])])!
    expect(p.sessions).toBe(3)
    expect(p.afterLoss).toBeNull() // 0 transitions after a loss
    expect(p.deep).toBeNull()
    expect(sessionPatterns([...session(0, [W, L, W]), ...session(60 * 24, [L, L])])).toBeNull()
  })
  it('ignores remakes and queues the app does not analyse', () => {
    const all = [...session(0, [W, L, W]), ...session(60 * 24, [L, L]), ...session(60 * 48, [W])]
    all.push({ ...g(60 * 72, W), remake: true }, { ...g(60 * 96, W), queueId: 450 })
    expect(sessionPatterns(all)!.sessions).toBe(3)
  })
})
