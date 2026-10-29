/**
 * "Your sessions" (owner, 2026-10-29): how the player plays across a sitting,
 * from the same 100 games — the next game after a loss against the next game
 * after a win, and games 1–2 of a session against the 4th game onwards. Nothing
 * about the team or the enemy: only what the player does, game after game.
 */
import type { MatchSummary } from '../match-v5'
import { ANALYZABLE_QUEUES } from '../analysis/targets'

/** A gap this long between one game ending and the next starting opens a new session. */
export const SESSION_GAP_MIN = 90
/** Each side of a comparison needs this many games to be shown. */
export const SESSION_MIN_SIDE = 5
const MIN_SESSIONS = 3
/** Games 1–2 of a session are "early"; the 4th onwards is "deep" (the 3rd belongs to neither). */
const EARLY_UPTO = 2
const DEEP_FROM = 4

export type SideRate = { winRate: number; n: number }
export type SideForm = { winRate: number; deaths: number; n: number }
export type SessionPatterns = {
  sessions: number
  avgGames: number
  longest: number
  afterLoss: SideRate | null
  afterWin: SideRate | null
  early: SideForm | null
  deep: SideForm | null
}

const pct = (part: number, whole: number) => Math.round((part / whole) * 100)
const round1 = (n: number) => Math.round(n * 10) / 10

function rate(games: MatchSummary[]): SideRate | null {
  return games.length >= SESSION_MIN_SIDE ? { winRate: pct(games.filter((g) => g.me.win).length, games.length), n: games.length } : null
}
function form(games: MatchSummary[]): SideForm | null {
  const r = rate(games)
  return r ? { ...r, deaths: round1(games.reduce((s, g) => s + g.me.deaths, 0) / games.length) } : null
}

export function sessionsOf(all: MatchSummary[]): MatchSummary[][] {
  const games = all.filter((s) => ANALYZABLE_QUEUES.has(s.queueId) && !s.remake).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
  const sessions: MatchSummary[][] = []
  let prevEnd = -Infinity
  for (const g of games) {
    const start = Date.parse(g.startedAt)
    if (start - prevEnd > SESSION_GAP_MIN * 60_000 || sessions.length === 0) sessions.push([])
    sessions[sessions.length - 1]!.push(g)
    prevEnd = start + g.durationSec * 1000
  }
  return sessions
}

export function sessionPatterns(all: MatchSummary[]): SessionPatterns | null {
  const sessions = sessionsOf(all)
  if (sessions.length < MIN_SESSIONS) return null
  const afterLoss: MatchSummary[] = []
  const afterWin: MatchSummary[] = []
  const early: MatchSummary[] = []
  const deep: MatchSummary[] = []
  for (const s of sessions) {
    s.forEach((g, i) => {
      if (i > 0) (s[i - 1]!.me.win ? afterWin : afterLoss).push(g)
      if (i < EARLY_UPTO) early.push(g)
      else if (i >= DEEP_FROM - 1) deep.push(g)
    })
  }
  const total = sessions.reduce((n, s) => n + s.length, 0)
  return {
    sessions: sessions.length,
    avgGames: round1(total / sessions.length),
    longest: Math.max(...sessions.map((s) => s.length)),
    afterLoss: rate(afterLoss),
    afterWin: rate(afterWin),
    early: form(early),
    deep: form(deep),
  }
}
