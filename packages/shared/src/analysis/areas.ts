/**
 * analyzeMatch: four scored, explained areas (spec 2.1–2.3, 6.1, 6.4, 6.5).
 * Scores come only from ROLE_TARGETS; deltas vs the opponent and vs your own
 * baseline are context. Pure: no I/O, no React.
 */
import type { MatchSummary, Role } from '../match-v5'
import type { Baseline } from './baseline'
import { BASELINE_MIN_GAMES } from './baseline'
import { rating, scoreDiff, scoreRatio, weightedMean, type Rating } from './score'
import { areaSentence, headline, type SentenceSubrow } from './sentences'
import { ANALYZABLE_QUEUES, AREA_WEIGHTS, DIFF_CURVES, PHASES, ROLE_TARGETS, SUBROW_WEIGHTS, type AreaKey } from './targets'
import { laneDiffAt, phaseCs, type TimelineSeries } from './timeline-series'
import { metricsOf, type Metrics } from './metrics'

export { metricsOf, type Metrics }

export type Delta = { vsOpponent: number | null; vsYou: number | null }

export type Subrow = {
  key: string
  label: string
  value: number | null
  display: string
  target: number | null
  score: number | null
  weight: number
  delta: Delta
  /** true = shown for context, never scored and never the sentence's subject. */
  context: boolean
}

export type AreaResult = {
  key: AreaKey
  label: string
  score: number | null
  rating: Rating | null
  weight: number
  subrows: Subrow[]
  sentence: string
  hiddenReason: string | null
}

export type MatchAnalysis =
  | { analyzable: false; reason: string }
  | {
      analyzable: true
      overall: number | null
      overallRating: Rating | null
      headline: string
      areas: AreaResult[]
      weakest: AreaKey | null
      baselineN: number
      timelineMissing: boolean
    }

export type AnalysisInput = { summary: MatchSummary; series: TimelineSeries | null; baseline: Baseline | null }

const AREA_LABEL: Record<AreaKey, string> = { farming: 'Farming', combat: 'Combat', vision: 'Vision', lane: 'Lane' }

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d
const fmt = (n: number | null, d: number) => (n === null ? '—' : n.toFixed(d))
const signed = (n: number) => (n < 0 ? `−${Math.abs(Math.round(n))}` : `+${Math.round(n)}`)
const diff = (a: number | null, b: number | null, d = 2) => (a === null || b === null ? null : round(a - b, d))

export function analyzeMatch(input: AnalysisInput): MatchAnalysis {
  const { summary, series } = input
  if (!ANALYZABLE_QUEUES.has(summary.queueId)) return { analyzable: false, reason: "Analysis is only available for Summoner's Rift games." }
  if (summary.remake) return { analyzable: false, reason: 'Remakes are not analyzed.' }
  const role = summary.me.role
  if (!role) return { analyzable: false, reason: 'No role detected for this game.' }

  const baseline = input.baseline && input.baseline.n >= BASELINE_MIN_GAMES ? input.baseline : null
  const ctx: Ctx = { summary, series, baseline, role, me: metricsOf(summary.me, summary.durationSec, summary.teamKills), opp: summary.opponent ? metricsOf(summary.opponent, summary.durationSec, 0) : null }

  const weights = AREA_WEIGHTS[role]
  const order = Object.keys(weights) as AreaKey[]
  const builders: Record<AreaKey, (c: Ctx, w: number) => AreaResult> = { farming: farmingArea, combat: combatArea, vision: visionArea, lane: laneArea }
  const areas = order.map((k) => builders[k](ctx, weights[k] ?? 0))
  if (!order.includes('farming')) areas.push(farmingArea(ctx, 0))

  const overall = weightedMean(areas.map((a) => ({ score: a.score, weight: a.weight })))
  const scored = areas.filter((a) => a.score !== null)
  const weakest = scored.length ? scored.reduce((m, a) => (a.score! < m.score! ? a : m)).key : null
  return {
    analyzable: true,
    overall,
    overallRating: overall === null ? null : rating(overall),
    headline: headline(areas),
    areas,
    weakest,
    baselineN: input.baseline?.n ?? 0,
    timelineMissing: series === null,
  }
}

