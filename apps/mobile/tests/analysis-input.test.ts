import { describe, it, expect } from 'vitest'
import type { MatchSummary, TimelineSeries, Baseline } from '@lpp/shared'
import { analysisInputFromQueries, type AnalysisQueryState } from '../src/lib/analysis-input'

const summary = { matchId: 'NA1_1' } as MatchSummary
const series = { v: 1, matchId: 'NA1_1', participants: [], frames: [] } as TimelineSeries
const baseline: Baseline = { n: 5, csPerMin: 6, kpPct: 50, deathsPer10: 1, visionPerMin: 0.5, wardsPerMin: 0.2 }

const state = (over: Partial<AnalysisQueryState>): AnalysisQueryState => ({
  summary,
  series: { status: 'success', data: series },
  baseline: { loading: false, data: baseline },
  ...over,
})

describe('analysisInputFromQueries', () => {
  it('returns null input without a summary', () => {
    expect(analysisInputFromQueries(state({ summary: null })).input).toBeNull()
  })
  it('passes a null series while the timeline is pending or errored, and exposes the error', () => {
    const pending = analysisInputFromQueries(state({ series: { status: 'pending' } }))
    expect(pending.input).toEqual({ summary, series: null, baseline })
    expect(pending.timelineError).toBeNull()
    const err = new Error('RATE_LIMITED')
    const errored = analysisInputFromQueries(state({ series: { status: 'error', error: err } }))
    expect(errored.input?.series).toBeNull()
    expect(errored.timelineError).toBe(err)
  })
  it('passes the baseline only when it finished loading', () => {
    const loading = analysisInputFromQueries(state({ baseline: { loading: true, data: null } }))
    expect(loading.input?.baseline).toBeNull()
    expect(loading.baselineLoading).toBe(true)
    const done = analysisInputFromQueries(state({}))
    expect(done.input?.baseline).toBe(baseline)
    expect(done.baselineLoading).toBe(false)
  })
  it('passes the series through when the timeline succeeded', () => {
    expect(analysisInputFromQueries(state({})).input?.series).toBe(series)
  })
})
