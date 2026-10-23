import { describe, it, expect } from 'vitest'
import { rowToGoal } from '../src/lib/goals'
import { matchKeys } from '../src/lib/match-keys'

describe('goals', () => {
  it('maps a table row to a Goal and rejects bad roles or metrics', () => {
    expect(rowToGoal({ puuid: 'p', champion_id: 222, role: 'BOTTOM', metric: 'csPerMin', target: '7.5', set_at: '2026-10-22T10:00:00+00:00' })).toEqual({
      puuid: 'p', championId: 222, role: 'BOTTOM', metric: 'csPerMin', target: 7.5, setAt: '2026-10-22T10:00:00+00:00',
    })
    expect(rowToGoal({ puuid: 'p', champion_id: 222, role: 'BOTTOM', metric: 'gold', target: 1, set_at: 'x' })).toBeNull()
    expect(rowToGoal({ puuid: 'p', champion_id: 222, role: 'ADC', metric: 'csPerMin', target: 1, set_at: 'x' })).toBeNull()
  })
  it('keys goals per account and champions per version', () => {
    expect(matchKeys.goals('p1')).toEqual(['goals', 'p1'])
    expect(matchKeys.champions('15.20.1')).toEqual(['champions', '15.20.1'])
    expect(matchKeys.ownIds('p1')).toEqual(['own-ids', 'p1'])
  })
})

describe('rowToGoal · standing goals', () => {
  it('accepts role ANY with champion 0 and a null target (recommended for the role)', () => {
    expect(rowToGoal({ puuid: 'p', champion_id: 0, role: 'ANY', metric: 'deathsPer10', target: null, set_at: 'x' })).toEqual({
      puuid: 'p', championId: 0, role: 'ANY', metric: 'deathsPer10', target: null, setAt: 'x',
    })
    expect(rowToGoal({ puuid: 'p', champion_id: 0, role: 'ANY', metric: 'csPerMin', target: '6.5', set_at: 'x' })?.target).toBe(6.5)
  })
})
