/**
 * Your impact in the game you are playing (owner, 2026-10-28): one 0–100 arc,
 * green for what you bring and red for what you do not, made of four areas
 * scored against the SAME role targets and ratio curve as the match score
 * (analysis/score.ts), so the live number and the review agree afterwards.
 * Status only, never advice (Riot policy). Pure; built from a live snapshot.
 */
import type { Role } from './match-v5'
import type { LiveSnapshotV2 } from './live'
import type { LiveEvent } from './live-events'
import { rating, scoreRatio, type Rating } from './analysis/score'
import { ROLE_TARGETS } from './analysis/targets'

export type ImpactAreaKey = 'fights' | 'farm' | 'objectives' | 'vision'
export type ImpactArea = {
  key: ImpactAreaKey
  label: string
  /** The numbers behind it, in words: "55% KP · 1.0 deaths/10". */
  value: string
  score: number | null
  /** true at or above the role target (score ≥ 70), false below, null when not scored yet. */
  onTarget: boolean | null
}
export type LiveImpact = { score: number | null; rating: Rating | null; areas: ImpactArea[] }

/** Before this the numbers are noise (first back, first wave). */
export const IMPACT_MIN_SEC = 180
const ON_TARGET = 70
const OBJECTIVE_TYPES: ReadonlySet<LiveEvent['type']> = new Set(['DragonKill', 'HeraldKill', 'BaronKill', 'TurretKilled', 'InhibKilled'])
/** Share of the team's objectives you take part in that counts as on target. */
const OBJECTIVE_SHARE_TARGET: Record<Role, number> = { TOP: 50, JUNGLE: 80, MIDDLE: 50, BOTTOM: 50, UTILITY: 60 }
const LANER_WEIGHTS: Record<ImpactAreaKey, number> = { farm: 35, fights: 30, objectives: 20, vision: 15 }
const SUPPORT_WEIGHTS: Record<ImpactAreaKey, number> = { farm: 0, fights: 35, objectives: 30, vision: 35 }
const EMPTY: LiveImpact = { score: null, rating: null, areas: [] }

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)
const onTarget = (score: number | null) => (score === null ? null : score >= ON_TARGET)

export function liveImpact(s: LiveSnapshotV2): LiveImpact {
  const t = s.gameTimeSeconds
  if (t === null || t < IMPACT_MIN_SEC) return EMPTY
  const me = s.me
  const role: Role = me.position ?? 'MIDDLE'
  const targets = ROLE_TARGETS[role]
  const minutes = t / 60
  const areas: ImpactArea[] = []

  // Fights: kill participation (needs team kills) and deaths per 10 minutes.
  const kp = s.teamKills && s.teamKills > 0 && me.kills !== null && me.assists !== null ? Math.round(((me.kills + me.assists) / s.teamKills) * 100) : null
  const deathsPer10 = me.deaths === null ? null : me.deaths / (t / 600)
  const fightScores = [scoreRatio(kp, targets.kpPct, 'higher'), scoreRatio(deathsPer10, targets.deathsPer10Max, 'lower')].filter((v): v is number => v !== null)
  const fights = mean(fightScores)
  const fightParts = [kp === null ? null : `${kp}% KP`, deathsPer10 === null ? null : `${deathsPer10.toFixed(1)} deaths/10`].filter((v): v is string => v !== null)
  areas.push({ key: 'fights', label: 'Fights', value: fightParts.join(' · ') || '—', score: fights, onTarget: onTarget(fights) })

  // Farm: CS/min against the role target (support has none).
  if (targets.csPerMin !== null) {
    const farm = scoreRatio(me.csPerMin, targets.csPerMin, 'higher')
    areas.push({ key: 'farm', label: 'Farm', value: me.csPerMin === null ? '—' : `${me.csPerMin.toFixed(1)} CS/min`, score: farm, onTarget: onTarget(farm) })
  }

  // Objectives: of your team's dragons, heralds, barons, turrets and inhibitors, how many you took part in.
  const team = s.events.filter((e) => OBJECTIVE_TYPES.has(e.type) && (e.actorIsMe || e.actorIsAlly === true))
  const mineCount = team.filter((e) => e.actorIsMe || e.assisters.includes(me.championName)).length
  const share = team.length ? Math.round((mineCount / team.length) * 100) : null
  const objectives = team.length ? scoreRatio(share, OBJECTIVE_SHARE_TARGET[role], 'higher') : null
  areas.push({ key: 'objectives', label: 'Objectives', value: team.length ? `${mineCount} of ${team.length}` : 'None yet', score: objectives, onTarget: onTarget(objectives) })

  // Vision: ward score per minute against the role target.
  const visionPerMin = me.wardScore === null ? null : me.wardScore / minutes
  const vision = scoreRatio(visionPerMin, targets.visionPerMin, 'higher')
  areas.push({ key: 'vision', label: 'Vision', value: visionPerMin === null ? '—' : `${visionPerMin.toFixed(2)} vision/min`, score: vision, onTarget: onTarget(vision) })

  const weights = role === 'UTILITY' ? SUPPORT_WEIGHTS : LANER_WEIGHTS
  let sum = 0
  let total = 0
  for (const a of areas) {
    if (a.score === null) continue
    sum += a.score * weights[a.key]
    total += weights[a.key]
  }
  const score = total ? Math.round(sum / total) : null
  return { score, rating: score === null ? null : rating(score), areas }
}
