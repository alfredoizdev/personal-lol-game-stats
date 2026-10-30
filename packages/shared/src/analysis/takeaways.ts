/**
 * The Match Review's three lines (owner, 2026-10-30, "one question per screen"):
 * your best scored number, your worst, and the goal verdict. Each carries the
 * comparison the engine already computed — the lane opponent first, else your
 * own average, else the role target — so no table is needed.
 */
import type { MatchAnalysis, Subrow } from './areas'

export type Takeaway = { kind: 'best' | 'worst' | 'goal'; label: string; value: string; compare: string | null; tone: 'good' | 'bad' | 'plain' }

function compareOf(r: Subrow): string | null {
  if (r.opponentDisplay !== null) return `vs rival ${r.opponentDisplay}`
  if (r.youDisplay !== null) return `vs you ${r.youDisplay}`
  if (r.targetDisplay !== null) return `target ${r.targetDisplay}`
  return null
}

export function takeaways(analysis: MatchAnalysis, goal: { text: string; met: boolean | null } | null): Takeaway[] {
  if (!analysis.analyzable) return []
  const scored = analysis.areas.flatMap((a) => a.subrows).filter((r): r is Subrow & { score: number } => !r.context && r.score !== null)
  const out: Takeaway[] = []
  if (scored.length) {
    const best = scored.reduce((m, r) => (r.score > m.score ? r : m))
    out.push({ kind: 'best', label: best.label, value: best.display, compare: compareOf(best), tone: 'good' })
    if (scored.length > 1) {
      const worst = scored.reduce((m, r) => (r.score < m.score ? r : m))
      out.push({ kind: 'worst', label: worst.label, value: worst.display, compare: compareOf(worst), tone: 'bad' })
    }
  }
  if (goal) out.push({ kind: 'goal', label: 'Your goal', value: goal.text, compare: null, tone: goal.met === null ? 'plain' : goal.met ? 'good' : 'bad' })
  return out
}
