import { describe, it, expect } from 'vitest'
import { performanceProfile } from '@lpp/shared'
import { barHeight, fewGamesNote, gamesNote, previousDelta, recordLabel, roleRankNote, streakLabel, subrowLine, winRateColor } from '../src/lib/performance-ui'
import { colors } from '../src/theme/tokens'

const EMPTY = performanceProfile([], 20)

describe('performance-ui helpers', () => {
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
    expect(gamesNote({ ...EMPTY, period: 20, games: 20 })).toBe('Last 20 games')
    expect(gamesNote({ ...EMPTY, period: 20, games: 7 })).toBe('Your 7 loaded games')
    expect(gamesNote({ ...EMPTY, period: 20, games: 1 })).toBe('Your 1 loaded game')
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
    expect(roleRankNote(EMPTY)).toBe('Roles are ranked from 3 games each.')
  })
  it('writes a sub-row with its average and target in the metric format', () => {
    expect(subrowLine({ key: 'total', label: 'CS / min', avg: 6.4, target: 7, decimals: 1, suffix: '', n: 12 })).toBe('CS / min 6.4 · target 7.0')
    expect(subrowLine({ key: 'kp', label: 'Kill participation', avg: 48, target: 55, decimals: 0, suffix: '%', n: 12 })).toBe('Kill participation 48% · target 55%')
    expect(subrowLine({ key: 'kp', label: 'Kill participation', avg: null, target: 55, decimals: 0, suffix: '%', n: 0 })).toBe('Kill participation —')
  })
})

describe('performance-ui — win rate colour', () => {
  it('green from 50 %, red below', () => {
    expect(winRateColor(50)).toBe(colors.win)
    expect(winRateColor(49)).toBe(colors.loss)
  })
})

describe('performance-ui — few games', () => {
  it('shows the engine sentence only under 3 games', () => {
    expect(fewGamesNote({ ...EMPTY, games: 2, headline: 'Only 2 games loaded — load more for a clearer picture.' })).toBe('Only 2 games loaded — load more for a clearer picture.')
    expect(fewGamesNote({ ...EMPTY, games: 3, headline: 'anything' })).toBeNull()
    expect(fewGamesNote(EMPTY)).toBeNull()
  })
})

describe('performance-ui — score context', () => {
  it('compares the average with the previous window as a signed number', () => {
    expect(previousDelta({ ...EMPTY, avgScore: 46, previousAvgScore: 50, previousN: 20 })).toBe('−4')
    expect(previousDelta({ ...EMPTY, avgScore: 46, previousAvgScore: 40, previousN: 7 })).toBe('+6')
    expect(previousDelta({ ...EMPTY, avgScore: 46, previousAvgScore: 46, previousN: 20 })).toBe('±0')
    expect(previousDelta({ ...EMPTY, avgScore: 46, previousAvgScore: null, previousN: 0 })).toBeNull()
  })
})
