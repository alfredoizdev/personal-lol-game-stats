import { describe, it, expect } from 'vitest'
import type { Goal } from '../src/prematch/goal'
import type { LiveSnapshotV2 } from '../src/live'
import {
  PUSH_MIN_GAME_SEC,
  PUSH_MIN_GAP_SEC,
  PUSH_INTERVAL_SEC,
  initialNotifierState,
  nextNotification,
  statusBody,
  finalBody,
  type NotifierState,
  type GoalPushMode,
} from '../src/notify/goal-notifier'

const csGoal: Goal = { puuid: 'p', championId: 157, role: 'MIDDLE', metric: 'csPerMin', target: 7, setAt: '2026-10-20T00:00:00Z' }
const kpGoal: Goal = { ...csGoal, metric: 'kpPct', target: 55 }

function snap(gameTimeSeconds: number | null, over: Partial<LiveSnapshotV2['me']> = {}, teamKills: number | null = 5): LiveSnapshotV2 {
  return {
    v: 2, ts: 1, isFinal: false, gameTimeSeconds, gameMode: 'CLASSIC', queueId: 420, teamKills,
    me: { championName: 'Yasuo', position: 'MIDDLE', level: 5, kills: 1, deaths: 0, assists: 1, cs: 50, csPerMin: 7.5, wardScore: 2, items: [], ...over },
    opponent: null, focus: null,
  }
}

/** Runs the snapshots through the engine in order and returns what was due at each step. */
function run(mode: GoalPushMode, goal: Goal, snaps: Array<{ s: LiveSnapshotV2; ended?: boolean }>, start: NotifierState = initialNotifierState) {
  let state = start
  const out: Array<{ sec: number | null; due: ReturnType<typeof nextNotification>['due'] }> = []
  for (const { s, ended = false } of snaps) {
    const r = nextNotification(state, { goal, snapshot: s, mode, ended })
    state = r.state
    out.push({ sec: s.gameTimeSeconds, due: r.due })
  }
  return { out, state, sent: out.filter((o) => o.due) }
}

describe('constants', () => {
  it('match the spec', () => {
    expect(PUSH_MIN_GAME_SEC).toBe(60)
    expect(PUSH_MIN_GAP_SEC).toBe(60)
    expect(PUSH_INTERVAL_SEC).toBe(300)
  })
})

describe('nextNotification · gates', () => {
  it('sends nothing before 60 s of game time or without game time', () => {
    const { sent } = run('change', csGoal, [{ s: snap(null) }, { s: snap(0) }, { s: snap(59) }])
    expect(sent).toEqual([])
  })
  it('sends nothing while the metric is unknown (KP with zero team kills) and starts once it is known', () => {
    const { out } = run('interval', kpGoal, [
      { s: snap(120, {}, 0) },
      { s: snap(300, {}, 0) },
      { s: snap(480, {}, 0) },
      { s: snap(500, { kills: 2, assists: 1 }, 4) },
    ])
    expect(out.slice(0, 3).every((o) => o.due === null)).toBe(true)
    expect(out[3]?.due?.body).toBe('08:20 · Goal 55% kill participation · On track, now 75%')
    expect(out.flatMap((o) => (o.due ? [o.due.body] : [])).join(' ')).not.toContain('—')
  })
})

describe('nextNotification · change mode', () => {
  it('sends the first known status, stays quiet while it holds and sends again when it flips', () => {
    const { out } = run('change', csGoal, [
      { s: snap(90, { csPerMin: 7.5 }) },
      { s: snap(200, { csPerMin: 7.6 }) },
      { s: snap(400, { csPerMin: 7.4 }) },
      { s: snap(600, { csPerMin: 6.1 }) },
      { s: snap(900, { csPerMin: 6.0 }) },
    ])
    expect(out.map((o) => o.due?.body ?? null)).toEqual([
      '01:30 · Goal 7.0 CS/min · On track, now 7.5',
      null,
      null,
      '10:00 · Goal 7.0 CS/min · Below goal, now 6.1',
      null,
    ])
    expect(out[0]?.due?.kind).toBe('status')
    expect(out[0]?.due?.title).toBe('LanePulse')
  })
  it('does not fire at 5:00 multiples without a change', () => {
    const { sent } = run('change', csGoal, [{ s: snap(90) }, { s: snap(300) }, { s: snap(600) }, { s: snap(900) }])
    expect(sent.length).toBe(1)
  })
})

