import { DIFF_CURVES, scoreDiff, scoreRatio, type Rating } from '@lpp/shared'

/** Data behind the "How it's scored" charts, sampled from the real scoring functions so the picture can never drift from the code. */

export type CurvePoint = { x: number; y: number }

export function ratioCurvePoints(): CurvePoint[] {
  const pts: CurvePoint[] = []
  for (let i = 30; i <= 150; i += 5) {
    const x = i / 100
    pts.push({ x, y: scoreRatio(x, 1, 'higher') ?? 0 })
  }
  return pts
}

export function diffCurvePoints(metric: 'cs' | 'gold' | 'xp'): CurvePoint[] {
  const c = DIFF_CURVES[metric]
  const span = c.ceil - c.floor
  const from = c.floor - span * 0.25
  const to = c.ceil + span * 0.25
  const step = span / 20
  const pts: CurvePoint[] = []
  for (let x = from; x <= to + 1e-9; x += step) {
    const xr = Math.round(x * 100) / 100
    pts.push({ x: xr, y: scoreDiff(xr, c) ?? 0 })
  }
  for (const x of [c.floor, c.mid, c.ceil]) if (!pts.some((p) => p.x === x)) pts.push({ x, y: scoreDiff(x, c) ?? 0 })
  return pts.sort((a, b) => a.x - b.x)
}

export function ratingBands(): Array<{ rating: Rating; from: number; to: number }> {
  return [
    { rating: 'Poor', from: 0, to: 40 },
    { rating: 'Fair', from: 40, to: 60 },
    { rating: 'Good', from: 60, to: 80 },
    { rating: 'Great', from: 80, to: 100 },
  ]
}
