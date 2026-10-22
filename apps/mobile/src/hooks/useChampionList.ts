import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { championIdByName, championJsonUrl, parseChampionJson, type ChampionEntry } from '@/lib/champions'
import { matchKeys } from '@/lib/match-keys'
import { useDdragonVersion } from './useDdragonVersion'

const DAY_MS = 24 * 60 * 60 * 1000

async function fetchChampions(version: string): Promise<ChampionEntry[]> {
  const res = await fetch(championJsonUrl(version))
  if (!res.ok) throw new Error(`champion.json ${res.status}`)
  return parseChampionJson(await res.json())
}

/** Every champion from Data Dragon (one fetch a day) and a display-name → id resolver for live snapshots. */
export function useChampionList(): { champions: ChampionEntry[]; loading: boolean; byName: (liveName: string) => number | null } {
  const version = useDdragonVersion()
  const q = useQuery({ queryKey: matchKeys.champions(version), queryFn: () => fetchChampions(version), staleTime: DAY_MS, gcTime: 7 * DAY_MS, retry: 1 })
  const list = q.data ?? []
  const byName = useCallback((liveName: string) => championIdByName(list, liveName), [list])
  return { champions: list, loading: q.isPending, byName }
}
