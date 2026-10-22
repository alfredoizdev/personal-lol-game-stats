import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { summarizeMatch, type MatchSummary, type MatchV5 } from '@lpp/shared'
import { BACKFILL_COUNT, runBackfill } from '@/lib/backfill'
import type { LinkedAccount } from '@/lib/linked-account'
import { matchKeys } from '@/lib/match-keys'
import { isReviewOpen } from '@/lib/review-focus'
import { fetchMatchIds, isRetryableRiotError } from '@/lib/riot-api'
import { supabase } from '@/lib/supabase'
import { identityOf, matchDetailQuery } from './useRecentMatches'

export type OwnHistory = {
  summaries: MatchSummary[]
  ids: string[]
  loaded: number
  total: number
  running: boolean
  start: () => void
  /** The last run's problem (rate limit, failed ids) or the ids query's error. */
  error: unknown | null
  idsPending: boolean
}

/**
 * The player's last 100 games for the pre-match block. Ids are fetched once
 * (10-minute staleness); details are NEVER fetched automatically — `start()`
 * runs `runBackfill` (each id once per run, stops on a rate limit, waits while
 * a Match Review is open or `paused` is true). Everything already in the query
 * cache (the Matches tab's 20, earlier runs) counts immediately and
 * `match_details_cache` makes later runs free.
 */
export function useOwnHistory(account: LinkedAccount | null, paused: boolean): OwnHistory {
  const qc = useQueryClient()
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<unknown | null>(null)
  const [tick, setTick] = useState(0) // bumps when a chunk lands so summaries recompute
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const idsQuery = useQuery({
    queryKey: matchKeys.ownIds(account?.puuid),
    queryFn: () => fetchMatchIds(supabase, { gameName: account!.gameName, tagLine: account!.tagLine, region: account!.region, count: BACKFILL_COUNT }),
    enabled: !!account,
    staleTime: 10 * 60 * 1000,
    retry: (n, err) => n < 2 && isRetryableRiotError(err),
  })
  const ids = useMemo(() => idsQuery.data ?? [], [idsQuery.data])
  const puuid = account?.puuid
  const region = account?.region ?? 'NA'

  const isCached = useCallback((id: string) => qc.getQueryData<MatchV5>(matchKeys.detail(id)) !== undefined, [qc])

  useEffect(() => {
    if (!running || !puuid) return
    if (ids.length === 0) {
      if (!idsQuery.isPending) setRunning(false) // nothing to load (no games, or the ids query failed)
      return
    }
    let cancelled = false
    void runBackfill({
      ids,
      isCached,
      fetchOne: (id) => qc.fetchQuery(matchDetailQuery(id, region)),
      isPaused: () => pausedRef.current || isReviewOpen(),
      isCancelled: () => cancelled,
      onChunk: () => {
        if (!cancelled) setTick((t) => t + 1)
      },
    }).then((r) => {
      if (cancelled) return
      setRunError(r.stoppedBy ?? (r.failed > 0 ? new Error(`${r.failed} games could not be loaded`) : null))
      setRunning(false)
    })
    return () => {
      cancelled = true
    }
  }, [running, ids, puuid, region, qc, isCached, idsQuery.isPending])

  // A different account cancels any run (the effect above re-runs with the new ids).
  useEffect(() => {
    setRunning(false)
    setRunError(null)
  }, [puuid])

  const start = useCallback(() => {
    setRunError(null)
    setRunning(true)
  }, [])

  const summaries = useMemo(() => {
    void tick
    if (!account) return []
    const out: MatchSummary[] = []
    for (const id of ids) {
      const blob = qc.getQueryData<MatchV5>(matchKeys.detail(id))
      const s = blob ? summarizeMatch(blob, identityOf(account)) : null
      if (s) out.push(s)
    }
    return out
  }, [ids, tick, account, qc])

  const loaded = useMemo(() => {
    void tick
    return ids.filter(isCached).length
  }, [ids, tick, isCached])

  return {
    summaries,
    ids,
    loaded,
    total: ids.length,
    running,
    start,
    error: runError ?? idsQuery.error ?? null,
    idsPending: !!account && idsQuery.isPending,
  }
}
