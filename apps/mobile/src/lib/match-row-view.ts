import { queueLabel, relativeTimeShort, type MatchSummary } from '@lpp/shared'

/** The right-hand column of a match row (op.gg-style, owner 2026-10-27): queue name and time ago. The K/P line went on 2026-10-30 (one number under the KDA: CS/min). */
export function rowMeta(s: MatchSummary, nowMs: number): { queue: string; when: string } {
  return { queue: queueLabel(s.queueId), when: relativeTimeShort(s.startedAt, nowMs) }
}

/** Under "Recent Games" while no listed ranked game carries an LP value yet: the column is empty by design, not broken. */
export function lpHint(s: { lpCount: number; rankedListed: boolean }): string | null {
  if (s.lpCount > 0 || !s.rankedListed) return null
  return 'LP per game starts with your next ranked game played with LanePulse open.'
}
