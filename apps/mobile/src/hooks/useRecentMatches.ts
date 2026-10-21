import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { summarizeMatch, type MatchSummary } from '@lpp/shared'
import type { LinkedAccount } from '@/lib/linked-account'
import { fetchMatchDetail, fetchMatchIds, isRetryableRiotError, riotErrorCode, type RiotErrorCode } from '@/lib/riot-api'
import { supabase } from '@/lib/supabase'

export const matchKeys = {
  ids: (puuid: string | undefined, count: number) => ['match-ids', puuid, count] as const,
  detail: (matchId: string) => ['match-detail', matchId] as const,
}

export type MatchRowState =
  | { matchId: string; status: 'loading' }
  | { matchId: string; status: 'error'; error: RiotErrorCode }
  | { matchId: string; status: 'ready'; summary: MatchSummary }

const DAY_MS = 24 * 60 * 60 * 1000

export function matchDetailQuery(matchId: string, region: LinkedAccount['region']) {
  return {
    queryKey: matchKeys.detail(matchId),
    queryFn: () => fetchMatchDetail(supabase, { matchId, region }),
    staleTime: Infinity,
    gcTime: DAY_MS,
    retry: (n: number, err: unknown) => n < 2 && isRetryableRiotError(err),
  }
}

export function useRecentMatches(account: LinkedAccount | null, count = 20) {
  const qc = useQueryClient()
  const [isRefreshing, setRefreshing] = useState(false)

  const ids = useQuery({
    queryKey: matchKeys.ids(account?.puuid, count),
    queryFn: () => fetchMatchIds(supabase, { gameName: account!.gameName, tagLine: account!.tagLine, region: account!.region, count }),
    enabled: !!account,
    staleTime: 90 * 1000,
    retry: (n, err) => n < 2 && isRetryableRiotError(err),
  })

  const details = useQueries({
    queries: (ids.data ?? []).map((matchId) => matchDetailQuery(matchId, account?.region ?? 'NA')),
  })

  const matches: MatchRowState[] = useMemo(() => {
    const list = ids.data ?? []
    return list.map((matchId, i) => {
      const q = details[i]
      if (!q || q.isPending) return { matchId, status: 'loading' as const }
      if (q.isError) return { matchId, status: 'error' as const, error: riotErrorCode(q.error) }
      const summary = account ? summarizeMatch(q.data, account.puuid) : null
      if (!summary) return { matchId, status: 'error' as const, error: 'UNKNOWN' as const }
      return { matchId, status: 'ready' as const, summary }
    })
  }, [ids.data, details, account])

  const refresh = useCallback(async () => {
    if (!account) return
    setRefreshing(true)
    try {
      await qc.invalidateQueries({ queryKey: matchKeys.ids(account.puuid, count) })
    } finally {
      setRefreshing(false)
    }
  }, [qc, account, count])

  return { ids, matches, refresh, isRefreshing }
}
