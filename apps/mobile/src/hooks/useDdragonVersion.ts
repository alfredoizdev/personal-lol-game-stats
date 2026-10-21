import { useQuery } from '@tanstack/react-query'
import { DDRAGON_FALLBACK_VERSION, DDRAGON_VERSIONS_URL } from '@lpp/shared'

async function fetchLatestVersion(): Promise<string> {
  const res = await fetch(DDRAGON_VERSIONS_URL)
  if (!res.ok) throw new Error(`ddragon ${res.status}`)
  const list: unknown = await res.json()
  if (!Array.isArray(list) || typeof list[0] !== 'string') throw new Error('ddragon versions malformed')
  return list[0]
}

/** Latest Data Dragon version, falling back to a pinned one while loading or offline. */
export function useDdragonVersion(): string {
  const q = useQuery({
    queryKey: ['ddragon-version'],
    queryFn: fetchLatestVersion,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  })
  return q.data ?? DDRAGON_FALLBACK_VERSION
}
