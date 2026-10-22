import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import type { LinkedAccount } from '@/lib/linked-account'
import { fetchMatchDetail, fetchMatchIds, isRetryableRiotError } from '@/lib/riot-api'
import { toRowStates, type DetailResult, type MatchRowState } from '@/lib/match-rows'
import { supabase } from '@/lib/supabase'
import { INITIAL_PAGE, nextPage } from '@/lib/paging'

export const matchKeys = {
  ids: (puuid: string | undefined, count: number) => ['match-ids', puuid, count] as const,
  detail: (matchId: string) => ['match-detail', matchId] as const,
}

export type { MatchRowState }

const DAY_MS = 24 * 60 * 60 * 1000

export function matchDetailQuery(matchId: string, region: LinkedAccount['region'], enabled = true) {
  return {
    queryKey: matchKeys.detail(matchId),
    queryFn: () => fetchMatchDetail(supabase, { matchId, region }),
    staleTime: Infinity,
    gcTime: DAY_MS,
    retry: (n: number, err: unknown) => n < 2 && isRetryableRiotError(err),
    enabled,
  }
}

export function identityOf(account: LinkedAccount) {
  return { puuid: account.puuid, gameName: account.gameName, tagLine: account.tagLine }
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

  // Only the visible window fetches details: 10 first, +5 per scroll-to-end.
  const total = ids.data?.length ?? 0
  const [visible, setVisible] = useState(INITIAL_PAGE)
  useEffect(() => {
    setVisible(INITIAL_PAGE)
  }, [account?.puuid])
  const shown = Math.min(visible, total)

  const details = useQueries({
    queries: (ids.data ?? []).map((matchId, i) => matchDetailQuery(matchId, account?.region ?? 'NA', i < shown)),
  })

  const matches: MatchRowState[] = useMemo(() => {
    if (!account) return []
    const results: DetailResult[] = details.map((q) =>
      q.isPending ? { status: 'pending' } : q.isError ? { status: 'error', error: q.error } : { status: 'success', data: q.data },
    )
    return toRowStates(ids.data ?? [], results, identityOf(account), shown)
  }, [ids.data, details, account, shown])

  const hasMore = shown < total
  const loadMore = useCallback(() => {
    setVisible((v) => nextPage(v, total))
  }, [total])

  const refresh = useCallback(async () => {
    if (!account) return
    setRefreshing(true)
    try {
      const window = new Set((ids.data ?? []).slice(0, shown))
      await Promise.all([
        qc.invalidateQueries({ queryKey: matchKeys.ids(account.puuid, count) }),
        // Failed detail rows (429s, transient errors) get another chance on pull-to-refresh.
        qc.refetchQueries({
          predicate: (q) => q.queryKey[0] === 'match-detail' && window.has(String(q.queryKey[1])) && q.state.status === 'error',
        }),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [qc, account, count, ids.data, shown])

  return { ids, matches, refresh, isRefreshing, hasMore, loadMore, total }
}
