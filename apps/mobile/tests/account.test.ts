import { describe, it, expect, vi } from 'vitest'
import { deleteAccount, resolveActiveAccount, setActiveAccount } from '../src/lib/account'
import type { LinkedAccount } from '../src/lib/linked-account'

function fakeFunctionsClient(result: { data?: unknown; error?: { message?: string } }) {
  return { functions: { invoke: vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null })) } }
}

const a: LinkedAccount = { puuid: 'a', gameName: 'A', tagLine: 'NA1', region: 'NA', profileIconId: null }
const b: LinkedAccount = { puuid: 'b', gameName: 'B', tagLine: 'EUW', region: 'EUW', profileIconId: 7 }

describe('deleteAccount', () => {
  it('returns ok when the function reports ok', async () => {
    const client = fakeFunctionsClient({ data: { ok: true, deletedPuuids: 1 } })
    await expect(deleteAccount(client as never)).resolves.toEqual({ ok: true })
    expect(client.functions.invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' })
  })

  it('returns the error message when the function fails', async () => {
    const client = fakeFunctionsClient({ error: { message: 'delete_failed' } })
    await expect(deleteAccount(client as never)).resolves.toEqual({ ok: false, message: 'delete_failed' })
  })

  it('treats a response without ok:true as a failure', async () => {
    const client = fakeFunctionsClient({ data: { error: 'invalid_token' } })
    await expect(deleteAccount(client as never)).resolves.toEqual({ ok: false, message: 'invalid_token' })
  })
})

describe('resolveActiveAccount', () => {
  it('returns null with no accounts', () => {
    expect(resolveActiveAccount([], 'a')).toBeNull()
  })
  it('prefers the account matching profiles.current_puuid', () => {
    expect(resolveActiveAccount([a, b], 'b')).toBe(b)
  })
  it('falls back to the first (most recently used) when current_puuid is null or unknown', () => {
    expect(resolveActiveAccount([a, b], null)).toBe(a)
    expect(resolveActiveAccount([a, b], 'zzz')).toBe(a)
  })
})

describe('setActiveAccount', () => {
  it('bumps last_seen_at on the linked row and writes profiles.current_puuid', async () => {
    const calls: Array<{ table: string; values: Record<string, unknown>; filters: Array<[string, unknown]> }> = []
    const client = {
      from: (table: string) => {
        const call = { table, values: {} as Record<string, unknown>, filters: [] as Array<[string, unknown]> }
        // Mirrors PostgrestFilterBuilder: chainable and thenable.
        const chain = {
          update: (values: Record<string, unknown>) => {
            call.values = values
            calls.push(call)
            return chain
          },
          eq: (k: string, v: unknown) => {
            call.filters.push([k, v])
            return chain
          },
          then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
        }
        return chain
      },
    }
    await setActiveAccount(client as never, 'u1', 'b')
    const linked = calls.find((c) => c.table === 'linked_riot_accounts')
    const profiles = calls.find((c) => c.table === 'profiles')
    expect(linked?.values).toHaveProperty('last_seen_at')
    expect(linked?.filters).toEqual(expect.arrayContaining([['user_id', 'u1'], ['puuid', 'b']]))
    expect(profiles?.values).toEqual({ current_puuid: 'b' })
    expect(profiles?.filters).toEqual([['user_id', 'u1']])
  })
})
