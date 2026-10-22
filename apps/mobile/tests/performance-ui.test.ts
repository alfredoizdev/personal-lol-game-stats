import { describe, it, expect } from 'vitest'
import { performanceProfile } from '@lpp/shared'
import { barHeight, gamesNote, periodLabel, recordLabel, roleRankNote, streakLabel, subrowLine } from '../src/lib/performance-ui'

const EMPTY = performanceProfile([], 20)

describe('performance-ui helpers', () => {
  it('names the periods', () => {
    expect(periodLabel(20)).toBe('Last 20')
    expect(periodLabel(50)).toBe('Last 50')
    expect(periodLabel(100)).toBe('All loaded')
  })
  it('record line with the W–L split and win rate; honest with 0 or 1 game', () => {
    expect(recordLabel({ ...EMPTY, games: 20, wins: 12, winRate: 60 })).toBe('12W – 8L · 60% win rate')
    expect(recordLabel({ ...EMPTY, games: 1, wins: 0, winRate: 0 })).toBe('0W – 1L · 0% win rate')
    expect(recordLabel(EMPTY)).toBe('No games yet')
  })
  it('streak line only for a streak', () => {
    expect(streakLabel({ kind: 'loss', n: 3 })).toBe('3-game loss streak')
    expect(streakLabel({ kind: 'win', n: 2 })).toBe('2-game win streak')
    expect(streakLabel(null)).toBeNull()
  })
  it('says how many games the numbers cover', () => {
    expect(gamesNote({ ...EMPTY, period: 20, games: 20 })).toBe('Over your last 20 games')
    expect(gamesNote({ ...EMPTY, period: 50, games: 7 })).toBe('Over your 7 loaded games')
    expect(gamesNote({ ...EMPTY, period: 100, games: 100 })).toBe('Over your last 100 games')
  })
  it('bar height scales with the score, 2 px floor, 0 for null', () => {
    expect(barHeight(null, 40)).toBe(0)
    expect(barHeight(0, 40)).toBe(2)
    expect(barHeight(50, 40)).toBe(20)
    expect(barHeight(100, 40)).toBe(40)
  })
})

describe('performance-ui — roles and areas copy', () => {
  it('ranks roles only when the engine did', () => {
    expect(roleRankNote({ ...EMPTY, strongestRole: 'MIDDLE', weakestRole: 'TOP' })).toBe('Strongest: Mid · Weakest: Top')
    expect(roleRankNote({ ...EMPTY, strongestRole: 'MIDDLE', weakestRole: null })).toBe('Strongest: Mid')
    expect(roleRankNote(EMPTY)).toBe('Play 3 games in a role to rank it.')
  })
  it('writes a sub-row with its average and target in the metric format', () => {
    expect(subrowLine({ key: 'total', label: 'CS / min', avg: 6.4, target: 7, decimals: 1, suffix: '', n: 12 })).toBe('CS / min 6.4 · target 7.0')
    expect(subrowLine({ key: 'kp', label: 'Kill participation', avg: 48, target: 55, decimals: 0, suffix: '%', n: 12 })).toBe('Kill participation 48% · target 55%')
    expect(subrowLine({ key: 'kp', label: 'Kill participation', avg: null, target: 55, decimals: 0, suffix: '%', n: 0 })).toBe('Kill participation —')
  })
})
