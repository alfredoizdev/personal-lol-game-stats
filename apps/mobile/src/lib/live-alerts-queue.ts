import type { LiveAlert } from '@lpp/shared'

export type QueuedAlert = { alert: LiveAlert; at: number }

/** Cards visible at once; older ones make room. */
export const MAX_VISIBLE = 3
/** A card leaves by itself after this long (7 s: the owner wants the cards noticed, 2026-10-23). */
export const ALERT_TTL_MS = 7000

export function pushAlerts(queue: QueuedAlert[], alerts: LiveAlert[], nowMs: number): QueuedAlert[] {
  const ids = new Set(queue.map((q) => q.alert.id))
  const added = alerts.filter((a) => !ids.has(a.id)).map((alert) => ({ alert, at: nowMs }))
  return [...queue, ...added].slice(-MAX_VISIBLE)
}

export function expireAlerts(queue: QueuedAlert[], nowMs: number): QueuedAlert[] {
  return queue.filter((q) => nowMs - q.at <= ALERT_TTL_MS)
}

export function dismissAlert(queue: QueuedAlert[], id: string): QueuedAlert[] {
  return queue.filter((q) => q.alert.id !== id)
}
