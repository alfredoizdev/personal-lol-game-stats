import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { summarizeMatch, type MatchSummary, type MatchV5 } from '@lpp/shared'
import { BACKFILL_COUNT, runBackfill } from '@/lib/backfill'
import { claimRun, getRun, isRunOwned, releaseRun, setRun, subscribeRuns } from '@/lib/backfill-run'
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
 * The player's last 100 games (pre-match block, Performance tab). Ids are
 * fetched once (10-minute staleness); details are NEVER fetched automatically —
 * `start()` runs `runBackfill` (each id once per run, stops on a rate limit,
 * waits while a Match Review is open or `paused` is true). Everything already
 * in the query cache (the Matches tab's 20, earlier runs) counts immediately and
 * `match_details_cache` makes later runs free.
 *
 * Several screens mount this hook at once: the run state lives in
 * `backfill-run.ts` (one run per account, one owner) and the summaries follow
 * the query cache itself, so a run started on one tab shows on the other.
 */
export function useOwnHistory(account: LinkedAccount | null, paused: boolean): OwnHistory {
  const qc = useQueryClient()
  const puuid = account?.puuid
  const run = useSyncExternalStore(subscribeRuns, () => getRun(puuid))
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const idsQuery = useQuery({
    queryKey: matchKeys.ownIds(puuid),
    queryFn: () => fetchMatchIds(supabase, { gameName: account!.gameName, tagLine: account!.tagLine, region: account!.region, count: BACKFILL_COUNT }),
    enabled: !!account,
    staleTime: 10 * 60 * 1000,
    retry: (n, err) => n < 2 && isRetryableRiotError(err),
  })
  const ids = useMemo(() => idsQuery.data ?? [], [idsQuery.data])
  const region = account?.region ?? 'NA'

  const isCached = useCallback((id: string) => qc.getQueryData<MatchV5>(matchKeys.detail(id)) !== undefined, [qc])

  // Recompute whenever a match detail lands in the cache, whoever fetched it
  // (another tab's run, the Matches list). Cache events fire synchronously, some
  // of them while another screen is rendering (query creation), so the state
  // update is deferred and coalesced instead of set inside the callback.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let pending = false
    let alive = true
    const unsubscribe = qc.getQueryCache().subscribe((e) => {
      if (e.query.queryKey[0] !== 'match-detail' || pending) return
      const relevant = e.type === 'removed' || (e.type === 'updated' && e.action.type === 'success') || (e.type === 'added' && e.query.state.data !== undefined)
      if (!relevant) return
      pending = true
      setTimeout(() => {
        pending = false
        if (alive) setTick((t) => t + 1)
      }, 0)
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [qc])

  useEffect(() => {
    if (!run.running || !puuid) return
    if (ids.length === 0) {
      if (!idsQuery.isPending) setRun(puuid, { running: false }) // nothing to load (no games, or the ids query failed)
      return
    }
    if (!claimRun(puuid)) return // another instance drives this run
    let cancelled = false
    void runBackfill({
      ids,
      isCached,
      fetchOne: (id) => qc.fetchQuery(matchDetailQuery(id, region)),
      isPaused: () => pausedRef.current || isReviewOpen(),
      isCancelled: () => cancelled,
      onChunk: () => {},
    }).then((r) => {
      if (cancelled) return
      releaseRun(puuid)
      setRun(puuid, { running: false, error: r.stoppedBy ?? (r.failed > 0 ? new Error(`${r.failed} games could not be loaded`) : null) })
    })
    return () => {
      cancelled = true
      releaseRun(puuid)
      // Deps changed (new ids) → this effect re-runs at once and reclaims; a real unmount leaves no owner → stop the run.
      queueMicrotask(() => {
        if (!isRunOwned(puuid)) setRun(puuid, { running: false })
      })
    }
  }, [run.running, ids, puuid, region, qc, isCached, idsQuery.isPending])

  const start = useCallback(() => {
    if (puuid) setRun(puuid, { running: true, error: null })
  }, [puuid])

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
    running: run.running,
    start,
    error: run.error ?? idsQuery.error ?? null,
    idsPending: !!account && idsQuery.isPending,
  }
}
