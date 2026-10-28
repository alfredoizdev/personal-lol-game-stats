import { describe, expect, it } from 'vitest'
import type { PersistedClient } from '@tanstack/react-query-persist-client'
import { createShardedPersister } from '@/lib/sharded-persister'

/** AsyncStorage look-alike with Android's 2 MB per-row ceiling enforced. */
function fakeStorage() {
  const rows = new Map<string, string>()
  const LIMIT = 2 * 1024 * 1024
  const put = (k: string, v: string) => {
    if (v.length > LIMIT) throw new Error('Row too big to fit into CursorWindow')
    rows.set(k, v)
  }
  return {
    rows,
    getItem: async (k: string) => rows.get(k) ?? null,
    setItem: async (k: string, v: string) => put(k, v),
    removeItem: async (k: string) => { rows.delete(k) },
    multiGet: async (ks: string[]) => ks.map((k) => [k, rows.get(k) ?? null] as [string, string | null]),
    multiSet: async (pairs: Array<[string, string]>) => { for (const [k, v] of pairs) put(k, v) },
    multiRemove: async (ks: string[]) => { for (const k of ks) rows.delete(k) },
  }
}

const query = (hash: string, data: unknown) => ({ queryHash: hash, queryKey: JSON.parse(hash), dehydratedAt: 1, state: { data, dataUpdateCount: 1, dataUpdatedAt: 1, error: null, errorUpdateCount: 0, errorUpdatedAt: 0, fetchFailureCount: 0, fetchFailureReason: null, fetchMeta: null, isInvalidated: false, status: 'success' as const, fetchStatus: 'idle' as const } })
const client = (queries: ReturnType<typeof query>[]): PersistedClient => ({ timestamp: 1700000000000, buster: '', clientState: { mutations: [], queries } })

describe('sharded persister (Android: "Row too big to fit into CursorWindow", owner 2026-10-27)', () => {
  it('stores one row per query instead of one blob, and restores the same client', async () => {
    const storage = fakeStorage()
    const p = createShardedPersister({ storage, key: 'cache', throttleTime: 0 })
    const big = 'x'.repeat(1.5 * 1024 * 1024) // one 1.5 MB match blob; two of them in one row would overflow
    const c = client([query('["match-detail","NA1_1"]', { big }), query('["match-detail","NA1_2"]', { big }), query('["champions","15.21"]', [1, 2])])
    await p.persistClient(c)
    expect([...storage.rows.keys()].filter((k) => k.startsWith('cache:q:')).length).toBe(3)
    await expect(p.restoreClient()).resolves.toEqual(c)
  })
  it('drops the rows of queries that left the cache and removes everything on removeClient', async () => {
    const storage = fakeStorage()
    const p = createShardedPersister({ storage, key: 'cache', throttleTime: 0 })
    await p.persistClient(client([query('["match-detail","NA1_1"]', 1), query('["match-detail","NA1_2"]', 2)]))
    await p.persistClient(client([query('["match-detail","NA1_2"]', 2)]))
    expect((await p.restoreClient())?.clientState.queries.map((q) => q.queryHash)).toEqual(['["match-detail","NA1_2"]'])
    expect(storage.rows.has('cache:q:["match-detail","NA1_1"]')).toBe(false)
    await p.removeClient()
    expect(storage.rows.size).toBe(0)
    await expect(p.restoreClient()).resolves.toBeUndefined()
  })
  it('a corrupt or missing row is skipped, never a crash at launch', async () => {
    const storage = fakeStorage()
    const p = createShardedPersister({ storage, key: 'cache', throttleTime: 0 })
    await p.persistClient(client([query('["match-detail","NA1_1"]', 1), query('["match-detail","NA1_2"]', 2)]))
    storage.rows.set('cache:q:["match-detail","NA1_1"]', '{not json')
    storage.rows.delete('cache:q:["match-detail","NA1_2"]')
    expect((await p.restoreClient())?.clientState.queries).toEqual([])
  })
})
