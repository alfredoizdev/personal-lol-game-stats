import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'

/**
 * One storage row per query instead of one blob (owner's Android, 2026-10-27:
 * "Row too big to fit into CursorWindow"). Android's AsyncStorage is SQLite
 * and refuses to read a row over 2 MB; a hundred cached match details in one
 * row blow past that, iOS never minded. An index row lists the query hashes;
 * each query has its own row. A row that is missing or corrupt is skipped.
 */
export type ShardStorage = {
  getItem: (key: string) => Promise<string | null>
  multiGet: (keys: string[]) => Promise<ReadonlyArray<readonly [string, string | null]>>
  multiSet: (pairs: Array<[string, string]>) => Promise<void>
  multiRemove: (keys: string[]) => Promise<void>
}

type Index = { timestamp: number; buster: string; mutations: PersistedClient['clientState']['mutations']; hashes: string[] }
type PersistedQuery = PersistedClient['clientState']['queries'][number]

export function createShardedPersister({ storage, key, throttleTime = 1000 }: { storage: ShardStorage; key: string; throttleTime?: number }): Persister {
  const indexKey = `${key}:index`
  const rowKey = (hash: string) => `${key}:q:${hash}`

  async function writeNow(client: PersistedClient): Promise<void> {
    const queries = client.clientState.queries
    const hashes = queries.map((q) => q.queryHash)
    const previous = await readIndex()
    const stale = (previous?.hashes ?? []).filter((h) => !hashes.includes(h))
    const index: Index = { timestamp: client.timestamp, buster: client.buster, mutations: client.clientState.mutations, hashes }
    await storage.multiSet([...queries.map((q): [string, string] => [rowKey(q.queryHash), JSON.stringify(q)]), [indexKey, JSON.stringify(index)]])
    if (stale.length) await storage.multiRemove(stale.map(rowKey))
  }

  async function readIndex(): Promise<Index | null> {
    try {
      const raw = await storage.getItem(indexKey)
      return raw ? (JSON.parse(raw) as Index) : null
    } catch {
      return null
    }
  }

  // Trailing throttle, like TanStack's async-storage persister: the newest client wins, one write per window.
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: PersistedClient | null = null
  const persistClient = (client: PersistedClient): Promise<void> => {
    if (throttleTime <= 0) return writeNow(client)
    pending = client
    if (!timer) {
      timer = setTimeout(() => {
        timer = null
        const c = pending
        pending = null
        if (c) void writeNow(c)
      }, throttleTime)
    }
    return Promise.resolve()
  }

  return {
    persistClient,
    restoreClient: async () => {
      const index = await readIndex()
      if (!index) return undefined
      const rows = await storage.multiGet(index.hashes.map(rowKey))
      const queries: PersistedQuery[] = []
      for (const [, raw] of rows) {
        if (!raw) continue
        try {
          queries.push(JSON.parse(raw) as PersistedQuery)
        } catch {
          // a damaged row costs one refetch, never the launch
        }
      }
      return { timestamp: index.timestamp, buster: index.buster, clientState: { mutations: index.mutations, queries } }
    },
    removeClient: async () => {
      const index = await readIndex()
      await storage.multiRemove([indexKey, ...(index?.hashes ?? []).map(rowKey)])
    },
  }
}
