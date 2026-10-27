import { queueLabel, relativeTimeShort, type MatchSummary } from '@lpp/shared'

/** The right-hand column of a match row (op.gg-style, owner 2026-10-27): queue name, time ago, and the K/P line under the KDA. */
export function rowMeta(s: MatchSummary, nowMs: number): { queue: string; when: string; kp: string | null } {
  const kp = s.teamKills > 0 ? Math.round(((s.me.kills + s.me.assists) / s.teamKills) * 100) : null
  return { queue: queueLabel(s.queueId), when: relativeTimeShort(s.startedAt, nowMs), kp: kp === null ? null : `K/P ${kp}%` }
}
