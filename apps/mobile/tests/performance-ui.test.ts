import { describe, it, expect } from 'vitest'
import { performanceProfile, type CompareRow } from '@lpp/shared'
import { compareValues, deltaChip, gamesNote, kdaLine, loadState, recordLine, winRateColor, WINDOW } from '../src/lib/performance-ui'
import { colors } from '../src/theme/tokens'

const EMPTY = performanceProfile([], 20)

describe('performance-ui helpers', () => {
  it('says how many games the numbers cover', () => {
    expect(gamesNote({ ...EMPTY, period: 100, games: 100 })).toBe('Last 100 games')
    expect(gamesNote({ ...EMPTY, period: 100, games: 98 })).toBe('Last 98 games') // 2 of the 100 were ARAM / remakes
    expect(gamesNote({ ...EMPTY, period: 100, games: 1 })).toBe('Last game')
  })
})

describe('performance-ui — win rate colour', () => {
  it('green from 50 %, red below', () => {
    expect(winRateColor(50)).toBe(colors.win)
    expect(winRateColor(49)).toBe(colors.loss)
  })
})

describe('performance-ui — recent snapshot copy (op.gg-style, owner 2026-10-27)', () => {
  it('record line and the K/D/A line with its ratio', () => {
    expect(recordLine({ games: 20, wins: 12, losses: 8, winRate: 60 })).toBe('12W 8L · 60%')
    expect(recordLine({ games: 0, wins: 0, losses: 0, winRate: null })).toBe('No games yet')
    expect(kdaLine({ kills: 6.8, deaths: 6.2, assists: 5.1, kda: 1.9 })).toEqual({ kda: '6.8 / 6.2 / 5.1', ratio: '1.9:1 KDA' })
    expect(kdaLine({ kills: 3, deaths: 0, assists: 3, kda: null })).toEqual({ kda: '3.0 / 0.0 / 3.0', ratio: 'Perfect KDA' })
  })
})

describe('performance-ui — you vs tier rows', () => {
  const row = (p: Partial<CompareRow>): CompareRow => ({ metric: 'csPerMin', label: 'CS / min', you: 6.0, bench: 6.3, delta: -0.3, better: false, n: 29, decimals: 1, suffix: '', lowerIsBetter: false, ...p })
  it('"you vs bench" in the metric format, — without data', () => {
    expect(compareValues(row({}))).toEqual({ you: '6.0', bench: '6.3' })
    expect(compareValues(row({ metric: 'kpPct', you: 50, bench: 45, decimals: 0, suffix: '%' }))).toEqual({ you: '50%', bench: '45%' })
    expect(compareValues(row({ you: null }))).toEqual({ you: '—', bench: '6.3' })
  })
  it('the signed gap chip, coloured by who is ahead; fewer deaths reads as ahead', () => {
    expect(deltaChip(row({}))).toEqual({ text: '−0.3', color: colors.loss })
    expect(deltaChip(row({ metric: 'kpPct', you: 50, bench: 45, delta: 5, better: true, decimals: 0, suffix: '%' }))).toEqual({ text: '+5%', color: colors.win })
    expect(deltaChip(row({ metric: 'deathsPer10', you: 1.6, bench: 1.8, delta: -0.2, better: true, lowerIsBetter: true }))).toEqual({ text: '−0.2', color: colors.win })
    expect(deltaChip(row({ delta: 0, better: null }))).toEqual({ text: '±0.0', color: colors.muted })
    expect(deltaChip(row({ you: null, delta: null, better: null }))).toBeNull()
  })
})

describe('performance-ui — load state of the window', () => {
  it('is loading until the window is cached or the auto-load gave up, ready when the window is cached, short when a run ended early', () => {
    expect(WINDOW).toBe(100)
    expect(loadState({ idsPending: true, total: 0, loadedInWindow: 0, running: false, attempted: false })).toBe('loading')
    expect(loadState({ idsPending: false, total: 0, loadedInWindow: 0, running: false, attempted: true })).toBe('empty')
    expect(loadState({ idsPending: false, total: 100, loadedInWindow: 60, running: true, attempted: true })).toBe('loading')
    expect(loadState({ idsPending: false, total: 100, loadedInWindow: 10, running: false, attempted: false })).toBe('loading') // auto-load not started yet
    expect(loadState({ idsPending: false, total: 100, loadedInWindow: 100, running: false, attempted: true })).toBe('ready')
    expect(loadState({ idsPending: false, total: 12, loadedInWindow: 12, running: false, attempted: true })).toBe('ready')
    expect(loadState({ idsPending: false, total: 100, loadedInWindow: 60, running: false, attempted: true })).toBe('short')
  })
})

