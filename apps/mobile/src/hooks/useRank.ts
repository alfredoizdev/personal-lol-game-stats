import { useQuery } from '@tanstack/react-query'
import type { RankedEntries } from '@lpp/shared'
import type { LinkedAccount } from '@/lib/linked-account'
import { matchKeys } from '@/lib/match-keys'
import { fetchRankedEntries, isRetryableRiotError } from '@/lib/riot-api'
import { supabase } from '@/lib/supabase'

const HOUR_MS = 60 * 60 * 1000

/** The active account's ranked standing; one Riot call per hour per account, kept on the device between launches. */
export function useRank(account: LinkedAccount | null): { rank: RankedEntries | null; loading: boolean } {
  const q = useQuery({
    queryKey: matchKeys.rank(account?.puuid),
    queryFn: () => fetchRankedEntries(supabase, { gameName: account!.gameName, tagLine: account!.tagLine, region: account!.region }),
    enabled: !!account,
    staleTime: HOUR_MS,
    retry: (n, err) => n < 2 && isRetryableRiotError(err),
  })
  return { rank: q.data ?? null, loading: !!account && q.isPending }
}
