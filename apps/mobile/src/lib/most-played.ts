import type { MatchSummary } from '@lpp/shared'

/** "Most played · Vel'Koz 13 games · Kindred 3 games": the two champions you played most among the listed games (remakes out). */
export function mostPlayedLine(summaries: MatchSummary[]): string | null {
  const count = new Map<string, number>()
  for (const s of summaries) if (!s.remake) count.set(s.me.championName, (count.get(s.me.championName) ?? 0) + 1)
  const top = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2)
  if (top.length === 0) return null
  return `Most played · ${top.map(([name, n]) => `${name} ${n} game${n === 1 ? '' : 's'}`).join(' · ')}`
}
