/**
 * One-line, template-based sentences (spec 2.3). Always the concrete number
 * and its reference ("for your opponent" or "the N target for your role").
 * Never tactical advice, never a win probability.
 */
import type { AreaKey, PhaseKey } from './targets'

export type SentenceSubrow = {
  key: string
  score: number | null
  display: string
  targetDisplay: string | null
  opponentDisplay: string | null
}

const PHASE_TEXT: Record<PhaseKey, { name: string; range: string }> = {
  lane: { name: 'lane phase', range: '0–14 min' },
  mid: { name: 'mid game', range: '14–25 min' },
  late: { name: 'late game', range: '25+ min' },
}

const AREA_LABEL: Record<AreaKey, string> = { farming: 'Farming', combat: 'Combat', vision: 'Vision', lane: 'Lane' }

export const STRONG_FROM = 60

/** The score's reference is always the role target; the opponent is added as context when known. */
function reference(row: SentenceSubrow, kind: 'target' | 'max'): string {
  const base = `the ${row.targetDisplay ?? '—'} ${kind} for your role`
  return row.opponentDisplay !== null ? `${base}, opponent ${row.opponentDisplay}` : base
}

/** Lane rows cite one number (me − opponent); the adjective must agree with its sign, not with the mean score. */
const cited = (row: SentenceSubrow) => !row.display.startsWith('-') && !row.display.startsWith('−')

/** Sentence for an area, from its weakest scored subrow. Empty when nothing was scored. */
export function areaSentence(area: AreaKey, weakest: SentenceSubrow | null): string {
  if (!weakest || weakest.score === null) return ''
  const strong = weakest.score >= STRONG_FROM
  const v = weakest.display
  switch (weakest.key) {
    case 'total':
      return strong ? `Solid farming: ${v} CS/min vs ${reference(weakest, 'target')}.` : `Low farming: ${v} CS/min vs ${reference(weakest, 'target')}.`
    case 'lane':
    case 'mid':
    case 'late': {
      const p = PHASE_TEXT[weakest.key]
      return strong
        ? `Strong ${p.name}: ${v} CS/min vs ${reference(weakest, 'target')} (${p.range}).`
        : `Slow ${p.name}: ${v} CS/min vs ${reference(weakest, 'target')} (${p.range}).`
    }
    case 'kp':
      return strong ? `Strong kill participation: ${v} vs ${reference(weakest, 'target')}.` : `Low kill participation: ${v} vs ${reference(weakest, 'target')}.`
    case 'deaths':
      return strong ? `Few deaths: ${v} per 10 min vs ${reference(weakest, 'max')}.` : `Too many deaths: ${v} per 10 min vs ${reference(weakest, 'max')}.`
    case 'visionPerMin':
      return strong ? `Good vision: ${v} vision score/min vs ${reference(weakest, 'target')}.` : `Low vision: ${v} vision score/min vs ${reference(weakest, 'target')}.`
    case 'wardsPerMin':
      return strong ? `Good warding: ${v} wards/min vs ${reference(weakest, 'target')}.` : `Few wards: ${v} wards/min vs ${reference(weakest, 'target')}.`
    case 'cs':
      return cited(weakest) ? `Ahead in lane: ${v} vs your opponent.` : `Behind in lane: ${v} vs your opponent.`
    case 'gold':
      return cited(weakest) ? `Gold lead: ${v} vs your opponent.` : `Gold deficit: ${v} vs your opponent.`
    case 'xp':
      return cited(weakest) ? `XP lead: ${v} vs your opponent.` : `XP deficit: ${v} vs your opponent.`
    default:
      return ''
  }
}

export function headline(areas: Array<{ key: AreaKey; score: number | null }>): string {
  const scored = areas.filter((a): a is { key: AreaKey; score: number } => a.score !== null)
  if (scored.length === 0) return ''
  const weakest = scored.reduce((m, a) => (a.score < m.score ? a : m))
  return weakest.score < STRONG_FROM ? `What holds you back most: ${AREA_LABEL[weakest.key]}` : 'Solid all around'
}
