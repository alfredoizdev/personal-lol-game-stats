import { describe, it, expect } from 'vitest'
import type { MatchSummary, PlayerLine } from '../src/match-v5'
import type { StoredGoal } from '../src/prematch/goal'
import { goalProgress, GOAL_PROGRESS_WEEKS } from '../src/performance/goal-progress'
import { game } from './analysis-fixtures'

const NOW = Date.UTC(2026, 9, 29, 20) // Thu 2026-10-29 20:00Z
const DAY = 86_400_000
let n = 0
function g(daysAgo: number, me: Partial<PlayerLine>, extra: Partial<MatchSummary> = {}): MatchSummary {
  n += 1
  return game({ role: 'MIDDLE', ...me }, { matchId: `p${n}`, startedAt: new Date(NOW - daysAgo * DAY).toISOString(), ...extra })
}
const goal = (over: Partial<StoredGoal> = {}): StoredGoal => ({ puuid: 'me', championId: 0, role: 'ANY', metric: 'csPerMin', target: 6.0, setAt: '2026-09-01T00:00:00Z', ...over })

describe('goalProgress (owner, 2026-10-29: your goal week by week, a personal trainer that measures what it set)', () => {
  it('averages the goal metric per week in the goal role, counts games that met the current target, and reads the trend from the oldest to the newest week', () => {
    const all = [
      g(16, { csPerMin: 5.0 }), g(15, { csPerMin: 5.2 }), // 3rd week back
      g(9, { csPerMin: 5.4 }), g(8, { csPerMin: 6.2 }), // last week
      g(2, { csPerMin: 6.4 }), g(1, { csPerMin: 5.8 }), g(0.5, { csPerMin: 6.1 }), // this week
    ]
    const p = goalProgress(all, [goal()], 'me', NOW)!
    expect(p).toMatchObject({ metric: 'csPerMin', label: 'CS / min', target: 6.0, role: 'MIDDLE', decimals: 1, lowerIsBetter: false })
    expect(p.weeks).toHaveLength(GOAL_PROGRESS_WEEKS)
    expect(p.weeks[0]).toEqual({ weeksAgo: 0, games: 3, avg: 6.1, met: 2 })
    expect(p.weeks[1]).toEqual({ weeksAgo: 1, games: 2, avg: 5.8, met: 1 })
    expect(p.weeks[2]).toEqual({ weeksAgo: 2, games: 2, avg: 5.1, met: 0 })
    expect(p.weeks[3]).toEqual({ weeksAgo: 3, games: 0, avg: null, met: 0 })
    expect(p.first).toEqual({ weeksAgo: 2, avg: 5.1 })
    expect(p.last).toEqual({ weeksAgo: 0, avg: 6.1 })
    expect(p.trend).toBe('up')
  })
  it('a lower-is-better goal: met when at or under the target, trend up when the number went down', () => {
    // 30-minute games: deaths per 10 = deaths / 3
    const all = [g(8, { deaths: 9 }), g(1, { deaths: 3 }), g(0.5, { deaths: 6 })]
    const p = goalProgress(all, [goal({ metric: 'deathsPer10', target: 1.5 })], 'me', NOW)!
    expect(p.weeks[0]).toEqual({ weeksAgo: 0, games: 2, avg: 1.5, met: 1 })
    expect(p.weeks[1]).toEqual({ weeksAgo: 1, games: 1, avg: 3.0, met: 0 })
    expect(p.trend).toBe('up')
  })
  it('ignores remakes, games older than the window and the roles you played less', () => {
    const all = [g(1, { csPerMin: 9.0, role: 'TOP' }), g(1, { csPerMin: 9.0 }, { remake: true }), g(GOAL_PROGRESS_WEEKS * 7 + 1, { csPerMin: 9.0 }), g(2, { csPerMin: 6.0 }), g(9, { csPerMin: 5.0 })]
    const p = goalProgress(all, [goal()], 'me', NOW)!
    expect(p.weeks[0]).toEqual({ weeksAgo: 0, games: 1, avg: 6.0, met: 1 })
    expect(p.weeks.reduce((s, w) => s + w.games, 0)).toBe(2)
  })
  it('follows the role you played most inside the window, not the one you played most over all 100 games', () => {
    const old = Array.from({ length: 10 }, (_, i) => g(GOAL_PROGRESS_WEEKS * 7 + 1 + i, { csPerMin: 9.0, role: 'UTILITY' }))
    const recent = [g(1, { csPerMin: 7.0, role: 'BOTTOM' }), g(2, { csPerMin: 7.0, role: 'BOTTOM' }), g(9, { csPerMin: 5.0, role: 'BOTTOM' }), g(10, { csPerMin: 5.0 })]
    const p = goalProgress([...old, ...recent], [goal()], 'me', NOW)!
    expect(p.role).toBe('BOTTOM')
    expect(p.weeks[0]).toEqual({ weeksAgo: 0, games: 2, avg: 7.0, met: 2 })
    expect(p.weeks[1]).toEqual({ weeksAgo: 1, games: 1, avg: 5.0, met: 0 })
  })
  it('is null without games in the window, or with games in fewer than two weeks (nothing to compare yet)', () => {
    expect(goalProgress([g(GOAL_PROGRESS_WEEKS * 7 + 1, { csPerMin: 6.0 })], [goal()], 'me', NOW)).toBeNull()
    expect(goalProgress([g(1, { csPerMin: 6.0 }), g(2, { csPerMin: 6.0 })], [goal()], 'me', NOW)).toBeNull()
    expect(goalProgress([g(1, { csPerMin: 6.0 }), g(8, { csPerMin: 6.0 })], [goal()], 'me', NOW)).not.toBeNull()
  })
  it('without any saved goal it follows the role\'s recommended metric and target, as the goal editor does', () => {
    const p = goalProgress([g(1, { visionScore: 36, role: 'UTILITY' }), g(8, { visionScore: 30, role: 'UTILITY' })], [], 'me', NOW)!
    expect(p).toMatchObject({ metric: 'visionPerMin', targetSource: 'recommended' })
    expect(p.target).toBeGreaterThan(0)
  })
  it('a standing goal with no number uses the recommended target for the role', () => {
    const p = goalProgress([g(1, { csPerMin: 6.0 }), g(8, { csPerMin: 6.0 })], [goal({ target: null })], 'me', NOW)!
    expect(p.target).toBeGreaterThan(0)
    expect(p.targetSource).toBe('recommended')
  })
})