type Ctx = { summary: MatchSummary; series: TimelineSeries | null; baseline: Baseline | null; role: Role; me: Metrics; opp: Metrics | null }

function finish(key: AreaKey, weight: number, subrows: Subrow[], hiddenReason: string | null = null): AreaResult {
  const score = hiddenReason ? null : weightedMean(subrows.filter((r) => !r.context).map((r) => ({ score: r.score, weight: r.weight })))
  const scoredRows = subrows.filter((r) => !r.context && r.score !== null)
  const weakestRow = scoredRows.length ? scoredRows.reduce((m, r) => (r.score! < m.score! ? r : m)) : null
  return {
    key,
    label: AREA_LABEL[key],
    score,
    rating: score === null ? null : rating(score),
    weight,
    subrows,
    sentence: score === null ? '' : areaSentence(key, weakestRow ? toSentenceRow(weakestRow) : null),
    hiddenReason: hiddenReason ?? (score === null ? 'Nothing to score in this game.' : null),
  }
}

/** Opponent/target displays travel with the subrow so the sentence can cite them. */
const sentenceInfo = new WeakMap<Subrow, { sentenceDisplay: string | null; targetDisplay: string | null; opponentDisplay: string | null }>()
function toSentenceRow(r: Subrow): SentenceSubrow {
  const info = sentenceInfo.get(r) ?? { sentenceDisplay: null, targetDisplay: null, opponentDisplay: null }
  return { key: r.key, score: r.score, display: info.sentenceDisplay ?? r.display, targetDisplay: info.targetDisplay, opponentDisplay: info.opponentDisplay }
}

function row(
  p: { key: string; label: string; value: number | null; decimals: number; suffix?: string; target: number | null; mode: 'higher' | 'lower'; weight: number; opponent: number | null; you: number | null; context?: boolean; score?: number | null; display?: string; sentenceDisplay?: string },
): Subrow {
  const score = p.context ? null : p.score !== undefined ? p.score : scoreRatio(p.value, p.target, p.mode)
  const r: Subrow = {
    key: p.key,
    label: p.label,
    value: p.value === null ? null : round(p.value, p.decimals),
    display: p.display ?? `${fmt(p.value, p.decimals)}${p.suffix ?? ''}`,
    target: p.target,
    score,
    weight: p.weight,
    delta: { vsOpponent: diff(p.value, p.opponent, Math.max(1, p.decimals)), vsYou: diff(p.value, p.you, Math.max(1, p.decimals)) },
    context: p.context ?? false,
  }
  sentenceInfo.set(r, {
    sentenceDisplay: p.sentenceDisplay ?? null,
    targetDisplay: p.target === null ? null : `${fmt(p.target, p.decimals)}${p.suffix ?? ''}`,
    opponentDisplay: p.opponent === null ? null : `${fmt(p.opponent, p.decimals)}${p.suffix ?? ''}`,
  })
  return r
}

function farmingArea(c: Ctx, weight: number): AreaResult {
  const t = ROLE_TARGETS[c.role]
  if (t.csPerMin === null) return finish('farming', weight, [], 'Farming is not scored for supports.')
  const w = SUBROW_WEIGHTS.farming
  const rows: Subrow[] = [
    row({ key: 'total', label: 'CS / min', value: c.me.csPerMin, decimals: 1, target: t.csPerMin, mode: 'higher', weight: c.series ? w.total : 100, opponent: c.opp?.csPerMin ?? null, you: c.baseline?.csPerMin ?? null }),
  ]
  if (c.series) {
    const me = c.summary.me.participantId
    const opp = c.summary.opponent?.participantId ?? null
    for (const p of PHASES) {
      const v = phaseCs(c.series, me, p.key, c.summary.durationSec)
      const o = opp === null ? null : phaseCs(c.series, opp, p.key, c.summary.durationSec)
      rows.push(row({ key: p.key, label: `${p.label} CS/min`, value: v, decimals: 1, target: t.csPerMin, mode: 'higher', weight: w[p.key], opponent: o, you: null }))
    }
  }
  return finish('farming', weight, rows)
}

