import { describe, it, expect } from 'vitest'
import { goalLine } from '../src/lib/goal-line'

describe('goalLine', () => {
  it('states the goal, what you did and whether it was met', () => {
    expect(goalLine({ metric: 'csPerMin', target: 7 }, 6.2)).toEqual({ text: 'Your goal: 7.0 CS/min → you did 6.2 (missed)', met: false })
    expect(goalLine({ metric: 'csPerMin', target: 7 }, 7.4)).toEqual({ text: 'Your goal: 7.0 CS/min → you did 7.4 (met)', met: true })
    expect(goalLine({ metric: 'deathsPer10', target: 1.5 }, 1.2)).toEqual({ text: 'Your goal: ≤ 1.5 deaths per 10 min → you did 1.2 (met)', met: true })
    expect(goalLine({ metric: 'kpPct', target: 55 }, 48)).toEqual({ text: 'Your goal: 55% kill participation → you did 48% (missed)', met: false })
  })
  it('says so when the metric could not be measured', () => {
    expect(goalLine({ metric: 'kpPct', target: 55 }, null)).toEqual({ text: 'Your goal: 55% kill participation → not measurable this game', met: null })
  })
})
