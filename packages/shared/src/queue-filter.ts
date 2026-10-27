/**
 * Ranked apart from normals (owner, 2026-10-27). A queue is ranked, normal or
 * other; Matches and Performance filter on it, and every match row carries the
 * short tag so "All" still tells you what you are looking at. Pure: no I/O.
 */
export type QueueGroup = 'ranked' | 'normal' | 'other'
export type QueueFilter = 'all' | 'ranked' | 'normal'

export const QUEUE_FILTERS: readonly QueueFilter[] = ['all', 'ranked', 'normal']
export const QUEUE_FILTER_LABEL: Record<QueueFilter, string> = { all: 'All', ranked: 'Ranked', normal: 'Normal' }

const RANKED: ReadonlySet<number> = new Set([420, 440])
/** Normal Draft, Normal Blind, Swiftplay, Quickplay. */
const NORMAL: ReadonlySet<number> = new Set([400, 430, 480, 490])

export function queueGroup(queueId: number): QueueGroup {
  if (RANKED.has(queueId)) return 'ranked'
  if (NORMAL.has(queueId)) return 'normal'
  return 'other'
}

export function inQueueFilter(queueId: number, filter: QueueFilter): boolean {
  return filter === 'all' || queueGroup(queueId) === filter
}

const TAG: Record<number, string> = { 420: 'Ranked', 440: 'Flex', 400: 'Normal', 430: 'Normal', 480: 'Swiftplay', 490: 'Quickplay', 450: 'ARAM', 700: 'Clash', 1700: 'Arena', 900: 'ARURF', 1900: 'URF' }

/** The short word on a match row. */
export function queueTag(queueId: number): string {
  return TAG[queueId] ?? 'Other'
}