describe('nextNotification · interval mode', () => {
  it('fires on the first status, at 5:00 and 10:00 without change, and on a flip in between', () => {
    const { out } = run('interval', csGoal, [
      { s: snap(70, { csPerMin: 7.5 }) },
      { s: snap(200, { csPerMin: 7.5 }) },
      { s: snap(301, { csPerMin: 7.5 }) },
      { s: snap(420, { csPerMin: 7.5 }) },
      { s: snap(450, { csPerMin: 6.5 }) },
      { s: snap(540, { csPerMin: 6.5 }) },
      { s: snap(601, { csPerMin: 6.5 }) },
      { s: snap(700, { csPerMin: 6.5 }) },
    ])
    expect(out.map((o) => o.due?.body ?? null)).toEqual([
      '01:10 · Goal 7.0 CS/min · On track, now 7.5',
      null,
      '05:01 · Goal 7.0 CS/min · On track, now 7.5',
      null,
      '07:30 · Goal 7.0 CS/min · Below goal, now 6.5',
      null,
      '10:01 · Goal 7.0 CS/min · Below goal, now 6.5',
      null,
    ])
  })
  it('never sends two status messages within 60 s: a flip right after an interval tick waits for the gap', () => {
    const { out } = run('interval', csGoal, [
      { s: snap(100, { csPerMin: 7.5 }) },
      { s: snap(300, { csPerMin: 7.5 }) }, // interval tick
      { s: snap(320, { csPerMin: 6.0 }) }, // flip 20 s later → held
      { s: snap(340, { csPerMin: 6.0 }) }, // still inside the gap
      { s: snap(361, { csPerMin: 6.0 }) }, // gap over → the flip goes out
    ])
    expect(out.map((o) => (o.due ? o.sec : null))).toEqual([100, 300, null, null, 361])
    const secs = out.filter((o) => o.due).map((o) => o.sec!)
    for (let i = 1; i < secs.length; i++) expect(secs[i]! - secs[i - 1]!).toBeGreaterThanOrEqual(PUSH_MIN_GAP_SEC)
  })
})

describe('nextNotification · game over', () => {
  it('sends one final message with met/missed and nothing after', () => {
    const { out } = run('change', csGoal, [
      { s: snap(90, { csPerMin: 7.5 }) },
      { s: snap(1500, { csPerMin: 7.3 }), ended: true },
      { s: snap(1500, { csPerMin: 7.3 }), ended: true },
    ])
    expect(out[1]?.due).toEqual({ title: 'LanePulse', body: 'Game over · Goal met · 7.3 CS/min', kind: 'final' })
    expect(out[2]?.due).toBeNull()
  })
  it('final says missed when below, and is not held back by the 60 s gap', () => {
    const { out } = run('change', csGoal, [
      { s: snap(1480, { csPerMin: 6.4 }) },
      { s: snap(1500, { csPerMin: 6.4 }), ended: true },
    ])
    expect(out[0]?.due?.kind).toBe('status')
    expect(out[1]?.due?.body).toBe('Game over · Goal missed · 6.4 CS/min')
  })
  it('a game that ends with an unknown metric sends no final', () => {
    const { out } = run('change', kpGoal, [{ s: snap(1500, {}, 0), ended: true }])
    expect(out[0]?.due).toBeNull()
  })
})

describe('copy', () => {
  it('statusBody and finalBody use the exact formats', () => {
    expect(statusBody(900, csGoal, 'below', 5.2)).toBe('15:00 · Goal 7.0 CS/min · Below goal, now 5.2')
    expect(statusBody(65, kpGoal, 'on_track', 60)).toBe('01:05 · Goal 55% kill participation · On track, now 60%')
    expect(finalBody(csGoal, true, 7.3)).toBe('Game over · Goal met · 7.3 CS/min')
    expect(finalBody(kpGoal, false, 40)).toBe('Game over · Goal missed · 40%')
  })
  it('never contains an instruction word', () => {
    const forbidden = /\b(should|try|need|needs|more|less|must|go|push|ward|farm)\b/i
    const goals: Goal[] = [csGoal, kpGoal, { ...csGoal, metric: 'deathsPer10', target: 1.5 }, { ...csGoal, metric: 'visionPerMin', target: 0.6 }]
    for (const g of goals) {
      for (const status of ['on_track', 'below'] as const) {
        expect(statusBody(600, g, status, 3.21)).not.toMatch(forbidden)
      }
      expect(finalBody(g, true, 3.21)).not.toMatch(forbidden)
      expect(finalBody(g, false, 3.21)).not.toMatch(forbidden)
    }
  })
})
