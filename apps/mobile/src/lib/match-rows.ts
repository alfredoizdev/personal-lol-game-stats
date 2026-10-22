import { summarizeMatch, type MatchSummary, type MatchV5, type PlayerIdentity } from '@lpp/shared'
import { riotErrorCode, type RiotErrorCode } from './riot-api'

export type DetailResult =
  | { status: 'pending' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; data: MatchV5 }

export type MatchRowState =
  | { matchId: string; status: 'loading' }
  | { matchId: string; status: 'error'; error: RiotErrorCode }
  | { matchId: string; status: 'not-participant' }
  | { matchId: string; status: 'ready'; summary: MatchSummary }

/**
 * Pure: ids + per-id query results → row states for the visible window.
 * NOT_FOUND rows are dropped (archived games). A summarizer throw on a
 * malformed blob becomes an UNKNOWN row instead of blanking the list.
 */
export function toRowStates(ids: string[], results: DetailResult[], identity: PlayerIdentity, shown: number): MatchRowState[] {
  const rows: MatchRowState[] = []
  for (let i = 0; i < Math.min(ids.length, shown); i++) {
    const matchId = ids[i]!
    const r = results[i]
    if (!r || r.status === 'pending') {
      rows.push({ matchId, status: 'loading' })
      continue
    }
    if (r.status === 'error') {
      const code = riotErrorCode(r.error)
      if (code === 'NOT_FOUND') continue
      rows.push({ matchId, status: 'error', error: code })
      continue
    }
    try {
      const summary = summarizeMatch(r.data, identity)
      rows.push(summary ? { matchId, status: 'ready', summary } : { matchId, status: 'not-participant' })
    } catch {
      rows.push({ matchId, status: 'error', error: 'UNKNOWN' })
    }
  }
  return rows
}
