/** Per-game rates derived from a PlayerLine (shared by the areas and the baseline, cycle-free). */
import type { PlayerLine } from '../match-v5'

const MIN_SEC_FOR_RATE = 60
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d

export type Metrics = {
  csPerMin: number | null
  kpPct: number | null
  deathsPer10: number | null
  visionPerMin: number | null
  wardsPerMin: number | null
  damagePerMin: number | null
}

export function metricsOf(line: PlayerLine, durationSec: number, teamKills: number): Metrics {
  const minutes = durationSec / 60
  const ok = durationSec >= MIN_SEC_FOR_RATE
  return {
    csPerMin: line.csPerMin,
    kpPct: teamKills > 0 ? Math.round(((line.kills + line.assists) / teamKills) * 100) : null,
    deathsPer10: ok ? round(line.deaths / (durationSec / 600), 2) : null,
    visionPerMin: ok ? round(line.visionScore / minutes, 2) : null,
    wardsPerMin: ok ? round(line.wardsPlaced / minutes, 2) : null,
    damagePerMin: ok ? Math.round(line.damageToChampions / minutes) : null,
  }
}
