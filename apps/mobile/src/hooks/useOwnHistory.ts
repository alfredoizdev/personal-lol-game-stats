import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { summarizeMatch, type MatchSummary, type MatchV5 } from '@lpp/shared'
import { BACKFILL_COUNT, nextChunk } from '@/lib/backfill'
import type { LinkedAccount } from '@/lib/linked-account'
import { matchKeys } from '@/lib/match-keys'
import { fetchMatchIds, isRetryableRiotError } from '@/lib/riot-api'
import { supabase } from '@/lib/supabase'
import { identityOf, matchDetailQuery } from './useRecentMatches'

/**
 * The player's last 100 games for the pre-match block. Ids are fetched once
 * (10-minute staleness); details are NEVER fetched automatically — `start()`
 * pulls the missing ones chunk by chunk through the shared limiter, pausing
 * while `paused` is true (a Match Review is open). Everything already in the
 * query cache (the Matches tab's 20, earlier backfills) counts immediately and
 * `match_details_cache` makes later runs free.
 */
export function useOwnHistory(
  account: LinkedAccount | null,
  paused: boolean,
): { summaries: MatchSummary[]; ids: string[]; loaded: number; total: number; running: boolean; start: () => void; error: unknown | null } {
  const qc = useQueryClient()
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<unknown | null>(null)
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
  const ids = idsQuery.data ?? []

  const cachedIds = () => new Set(ids.filter((id) => qc.getQueryData<MatchV5>(matchKeys.detail(id)) !== undefined))

  useEffect(() => {
    if (!running || !account) return
    let cancelled = false
    const run = async () => {
      try {
        while (!cancelled) {
          if (pausedRef.current) {
            await new Promise((r) => setTimeout(r, 1000))
            continue
          }
          const chunk = nextChunk(ids, cachedIds())
          if (chunk.length === 0) break
          await Promise.all(chunk.map((id) => qc.fetchQuery(matchDetailQuery(id, account.region)).catch(() => null)))
          if (!cancelled) setTick((t) => t + 1)
        }
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setRunning(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [running])

  const start = useCallback(() => {
    setError(null)
    setRunning(true)
  }, [])

  // Summaries from whatever is cached right now (cheap: ≤ 100 summarize calls per change).
  void tick
  const summaries: MatchSummary[] = []
  if (account) {
    for (const id of ids) {
      const blob = qc.getQueryData<MatchV5>(matchKeys.detail(id))
      const s = blob ? summarizeMatch(blob, identityOf(account)) : null
      if (s) summaries.push(s)
    }
  }
  return { summaries, ids, loaded: account ? cachedIds().size : 0, total: ids.length, running, start, error }
}
