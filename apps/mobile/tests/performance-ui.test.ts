import { describe, it, expect } from 'vitest'
import { performanceProfile, type CompareRow } from '@lpp/shared'
import { afterLossLine, compareValues, deepSessionLine, deltaChip, gamesNote, goalMetLine, goalTargetLine, goalTrendLine, loadState, sessionSubtitle, WINDOW } from '../src/lib/performance-ui'
import { colors } from '../src/theme/tokens'

const EMPTY = performanceProfile([], 20)

describe('performance-ui helpers', () => {
  it('says how many games the numbers cover', () => {
    expect(gamesNote({ ...EMPTY, period: 100, games: 100 })).toBe('Last 100 games')
    expect(gamesNote({ ...EMPTY, period: 100, games: 98 })).toBe('Last 98 games') // 2 of the 100 were ARAM / remakes
    expect(gamesNote({ ...EMPTY, period: 100, games: 1 })).toBe('Last game')
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


describe('goal progress lines (owner, 2026-10-29: your goal week by week)', () => {
  const base = { metric: 'csPerMin' as const, label: 'CS / min', target: 6, targetSource: 'set' as const, role: 'MIDDLE' as const, decimals: 1, lowerIsBetter: false, weeks: [], first: { weeksAgo: 2, avg: 5.1 }, last: { weeksAgo: 0, avg: 6.1 }, trend: 'up' as const }
  it('reads the oldest and newest week with the metric unit and the trend word', () => {
    expect(goalTrendLine(base)).toEqual({ text: '5.1 → 6.1 CS/min over 3 weeks', word: 'improving', color: colors.win })
    expect(goalTrendLine({ ...base, metric: 'kpPct', decimals: 0, first: { weeksAgo: 1, avg: 45 }, last: { weeksAgo: 0, avg: 52 } })).toEqual({ text: '45% → 52% kill participation over 2 weeks', word: 'improving', color: colors.win })
    expect(goalTrendLine({ ...base, metric: 'deathsPer10', lowerIsBetter: true, first: { weeksAgo: 3, avg: 1.5 }, last: { weeksAgo: 0, avg: 2.4 }, trend: 'down' })).toEqual({ text: '1.5 → 2.4 deaths per 10 min over 4 weeks', word: 'slipping', color: colors.loss })
    expect(goalTrendLine({ ...base, trend: 'flat', first: { weeksAgo: 1, avg: 6.1 } })).toMatchObject({ word: 'steady', color: colors.muted })
  })
  it('says how the current week is going against the target', () => {
    expect(goalMetLine({ weeksAgo: 0, games: 3, avg: 6.1, met: 2 })).toBe('Met in 2 of 3 games this week')
    expect(goalMetLine({ weeksAgo: 0, games: 1, avg: 6.1, met: 1 })).toBe('Met in 1 of 1 game this week')
    expect(goalMetLine({ weeksAgo: 0, games: 0, avg: null, met: 0 })).toBe('No games yet this week')
  })
  it('names the target with its source', () => {
    expect(goalTargetLine(base)).toBe('Target 6.0 CS/min · as Mid')
    expect(goalTargetLine({ ...base, targetSource: 'recommended' })).toBe('Target 6.0 CS/min · recommended for Mid')
  })
})

describe('session lines (owner, 2026-10-29: your sessions)', () => {
  const p = { sessions: 12, avgGames: 3.2, longest: 7, afterLoss: { winRate: 38, n: 24 }, afterWin: { winRate: 55, n: 31 }, early: { winRate: 55, deaths: 5.1, n: 24 }, deep: { winRate: 41, deaths: 6.8, n: 10 } }
  it('sums up the sittings', () => {
    expect(sessionSubtitle(p)).toBe('12 sessions · 3.2 games each on average · longest 7')
    expect(sessionSubtitle({ ...p, sessions: 3, avgGames: 1, longest: 1 })).toBe('3 sessions · 1 game each on average · longest 1')
  })
  it('reads the next game after a loss against after a win, flagging the worse side only when the gap is 5 points or more', () => {
    expect(afterLossLine(p)).toEqual({ loss: '38%', win: '55%', worse: 'loss', text: 'You win 38% of the next game after a loss and 55% after a win (24 and 31 games)' })
    expect(afterLossLine({ ...p, afterLoss: { winRate: 60, n: 10 }, afterWin: { winRate: 50, n: 10 } })).toMatchObject({ worse: 'win' })
    expect(afterLossLine({ ...p, afterLoss: { winRate: 58, n: 10 }, afterWin: { winRate: 61, n: 10 } })).toMatchObject({ worse: null })
    expect(afterLossLine({ ...p, afterLoss: null })).toBeNull()
  })
  it('reads games 1–2 of a sitting against the 4th onwards, deaths in the label', () => {
    expect(deepSessionLine(p)).toEqual({ early: '55%', earlyLabel: '5.1 deaths · games 1–2 of a sitting', deep: '41%', deepLabel: '6.8 deaths · 4th game onwards', worse: 'deep', text: 'From your 4th game in a sitting you win 41% with 6.8 deaths per game, against 55% and 5.1 in games 1–2 (10 and 24 games)' })
    expect(deepSessionLine({ ...p, early: { winRate: 50, deaths: 5, n: 10 }, deep: { winRate: 53, deaths: 5, n: 10 } })).toMatchObject({ worse: null })
    expect(deepSessionLine({ ...p, deep: null })).toBeNull()
  })
})