function combatArea(c: Ctx, weight: number): AreaResult {
  const t = ROLE_TARGETS[c.role]
  const w = SUBROW_WEIGHTS.combat
  const me = c.summary.me
  const rows: Subrow[] = [
    row({ key: 'kp', label: 'Kill participation', value: c.me.kpPct, decimals: 0, suffix: '%', target: t.kpPct, mode: 'higher', weight: w.kp, opponent: null, you: c.baseline?.kpPct ?? null }),
    row({ key: 'deaths', label: 'Deaths per 10 min', value: c.me.deathsPer10, decimals: 1, target: t.deathsPer10Max, mode: 'lower', weight: w.deaths, opponent: c.opp?.deathsPer10 ?? null, you: c.baseline?.deathsPer10 ?? null }),
    row({ key: 'kda', label: 'KDA', value: null, decimals: 0, target: null, mode: 'higher', weight: 0, opponent: null, you: null, context: true, display: `${me.kills}/${me.deaths}/${me.assists}` }),
    row({ key: 'damagePerMin', label: 'Damage to champs / min', value: c.me.damagePerMin, decimals: 0, target: null, mode: 'higher', weight: 0, opponent: c.opp?.damagePerMin ?? null, you: null, context: true }),
  ]
  return finish('combat', weight, rows)
}

function visionArea(c: Ctx, weight: number): AreaResult {
  const t = ROLE_TARGETS[c.role]
  const w = SUBROW_WEIGHTS.vision
  const rows: Subrow[] = [
    row({ key: 'visionPerMin', label: 'Vision score / min', value: c.me.visionPerMin, decimals: 2, target: t.visionPerMin, mode: 'higher', weight: w.visionPerMin, opponent: c.opp?.visionPerMin ?? null, you: c.baseline?.visionPerMin ?? null }),
    row({ key: 'wardsPerMin', label: 'Wards placed / min', value: c.me.wardsPerMin, decimals: 2, target: t.wardsPerMin, mode: 'higher', weight: w.wardsPerMin, opponent: c.opp?.wardsPerMin ?? null, you: c.baseline?.wardsPerMin ?? null }),
    row({ key: 'wardsKilled', label: 'Wards destroyed', value: c.summary.me.wardsKilled, decimals: 0, target: null, mode: 'higher', weight: 0, opponent: c.summary.opponent?.wardsKilled ?? null, you: null, context: true }),
  ]
  return finish('vision', weight, rows)
}

function laneArea(c: Ctx, weight: number): AreaResult {
  const opp = c.summary.opponent
  if (!opp) return finish('lane', weight, [], 'No lane opponent in this game.')
  if (!c.series) return finish('lane', weight, [], 'Timeline not available yet.')
  const metrics: Array<'cs' | 'gold' | 'xp'> = c.role === 'UTILITY' ? ['gold', 'xp'] : ['cs', 'gold', 'xp']
  const labels = { cs: 'CS lead', gold: 'Gold lead', xp: 'XP lead' }
  const rows: Subrow[] = []
  for (const m of metrics) {
    const at10 = laneDiffAt(c.series, c.summary.me.participantId, opp.participantId, 10, m)
    const at15 = laneDiffAt(c.series, c.summary.me.participantId, opp.participantId, 15, m)
    const scores = [scoreDiff(at10, DIFF_CURVES[m]), scoreDiff(at15, DIFF_CURVES[m])].filter((s): s is number => s !== null)
    const score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    const value = at15 ?? at10
    const display = [at10 === null ? null : `${signed(at10)} @10`, at15 === null ? null : `${signed(at15)} @15`].filter(Boolean).join(' · ') || '—'
    const unitWord = { cs: 'CS', gold: 'gold', xp: 'XP' }[m]
    const sentenceDisplay = value === null ? '—' : `${signed(value)} ${unitWord} at ${at15 === null ? 10 : 15} min`
    rows.push(row({ key: m, label: labels[m], value, decimals: 0, target: null, mode: 'higher', weight: Math.round(100 / metrics.length), opponent: null, you: null, score, display: value === null ? '—' : display, sentenceDisplay }))
  }
  if (rows.every((r) => r.score === null)) return finish('lane', weight, rows, 'Game too short for lane comparisons.')
  return finish('lane', weight, rows)
}
