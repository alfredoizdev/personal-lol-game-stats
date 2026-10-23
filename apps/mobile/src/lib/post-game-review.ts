/** Riot's history usually lists a finished game within a minute or two; after this we stop looking and point to Matches. */
export const REVIEW_GIVE_UP_MS = 6 * 60_000
const SLACK_MS = 10 * 60_000

/** The match that started within the game's length (plus slack) before it ended is the review of that game. */
export function isReviewOf(match: { startedAt: string }, endedAtMs: number, gameTimeSec: number | null): boolean {
  const started = Date.parse(match.startedAt)
  if (!Number.isFinite(started) || started > endedAtMs) return false
  return endedAtMs - started <= (gameTimeSec ?? 0) * 1000 + SLACK_MS
}

export function reviewWaitState({ found, endedAt, nowMs }: { found: boolean; endedAt: number; nowMs: number }): 'looking' | 'found' | 'gave-up' {
  if (found) return 'found'
  return nowMs - endedAt > REVIEW_GIVE_UP_MS ? 'gave-up' : 'looking'
}
