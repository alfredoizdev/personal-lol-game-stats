import type { AnalysisInput, Baseline, MatchSummary, TimelineSeries } from '@lpp/shared'

/** What the Match Review screen has at hand, as plain data so the assembly is testable. */
export type AnalysisQueryState = {
  summary: MatchSummary | null
  series: { status: 'pending' | 'error' | 'success'; data?: TimelineSeries; error?: unknown }
  baseline: { loading: boolean; data: Baseline | null }
}

/**
 * Builds the engine input from the three queries. A pending or failed timeline
 * still yields an input (areas that don't need it render); the error travels
 * separately so the Farming/Lane cards can offer a retry.
 */
export function analysisInputFromQueries(s: AnalysisQueryState): { input: AnalysisInput | null; timelineError: unknown | null; baselineLoading: boolean } {
  const baselineLoading = s.baseline.loading
  if (!s.summary) return { input: null, timelineError: null, baselineLoading }
  const series = s.series.status === 'success' && s.series.data ? s.series.data : null
  return {
    input: { summary: s.summary, series, baseline: baselineLoading ? null : s.baseline.data },
    timelineError: s.series.status === 'error' ? (s.series.error ?? new Error('timeline failed')) : null,
    baselineLoading,
  }
}
