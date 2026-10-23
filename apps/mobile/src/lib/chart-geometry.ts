import { PHASES, PHASE_MIN_SEC, type PhaseKey } from '@lpp/shared'

/** Pure helpers shared by the SVG charts. */

export function linearScale(domain: [number, number], range: [number, number]): (v: number) => number {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0
  return (v) => (span === 0 ? r0 : r0 + ((v - d0) / span) * (r1 - r0))
}

/** SVG path through the points; a null y lifts the pen so gaps stay gaps. */
export function linePath(points: Array<{ x: number; y: number | null }>): string {
  let d = ''
  let pen = false
  for (const p of points) {
    if (p.y === null) {
      pen = false
      continue
    }
    d += `${pen ? ' L' : d ? ' M' : 'M'}${Number(p.x.toFixed(1))} ${Number(p.y.toFixed(1))}`
    pen = true
  }
  return d
}

/** Smallest "clean" axis maximum (1, 2, 5… × 10ⁿ steps) covering the values, never below the floor. */
export function niceMax(values: number[], floor: number): number {
  const max = Math.max(floor, ...values.filter((v) => Number.isFinite(v)))
  if (max <= 0) return floor
  const magnitude = 10 ** Math.floor(Math.log10(max))
  return Math.ceil(max / magnitude) * magnitude
}

/** The phases that actually happened in a game of this length (2-minute minimum per phase). */
export function phaseBands(durationSec: number): Array<{ key: PhaseKey; startSec: number; endSec: number }> {
  return PHASES.filter((p) => durationSec >= p.startSec + PHASE_MIN_SEC).map((p) => ({
    key: p.key,
    startSec: p.startSec,
    endSec: Math.min(p.endSec ?? durationSec, durationSec),
  }))
}
