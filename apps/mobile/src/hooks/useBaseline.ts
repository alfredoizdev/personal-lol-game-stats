import { useQueries, useQuery } from '@tanstack/react-query'
import { buildBaseline, summarizeMatch, type Baseline, type MatchSummary, type Role } from '@lpp/shared'
import type { LinkedAccount } from '@/lib/linked-account'
import { fetchMatchIds, isRetryableRiotError } from '@/lib/riot-api'
import { supabase } from '@/lib/supabase'
import { identityOf, matchDetailQuery, matchKeys } from './useRecentMatches'

const BASELINE_COUNT = 20

/**
 * "vs you": the player's average over their last 20 games in this role. Shares
 * the Matches tab's id and detail queries (same keys), so details the tab
 * already loaded cost nothing; the missing ones are fetched in the background
 * (at most ~10 Riot calls once; `match_details_cache` makes repeats free).
 */
export function useBaseline(account: LinkedAccount | null, role: Role | null, excludeMatchId: string): { baseline: Baseline | null; loading: boolean; n: number } {
  const ids = useQuery({
    queryKey: matchKeys.ids(account?.puuid, BASELINE_COUNT),
    queryFn: () => fetchMatchIds(supabase, { gameName: account!.gameName, tagLine: account!.tagLine, region: account!.region, count: BASELINE_COUNT }),
    enabled: !!account && !!role,
    staleTime: 90 * 1000,
    retry: (n, err) => n < 2 && isRetryableRiotError(err),
  })
  const details = useQueries({
    queries: (ids.data ?? []).map((matchId) => matchDetailQuery(matchId, account?.region ?? 'NA', !!account && !!role)),
  })
  const pending = ids.isPending || details.some((q) => q.isPending)

  // Cheap enough to recompute per render (≤ 20 summaries); no memo keeps the deps honest.
  let baseline: Baseline | null = null
  if (account && role && !pending) {
    const summaries = details
      .map((q) => (q.data ? summarizeMatch(q.data, identityOf(account)) : null))
      .filter((s): s is MatchSummary => s !== null)
    baseline = buildBaseline(summaries, role, excludeMatchId)
  }

  return { baseline, loading: !!account && !!role && pending, n: baseline?.n ?? 0 }
}
