export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function kdaRatio(kills: number, deaths: number, assists: number): number {
  return (kills + assists) / Math.max(deaths, 1)
}

export function formatKda(kills: number, deaths: number, assists: number): string {
  if (deaths === 0) return 'Perfect'
  return `${kdaRatio(kills, deaths, assists).toFixed(1)} KDA`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "just now" / "5 min ago" / "2 hours ago" / "3 days ago" / "Oct 11" (beyond 7 days). */
export function relativeTime(iso: string, nowMs: number): string {
  const then = new Date(iso)
  const diff = Math.max(0, nowMs - then.getTime())
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.floor(hours / 24)
  if (days <= 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`
  return `${MONTHS[then.getUTCMonth()]} ${then.getUTCDate()}`
}

/** Compact relative time for tight stat cells: 'now', '12m ago', '10h ago', '3d ago', then 'Oct 21'. */
export function relativeTimeShort(iso: string, nowMs: number): string {
  const then = new Date(iso)
  const diff = Math.max(0, nowMs - then.getTime())
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m ago`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days <= 7) return `${days}d ago`
  return `${MONTHS[then.getUTCMonth()]} ${then.getUTCDate()}`
}
