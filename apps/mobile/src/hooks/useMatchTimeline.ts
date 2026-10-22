import { useQuery } from '@tanstack/react-query'
import type { Region, TimelineSeries } from '@lpp/shared'
import { matchKeys } from '@/lib/match-keys'
import { fetchMatchTimeline, isRetryableRiotError } from '@/lib/riot-api'
import { supabase } from '@/lib/supabase'

const DAY_MS = 24 * 60 * 60 * 1000

/** The reduced timeline series for a match. Immutable, so it never goes stale; 1 Riot call per match, ever. */
export function useMatchTimeline(matchId: string | undefined, region: Region) {
  return useQuery<TimelineSeries>({
    queryKey: matchKeys.timeline(matchId ?? ''),
    queryFn: () => fetchMatchTimeline(supabase, { matchId: matchId!, region }),
    staleTime: Infinity,
    gcTime: DAY_MS,
    retry: (n, err) => n < 2 && isRetryableRiotError(err),
    enabled: !!matchId,
  })
}
