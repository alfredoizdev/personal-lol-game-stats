import { describe, it, expect } from 'vitest'
import type { LiveSnapshotV2 } from '@lpp/shared'
import { appendTrendPoint, separatedEndLabels, type TrendPoint } from '../src/lib/live-trend'

function snap(gameTime: number, meCs: number | null, enemyCs: number | null = 0, ts = 1): LiveSnapshotV2 {
  const line = (cs: number | null) => ({ championName: 'X', position: 'MIDDLE' as const, level: 1, kills: 0, deaths: 0, assists: 0, cs, csPerMin: cs === null || gameTime < 60 ? null : Math.round((cs / (gameTime / 60)) * 10) / 10, wardScore: 0, items: [], isDead: null, respawnSec: null })
  return { v: 2, ts, isFinal: false, gameTimeSeconds: gameTime, gameMode: 'CLASSIC', queueId: 420, teamKills: 0, me: line(meCs), opponent: enemyCs === null ? null : line(enemyCs), focus: null, events: [] }
}

describe('appendTrendPoint', () => {
  it('adds one point per whole minute of game time', () => {
    let h: TrendPoint[] = []
    h = appendTrendPoint(h, snap(65, 10, 8))
    h = appendTrendPoint(h, snap(90, 15, 9))   // same minute → replaced, not appended
    h = appendTrendPoint(h, snap(125, 20, 18))
    expect(h.map((p) => p.minute)).toEqual([1, 2])
    expect(h[0]).toEqual({ minute: 1, me: 10, enemy: 6 })
    expect(h[1]).toEqual({ minute: 2, me: 9.6, enemy: 8.6 })
  })
  it('ignores snapshots under a minute and resets when game time goes backwards (new game)', () => {
    let h = appendTrendPoint([], snap(30, 5, 5))
    expect(h).toEqual([])
    h = appendTrendPoint(h, snap(600, 70, 60))
    h = appendTrendPoint(h, snap(70, 5, 5))
    expect(h.map((p) => p.minute)).toEqual([1])
  })
  it('records null for the enemy when there is no opponent', () => {
    const h = appendTrendPoint([], snap(120, 20, null))
    expect(h[0]).toEqual({ minute: 2, me: 10, enemy: null })
  })
  it('keeps at most 60 points', () => {
    let h: TrendPoint[] = []
    for (let m = 1; m <= 70; m++) h = appendTrendPoint(h, snap(m * 60, m * 7, m * 6))
    expect(h.length).toBe(60)
    expect(h[0]!.minute).toBe(11)
  })
})

describe('separatedEndLabels', () => {
  it('puts the higher line label above and the lower one below when far apart', () => {
    expect(separatedEndLabels(40, 100)).toEqual({ me: 34, enemy: 110 })
    expect(separatedEndLabels(100, 40)).toEqual({ me: 110, enemy: 34 })
  })
  it('pushes the labels apart when the lines end close together', () => {
    for (const [a, b] of [[60, 62], [62, 60], [60, 60]] as const) {
      const r = separatedEndLabels(a, b)
      expect(Math.abs(r.enemy - r.me)).toBeGreaterThanOrEqual(13)
    }
  })
  it('never lets the lower label sit above the upper one', () => {
    const r = separatedEndLabels(70, 66)
    expect(r.enemy).toBeLessThan(r.me)
  })
  it('handles a missing enemy line', () => {
    expect(separatedEndLabels(60, null)).toEqual({ me: 54, enemy: 0 })
  })
})
