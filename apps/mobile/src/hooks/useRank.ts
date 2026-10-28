import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { RankedEntries, RankSnapshot } from '@lpp/shared'
import { useAuth } from '@/lib/auth-context'
import type { LinkedAccount } from '@/lib/linked-account'
import { matchKeys } from '@/lib/match-keys'
import { fetchRankSnapshots, recordRankSnapshots } from '@/lib/rank-snapshots'
import { fetchRankedEntries, isRetryableRiotError } from '@/lib/riot-api'
import { supabase } from '@/lib/supabase'

const RANK_STALE_MS = 15 * 60 * 1000
const HISTORY_STALE_MS = 5 * 60 * 1000

/**
 * The active account's ranked standing: one Riot call per 15 minutes per account (and on demand after a game),
 * kept on the device between launches. Every read that shows a moved standing is also stored as a snapshot,
 * which is what gives each ranked game its LP change (lp-changes.ts). Storing never hides the rank.
 */
export function useRank(account: LinkedAccount | null): { rank: RankedEntries | null; loading: boolean } {
  const { user } = useAuth()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: matchKeys.rank(account?.puuid),
    queryFn: async () => {
      const rank = await fetchRankedEntries(supabase, { gameName: account!.gameName, tagLine: account!.tagLine, region: account!.region })
      if (user) {
        try {
          const stored = qc.getQueryData<RankSnapshot[]>(matchKeys.rankHistory(account!.puuid)) ?? (await fetchRankSnapshots(supabase, user.id, account!.puuid))
          const written = await recordRankSnapshots(supabase, user.id, account!.puuid, rank, stored, new Date().toISOString())
          if (written > 0) void qc.invalidateQueries({ queryKey: matchKeys.rankHistory(account!.puuid) })
        } catch {
          // offline or table missing: the rank still shows; the snapshot is taken on the next read
        }
      }
      return rank
    },
    enabled: !!account,
    staleTime: RANK_STALE_MS,
    retry: (n, err) => n < 2 && isRetryableRiotError(err),
  })
  return { rank: q.data ?? null, loading: !!account && q.isPending }
}

/** The stored standings of the account, oldest first, for the LP-per-game column. */
export function useRankHistory(account: LinkedAccount | null): RankSnapshot[] {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: matchKeys.rankHistory(account?.puuid),
    queryFn: () => fetchRankSnapshots(supabase, user!.id, account!.puuid),
    enabled: !!user && !!account,
    staleTime: HISTORY_STALE_MS,
  })
  return q.data ?? []
}
